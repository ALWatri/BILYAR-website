import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import PDFDocument from "pdfkit";
import type { IStorage } from "./storage";
import { getFirebaseStorageBucket } from "./firebase-init";
import { translateToEnglish } from "./translate";
import { addressToEnglish, toEnglishCity, toEnglishText } from "./invoice-locale";
import { generateInvoicePdf } from "./invoice-pdf";
import {
  verifyInvoiceToken,
  verifyAdminSession,
  verifyAdminSessionValue,
  getSignedInvoicePath,
  signInvoiceId,
  createAdminSession,
  checkAdminCredentials,
  getAdminSessionCookieName,
} from "./invoice-auth";
import { isWhatsAppConfigured, sendTemplate, sendText } from "./whatsapp";
import { z } from "zod";
import nodemailer from "nodemailer";

const UPLOADS_DIR = path.join(process.env.UPLOADS_DIR || process.cwd(), "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Memory storage so we can send buffers to Firebase Storage or write to disk
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

function safeExt(originalname: string): string {
  const ext = path.extname(originalname) || ".jpg";
  return ext.toLowerCase().match(/\.(jpe?g|png|gif|webp)$/) ? ext : ".jpg";
}

function uniqueFilename(ext: string): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
}

// Tap Payments: Test keys (sk_test_...) | Live keys (sk_live_...) when ready
const TAP_API_KEY = process.env.TAP_API_KEY || "";
// Sandbox: https://sandbox-api.deema.me or https://staging-api.deema.me. Live: https://api.deema.me
const DEEMA_BASE_URL = process.env.DEEMA_BASE_URL || "https://sandbox-api.deema.me";
const DEEMA_API_KEY = process.env.DEEMA_API_KEY || "";
const DEEMA_WEBHOOK_HEADER = process.env.DEEMA_WEBHOOK_HEADER || "x-webhook-secret";
const DEEMA_WEBHOOK_SECRET = process.env.DEEMA_WEBHOOK_SECRET ?? "bilyar-deema-webhook-2026";

const CONTACT_TO = process.env.CONTACT_TO || "info@bilyarofficial.com";
const CONTACT_FROM = process.env.CONTACT_FROM || process.env.SMTP_USER || "info@bilyarofficial.com";
const ADMIN_ORDER_EMAIL = "info@bilyarofficial.com";

function getBaseUrl(req: any): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

function createMailTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  storage: IStorage
): Promise<Server> {

  ensureUploadsDir();
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Public sample PDF for Twilio template media validation. Must return application/pdf.
  // Path under /api/ avoids SPA/static catch-all returning HTML.
  app.get("/api/sample-invoice.pdf", async (_req, res) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 48 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      doc.on("end", () => {
        const pdf = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.setHeader("Content-Disposition", `inline; filename="sample-invoice.pdf"`);
        res.send(pdf);
      });

      doc.fontSize(18).text("BILYAR - Sample Invoice", { align: "center" });
      doc.moveDown(1);
      doc.fontSize(12).text("This is a sample PDF used for WhatsApp template approval.", { align: "left" });
      doc.moveDown(0.5);
      doc.text("It is not a real customer invoice.");
      doc.moveDown(1);
      doc.text(`Generated at: ${new Date().toISOString()}`);
      doc.end();
    } catch (err) {
      console.error("sample-invoice.pdf error:", err);
      res.status(500).send("Failed to generate sample PDF");
    }
  });

  /** Generate obscure public PDF path: /uploads/invoices/{randomSlug}/OR-{orderNumber}.pdf */
  function generateObscureInvoicePath(orderNumber: string): { relativePath: string; publicUrl: string } {
    const slug = crypto.randomBytes(16).toString("base64url");
    const filename = `OR-${orderNumber}.pdf`;
    const relativePath = path.join("invoices", slug, filename);
    return { relativePath, publicUrl: `/uploads/invoices/${encodeURIComponent(slug)}/${encodeURIComponent(filename)}` };
  }

  /** On payment success: generate PDF, save to obscure path, store URL on order. Used for WhatsApp. */
  async function ensurePublicInvoicePdf(orderId: number, baseUrl: string): Promise<string | null> {
    try {
      const order = await storage.getOrder(orderId);
      if (!order) return null;
      const existing = (order as { invoicePublicUrl?: string | null }).invoicePublicUrl;
      if (existing && existing.startsWith("/uploads/")) return `${baseUrl.replace(/\/$/, "")}${existing}`;

      const settings = await storage.getSettings();
      const pdf = await generateInvoicePdf(order, settings);
      const { relativePath, publicUrl } = generateObscureInvoicePath(order.orderNumber);
      const dir = path.join(UPLOADS_DIR, path.dirname(relativePath));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(UPLOADS_DIR, relativePath), pdf);

      const fullUrl = `${baseUrl.replace(/\/$/, "")}${publicUrl}`;
      await storage.updateOrder(orderId, { invoicePublicUrl: fullUrl } as any);
      console.log(`Invoice public PDF saved: ${fullUrl}`);
      return fullUrl;
    } catch (err) {
      console.error("ensurePublicInvoicePdf error:", err);
      return null;
    }
  }

  function isAdminRequest(req: { headers: { cookie?: string; authorization?: string } }): boolean {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    return verifyAdminSession(req.headers.cookie) || verifyAdminSessionValue(bearer);
  }

  function requireAdmin(req: any, res: any, next: any) {
    if (!isAdminRequest(req)) {
      return res.status(401).json({ message: "Admin authentication required" });
    }
    return next();
  }

  app.post("/api/upload", requireAdmin, memoryUpload.array("images", 20), async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) {
      return res.status(400).json({ message: "No images uploaded" });
    }
    const bucket = getFirebaseStorageBucket();
    if (bucket) {
      try {
        const urls: string[] = [];
        for (const f of files) {
          const ext = safeExt(f.originalname);
          const name = `products/${uniqueFilename(ext)}`;
          const file = bucket.file(name);
          await file.save(f.buffer, {
            metadata: { contentType: f.mimetype || "image/jpeg" },
          });
          await file.makePublic();
          urls.push(`https://storage.googleapis.com/${bucket.name}/${name}`);
        }
        return res.json({ urls });
      } catch (err) {
        console.error("Firebase Storage upload failed (bucket missing or no billing?); using disk.", err);
      }
    }
    // Fallback: write to disk (always works; used when no bucket or Storage upload failed)
    const urls: string[] = [];
    for (const f of files) {
      const ext = safeExt(f.originalname);
      const filename = uniqueFilename(ext);
      const filepath = path.join(UPLOADS_DIR, filename);
      fs.writeFileSync(filepath, f.buffer);
      urls.push(`/uploads/${filename}`);
    }
    res.json({ urls });
  });

  app.get("/api/products", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const products = await storage.getProducts(q);
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });
    const product = await storage.getProduct(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  // ===== CONTACT FORM =====
  const contactSchema = z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email().max(254),
    message: z.string().min(1).max(5000),
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const data = contactSchema.parse(req.body);
      const transport = createMailTransport();
      if (!transport) {
        return res.status(503).json({
          message: "Email service is not configured",
        });
      }

      const subject = `New contact form message — ${data.firstName} ${data.lastName}`;
      const text =
        `Name: ${data.firstName} ${data.lastName}\n` +
        `Email: ${data.email}\n` +
        `Sent from: ${getBaseUrl(req)}\n\n` +
        `${data.message}\n`;

      await transport.sendMail({
        from: CONTACT_FROM,
        to: CONTACT_TO,
        replyTo: data.email,
        subject,
        text,
      });

      return res.json({ sent: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Contact form error:", error);
      return res.status(500).json({ message: "Failed to send message" });
    }
  });

  /** Send order details to admin email for each new paid order. Fire-and-forget. */
  async function sendAdminOrderNotification(orderId: number): Promise<void> {
    try {
      const order = await storage.getOrder(orderId);
      if (!order || !order.items?.length) return;
      const transport = createMailTransport();
      if (!transport) {
        console.warn("Admin order email: SMTP not configured, skipping");
        return;
      }
      const items = order.items
        .map((i: { productName: string; price: number; quantity: number; size?: string }) =>
          `  - ${i.productName} (${i.size || "—"}) x${i.quantity} @ ${i.price.toFixed(3)} KWD`
        )
        .join("\n");
      const text =
        `New paid order: ${order.orderNumber}\n\n` +
        `Customer: ${order.customerName}\n` +
        `Email: ${order.customerEmail}\n` +
        `Phone: ${order.customerPhone}\n` +
        `Address: ${order.customerAddress}\n` +
        `${order.customerCity}, ${order.customerCountry}\n\n` +
        `Items:\n${items}\n\n` +
        `Subtotal+Shipping: ${order.total.toFixed(3)} KWD\n` +
        `Payment: ${(order as { paymentMethod?: string }).paymentMethod || "—"}\n`;
      await transport.sendMail({
        from: CONTACT_FROM,
        to: ADMIN_ORDER_EMAIL,
        subject: `[BILYAR] New paid order: ${order.orderNumber}`,
        text,
      });
      console.log(`Admin order email sent for ${order.orderNumber}`);
    } catch (err) {
      console.error("Admin order email error:", err);
    }
  }

  const insertProductSchema = z.object({
    name: z.string().min(1),
    nameAr: z.string().min(1),
    description: z.string().min(1),
    descriptionAr: z.string().min(1),
    price: z.number().positive(),
    category: z.string().min(1),
    categoryAr: z.string().min(1),
    images: z.array(z.string()).min(1),
    isNew: z.boolean().optional().default(false),
    hasShirt: z.boolean().optional().default(false),
    hasTrouser: z.boolean().optional().default(false),
    hasDress: z.boolean().optional().default(false),
    topSoldSeparately: z.boolean().optional().default(false),
    topPrice: z.number().positive().optional().nullable(),
    category2: z.string().optional().nullable(),
    categoryAr2: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    stockBySize: z.record(z.string(), z.number()).optional().nullable(),
    outOfStock: z.boolean().optional().default(false),
  });

  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const data = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(data);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/products/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });
    try {
      const data = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, data);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });
    const deleted = await storage.deleteProduct(id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.status(204).send();
  });

  // ===== CATEGORIES =====
  const insertCategorySchema = z.object({
    name: z.string().min(1),
    nameAr: z.string().min(1),
    isActive: z.boolean().optional().default(true),
  });

  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.post("/api/categories", requireAdmin, async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const created = await storage.createCategory(data);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/categories/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid category ID" });
    try {
      const data = insertCategorySchema.partial().parse(req.body);
      const updated = await storage.updateCategory(id, data);
      if (!updated) return res.status(404).json({ message: "Category not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/categories/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid category ID" });
    const deleted = await storage.deleteCategory(id);
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    res.status(204).send();
  });

  // ===== COLLECTIONS =====
  const insertCollectionSchema = z.object({
    title: z.string().min(1),
    titleAr: z.string().min(1),
    description: z.string().optional().default(""),
    descriptionAr: z.string().optional().default(""),
    image: z.string().optional().default(""),
    isActive: z.boolean().optional().default(true),
  });

  app.get("/api/collections", async (_req, res) => {
    const collections = await storage.getCollections();
    res.json(collections);
  });

  app.post("/api/collections", requireAdmin, async (req, res) => {
    try {
      const data = insertCollectionSchema.parse(req.body);
      const created = await storage.createCollection(data);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/collections/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid collection ID" });
    try {
      const data = insertCollectionSchema.partial().parse(req.body);
      const updated = await storage.updateCollection(id, data);
      if (!updated) return res.status(404).json({ message: "Collection not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/collections/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid collection ID" });
    const deleted = await storage.deleteCollection(id);
    if (!deleted) return res.status(404).json({ message: "Collection not found" });
    res.status(204).send();
  });

  app.get("/api/orders", requireAdmin, async (_req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get("/api/orders/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  const serveInvoicePdf = async (req: any, res: any) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const token = typeof req.query.t === "string" ? req.query.t : undefined;
    const hasValidToken = verifyInvoiceToken(id, token);
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    const hasAdminSession = verifyAdminSession(req.headers.cookie) || verifyAdminSessionValue(bearer);
    if (!hasValidToken && !hasAdminSession) {
      return res.status(403).json({ message: "Invalid or missing invoice access token" });
    }
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const download = req.query.dl === "1" || req.query.download === "1";
    try {
      const settings = await storage.getSettings();
      const pdf = await generateInvoicePdf(order, settings);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        download ? `attachment; filename="invoice-${order.orderNumber}.pdf"` : `inline; filename="invoice-${order.orderNumber}.pdf"`
      );
      res.send(pdf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error("Invoice PDF error:", msg, stack || "");
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  };

  app.get("/api/orders/:id/invoice.pdf", serveInvoicePdf);
  app.get("/api/orders/:id/invoice-pdf", serveInvoicePdf);

  const cookieName = getAdminSessionCookieName();
  const isProduction = process.env.NODE_ENV === "production";

  app.post("/api/admin/login", express.json(), (req, res) => {
    const body = req.body as { email?: string; password?: string };
    const email = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!checkAdminCredentials(email, password)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const session = createAdminSession();
    res.cookie(cookieName, session, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    return res.json({ ok: true, token: session });
  });

  app.post("/api/admin/logout", (_req, res) => {
    res.clearCookie(cookieName, { path: "/" });
    return res.json({ ok: true });
  });

  app.get("/api/admin/orders/:id/invoice-pdf", async (req, res) => {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
    const hasAdminSession = verifyAdminSession(req.headers.cookie) || verifyAdminSessionValue(bearer);
    if (!hasAdminSession) {
      return res.status(403).json({ message: "Invalid or missing invoice access token" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const download = req.query.dl === "1" || req.query.download === "1";
    try {
      const settings = await storage.getSettings();
      const pdf = await generateInvoicePdf(order, settings);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        download ? `attachment; filename="invoice-${order.orderNumber}.pdf"` : `inline; filename="invoice-${order.orderNumber}.pdf"`
      );
      res.send(pdf);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Invoice PDF error:", msg);
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  app.get("/api/orders/:id/invoice-pdf-url", (req, res) => {
    const hasAdminSession = verifyAdminSession(req.headers.cookie) || verifyAdminSessionValue(req.headers.authorization?.replace(/^Bearer\s+/i, "").trim());
    if (!hasAdminSession) {
      return res.status(403).json({ message: "Invalid or missing invoice access token" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const baseUrl = getBaseUrl(req).replace(/\/$/, "");
    const download = req.query.dl === "1" || req.query.download === "1";
    const path = getSignedInvoicePath(id, baseUrl, download);
    return res.json({ url: `${baseUrl}${path}` });
  });

  const createOrderSchema = z.object({
    customer: z.object({
      name: z.string().min(1),
      email: z.string().optional().default(""),
      phone: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      country: z.string().min(1),
    }),
    items: z.array(z.object({
      productId: z.number(),
      productName: z.string(),
      quantity: z.number().min(1),
      price: z.number(),
      image: z.string(),
      variant: z.enum(["set", "top"]).optional(),
      size: z.string().optional(),
      measurements: z.record(z.string()).optional(),
      notes: z.string().optional(),
    })).min(1),
    paymentMethod: z.enum(["tap", "deema", "manual"]).optional().default("tap"),
    discountCode: z.string().optional(),
  });

  function requiredMeasurementKeysForProduct(
    p: any,
    variant: "set" | "top" | undefined,
  ): string[] {
    const keys: string[] = [];
    if (p?.hasDress) {
      keys.push("dressLength", "dressShoulder", "dressHip", "dressChest", "dressSleeve");
    }
    if (p?.hasShirt) {
      keys.push("shirtLength", "shirtShoulder", "shirtSleeve", "shirtArmhole", "shirtChest");
    }
    const includeTrouser = !!p?.hasTrouser && !(p?.topSoldSeparately && variant === "top");
    if (includeTrouser) {
      keys.push("trouserWaist", "trouserHip", "trouserThigh", "trouserKnee", "trouserLeg", "trouserLength");
    }
    return keys;
  }

  function hasAnyMeasurementValue(m: unknown): boolean {
    if (!m || typeof m !== "object") return false;
    for (const v of Object.values(m as Record<string, unknown>)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return true;
      if (typeof v === "string" && v.trim() !== "") return true;
    }
    return false;
  }

  function hasValidMeasurements(m: unknown, keys: string[]): boolean {
    if (!m || typeof m !== "object") return false;
    const rec = m as Record<string, unknown>;
    return keys.every((k) => {
      const v = rec[k];
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    });
  }

  async function validateDiscount(code: string | undefined, subtotalBeforeShipping: number): Promise<{ discountAmount: number; discountId: number; discountCode: string } | null> {
    if (!code || !code.trim()) return null;
    const discount = await storage.getDiscountByCode(code);
    if (!discount || !discount.isActive) return null;
    const minOrder = discount.minOrderAmount ?? 0;
    if (subtotalBeforeShipping < minOrder) return null;
    if (discount.maxUses != null && (discount.usedCount ?? 0) >= discount.maxUses) return null;
    const now = new Date().toISOString().slice(0, 10);
    if (discount.validFrom && now < discount.validFrom) return null;
    if (discount.validUntil && now > discount.validUntil) return null;
    let amount = 0;
    if (discount.type === "percentage") {
      amount = Math.round((subtotalBeforeShipping * Math.min(100, Math.max(0, discount.value)) / 100) * 1000) / 1000;
    } else {
      amount = Math.min(subtotalBeforeShipping, Math.max(0, discount.value));
    }
    if (amount <= 0) return null;
    return { discountAmount: amount, discountId: discount.id, discountCode: discount.code };
  }

  app.post("/api/orders", async (req, res) => {
    try {
      const data = createOrderSchema.parse(req.body);
      // Validate products server-side (prevents ordering out-of-stock items and price tampering)
      const productsById = new Map<number, Awaited<ReturnType<typeof storage.getProduct>>>();
      for (const item of data.items) {
        const p = await storage.getProduct(item.productId);
        if (!p) {
          return res.status(400).json({ message: `Product not found: ${item.productId}` });
        }
        if ((p as any).outOfStock) {
          return res.status(400).json({ message: `Product is out of stock: ${p.name}` });
        }
        // Enforce "either ready size OR custom measurements" for customizable products.
        const stock = (p as any).stockBySize as Record<string, number> | null | undefined;
        const sizesWithStock = stock && typeof stock === "object"
          ? Object.entries(stock).filter(([, q]) => Number(q) > 0)
          : [];
        const hasReadyOption = sizesWithStock.length > 0;
        const variant = (item as any).variant as ("set" | "top" | undefined);
        const requiredKeys = requiredMeasurementKeysForProduct(p, variant);
        const hasCustomOption = requiredKeys.length > 0;

        const size = (item.size || "").trim();
        const isReadySelected =
          hasReadyOption &&
          size !== "" &&
          Object.prototype.hasOwnProperty.call(stock as any, size) &&
          Number((stock as any)[size]) >= item.quantity;

        const anyMeasurements = hasAnyMeasurementValue(item.measurements);
        const validMeasurements = hasValidMeasurements(item.measurements, requiredKeys);

        if (
          hasReadyOption &&
          !anyMeasurements &&
          size !== "" &&
          Object.prototype.hasOwnProperty.call(stock as any, size) &&
          Number((stock as any)[size]) < item.quantity
        ) {
          return res.status(400).json({ message: `Selected size is not available for: ${p.name}` });
        }

        if (isReadySelected && anyMeasurements) {
          return res.status(400).json({ message: `Please choose either a size OR custom measurements for: ${p.name}` });
        }

        if (hasCustomOption) {
          if (!hasReadyOption) {
            if (!validMeasurements) {
              return res.status(400).json({ message: `Custom measurements are required for: ${p.name}` });
            }
          } else {
            // Both options exist — require one of them.
            if (!isReadySelected && !validMeasurements) {
              return res.status(400).json({ message: `Please select a size or enter custom measurements for: ${p.name}` });
            }
          }
        } else if (hasReadyOption) {
          // Ready-only product: if a size is provided, ensure it's available.
          if (size && (!Object.prototype.hasOwnProperty.call(stock as any, size) || Number((stock as any)[size]) < item.quantity)) {
            return res.status(400).json({ message: `Selected size is not available for: ${p.name}` });
          }
        }

        productsById.set(item.productId, p);
      }

      const subtotal = data.items.reduce((acc, item) => {
        const p = productsById.get(item.productId)!;
        const v = (item as any).variant as ("set" | "top" | undefined);
        const topPrice = (p as any).topPrice as number | null | undefined;
        const price = v === "top" && typeof topPrice === "number" ? topPrice : p.price;
        return acc + price * item.quantity;
      }, 0);
      const itemCount = data.items.reduce((acc, item) => acc + item.quantity, 0);
      const cityRaw = (data.customer.city || "").toString().trim();
      const cityNormEn = cityRaw.toLowerCase().replace(/\s+/g, " ").trim();
      const cityNormAr = cityRaw.replace(/\s+/g, " ").trim();

      const expensiveAreasAr = new Set([
        "المطلاع",
        "صباح الأحمد",
        "جنوب صباح الأحمد",
        "الخيران",
        "أم الهيمان",
      ]);
      const expensiveAreasEn = new Set([
        "al-mutlaa",
        "mutlaa",
        "al mutlaa",
        "sabah al ahmad",
        "south sabah al ahmad",
        "khiran",
        "al khiran",
        "umm al hayman",
        "um al hayman",
      ]);

      const isExpensiveArea =
        expensiveAreasAr.has(cityNormAr) ||
        expensiveAreasEn.has(cityNormEn) ||
        expensiveAreasEn.has(cityNormEn.replace(/-/g, " "));

      // Shipping rules:
      // - Free delivery when buying 2+ items
      // - Otherwise: 3 KWD
      // - Exceptions (specific areas): 5 KWD
      const shippingCost = itemCount >= 2 ? 0 : (isExpensiveArea ? 5 : 3);
      const discountResult = await validateDiscount(data.discountCode, subtotal);
      const discountAmount = discountResult?.discountAmount ?? 0;
      const total = Math.max(0, subtotal + shippingCost - discountAmount);
      const isManual = data.paymentMethod === "manual";

      // Keep customer name as-is (no translation). Use structured address conversion for reliable display.
      const customerNameEn = data.customer.name;
      const customerAddressEn = addressToEnglish(data.customer.address);
      const customerCityEn = toEnglishCity(data.customer.city);
      const customerCountryEn = toEnglishText(data.customer.country, "Kuwait");

      const itemsWithNotesEn = await Promise.all(
        data.items.map(async (item) => {
          const notesEn = !isManual && item.notes ? await translateToEnglish(item.notes) : null;
          const p = productsById.get(item.productId)!;
          const v = (item as any).variant as ("set" | "top" | undefined);
          const topPrice = (p as any).topPrice as number | null | undefined;
          const price = v === "top" && typeof topPrice === "number" ? topPrice : p.price;
          return {
            orderId: 0,
            productId: item.productId,
            productName: item.productName || p.name,
            quantity: item.quantity,
            price,
            image: p.images?.[0] || item.image,
            variant: v ?? null,
            size: item.size || null,
            measurements: item.measurements || null,
            notes: item.notes || null,
            notesEn: notesEn && notesEn !== (item.notes || "") ? notesEn : null,
          };
        })
      );

      const order = await storage.createOrder(
        {
          customerName: data.customer.name,
          customerEmail: data.customer.email,
          customerPhone: data.customer.phone,
          customerAddress: data.customer.address,
          customerCity: data.customer.city,
          customerCountry: data.customer.country,
          customerNameEn,
          customerAddressEn,
          customerCityEn,
          customerCountryEn,
          status: "Pending",
          paymentMethod: data.paymentMethod ?? "tap",
          paymentStatus: isManual ? "manual" : "pending",
          inventoryAdjusted: false,
          total,
          shippingCost,
          discountCode: discountResult?.discountCode ?? null,
          discountAmount: discountAmount > 0 ? discountAmount : null,
        } as any,
        itemsWithNotesEn
      );

      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  async function applyDiscountUsageIfAny(orderId: number) {
    const order = await storage.getOrder(orderId);
    if (!order?.discountCode) return;
    const discount = await storage.getDiscountByCode(order.discountCode);
    if (discount) await storage.incrementDiscountUsage(discount.id);
  }

  async function adjustInventoryForOrder(orderId: number, direction: 1 | -1) {
    const order = await storage.getOrder(orderId);
    if (!order) return;
    for (const item of order.items || []) {
      const size = (item.size || "").trim();
      if (!size) continue; // custom orders don't touch stockBySize
      const product = await storage.getProduct(item.productId);
      if (!product) continue;
      const stock = (product as any).stockBySize as Record<string, number> | null | undefined;
      if (!stock || typeof stock !== "object") continue;
      if (!Object.prototype.hasOwnProperty.call(stock, size)) continue;
      const current = Number((stock as any)[size]) ?? 0;
      const delta = direction * (item.quantity ?? 1);
      const next = Math.max(0, current + delta);
      if (next === current) continue;
      await storage.updateProduct(item.productId, { stockBySize: { ...stock, [size]: next } });
    }
  }

  /** Confirm zero-amount order (100% discount / free item). Skips payment gateway, marks as Paid. */
  app.post("/api/orders/:id/confirm-zero", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
      const order = await storage.getOrder(id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      if (order.status !== "Pending") return res.status(400).json({ message: "Order already processed" });
      if (order.total > 0.001) return res.status(400).json({ message: "Order total must be zero to confirm without payment" });

      await storage.updateOrderPayment(id, "zero-amount", "paid");
      await storage.updateOrderStatus(id, "Paid");
      const existing = order;
      if (!(existing as any).inventoryAdjusted) {
        await adjustInventoryForOrder(id, -1);
        await storage.updateOrder(id, { inventoryAdjusted: true } as any);
      }
      await applyDiscountUsageIfAny(id);
      sendAdminOrderNotification(id).catch((err) => console.error("Admin order email:", err));
      res.json({ confirmed: true, invoiceToken: signInvoiceId(id) });
    } catch (error: any) {
      console.error("Confirm zero error:", error);
      res.status(500).json({ message: error.message || "Failed to confirm order" });
    }
  });

  app.delete("/api/orders/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const deleted = await storage.deleteOrder(id);
    if (!deleted) return res.status(404).json({ message: "Order not found" });
    res.status(204).send();
  });

  app.patch("/api/orders/:id/status", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const { status } = req.body;
    if (!["Pending", "Paid", "Processing", "Shipped", "Delivered", "Unfinished", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    // If a paid order gets cancelled, restore inventory.
    if (status === "Cancelled") {
      const existing = await storage.getOrder(id);
      if (existing && (existing as any).inventoryAdjusted) {
        await adjustInventoryForOrder(id, +1);
        await storage.updateOrder(id, { inventoryAdjusted: false } as any);
      }
    }
    const updated = await storage.updateOrderStatus(id, status);
    if (!updated) return res.status(404).json({ message: "Order not found" });
    if (status === "Shipped") sendOrderShippedWhatsApp(id).catch((err) => console.error("WhatsApp order_shipped:", err));
    res.json(updated);
  });

  const updateOrderSchema = z.object({
    customer: z.object({
      name: z.string().min(1).optional(),
      email: z.string().optional(),
      phone: z.string().min(1).optional(),
      address: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      country: z.string().min(1).optional(),
    }).optional(),
    status: z.enum(["Pending", "Paid", "Processing", "Shipped", "Delivered", "Unfinished", "Cancelled"]).optional(),
    items: z.array(z.object({
      productId: z.number(),
      productName: z.string(),
      quantity: z.number().min(1),
      price: z.number(),
      image: z.string(),
      variant: z.enum(["set", "top"]).optional().nullable(),
      size: z.string().optional().nullable(),
      measurements: z.record(z.string()).optional().nullable(),
      notes: z.string().optional().nullable(),
      notesEn: z.string().optional().nullable(),
    })).optional(),
  });

  app.patch("/api/orders/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    try {
      const data = updateOrderSchema.parse(req.body);
      const existing = await storage.getOrder(id);
      if (!existing) return res.status(404).json({ message: "Order not found" });

      const orderData: Record<string, unknown> = {};
      if (data.customer) {
        if (data.customer.name != null) {
          orderData.customerName = data.customer.name;
          orderData.customerNameEn = data.customer.name;
        }
        if (data.customer.email != null) orderData.customerEmail = data.customer.email;
        if (data.customer.phone != null) orderData.customerPhone = data.customer.phone;
        if (data.customer.address != null) {
          orderData.customerAddress = data.customer.address;
          orderData.customerAddressEn = addressToEnglish(data.customer.address);
        }
        if (data.customer.city != null) {
          orderData.customerCity = data.customer.city;
          orderData.customerCityEn = toEnglishCity(data.customer.city);
        }
        if (data.customer.country != null) {
          orderData.customerCountry = data.customer.country;
          orderData.customerCountryEn = toEnglishText(data.customer.country, "Kuwait");
        }
      }
      if (data.status != null) orderData.status = data.status;

      let itemsData: { productId: number; productName: string; quantity: number; price: number; image: string; size?: string | null; measurements?: Record<string, string> | null; notes?: string | null; notesEn?: string | null }[] | undefined;
      if (data.items && data.items.length > 0) {
        const subtotal = data.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
        const s = await storage.getSettings();
        const defaultCost = s?.defaultShippingCost ?? 3;
        const itemCount = data.items.reduce((acc, i) => acc + i.quantity, 0);
        const shippingCost = itemCount >= 2 ? 0 : defaultCost;
        const total = subtotal + shippingCost;
        orderData.shippingCost = shippingCost;
        orderData.total = total;
        itemsData = data.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
          size: i.size ?? null,
          measurements: i.measurements ?? null,
          notes: i.notes ?? null,
          notesEn: i.notesEn ?? null,
        }));
      }

      const updated = await storage.updateOrder(id, orderData as any, itemsData);
      if (!updated) return res.status(404).json({ message: "Order not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  // ===== CUSTOMERS (derived from orders) =====
  function getCustomerKey(order: { customerEmail?: string | null; customerPhone?: string; customerName?: string }) {
    const email = (order.customerEmail || "").trim().toLowerCase();
    const phone = (order.customerPhone || "").trim();
    const name = (order.customerName || "").trim();
    return email ? email : `${phone}|${name}`;
  }

  function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "").slice(-8);
  }

  app.get("/api/customers/by-phone", async (req, res) => {
    const phone = (req.query.phone || "").toString().trim();
    const digits = normalizePhone(phone);
    if (digits.length < 8) return res.status(400).json({ message: "Phone number required (8 digits)" });
    const orders = await storage.getOrders();
    const match = orders.find((o) => normalizePhone(o.customerPhone) === digits);
    if (!match) return res.status(404).json({ message: "Customer not found" });
    res.json({
      name: match.customerName,
      email: match.customerEmail || "",
      address: match.customerAddress,
      city: match.customerCity,
      country: match.customerCountry || "Kuwait",
    });
  });

  app.get("/api/customers", requireAdmin, async (_req, res) => {
    const orders = await storage.getOrders();
    const PAID_STATUSES = ["Paid", "Processing", "Shipped", "Delivered"];
    const isPaid = (o: { status?: string }) => PAID_STATUSES.includes(o.status || "");

    const customerMap = new Map<string, {
      id: string;
      email: string;
      name: string;
      phone: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: string;
      orders: typeof orders;
    }>();

    for (const order of orders) {
      const key = getCustomerKey(order);
      const paid = isPaid(order);
      const existing = customerMap.get(key);
      if (existing) {
        if (paid) {
          existing.totalOrders += 1;
          existing.totalSpent += order.total;
          if (order.createdAt > existing.lastOrderDate) {
            existing.lastOrderDate = order.createdAt;
            existing.name = order.customerName;
            existing.phone = order.customerPhone;
          }
        }
        existing.orders.push(order);
      } else {
        customerMap.set(key, {
          id: key,
          email: order.customerEmail,
          name: order.customerName,
          phone: order.customerPhone,
          totalOrders: paid ? 1 : 0,
          totalSpent: paid ? order.total : 0,
          lastOrderDate: paid ? order.createdAt : "",
          orders: [order],
        });
      }
    }

    const customers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);
    res.json(customers);
  });

  const updateCustomerSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
  });

  app.patch("/api/customers", requireAdmin, async (req, res) => {
    try {
      const { id, name, phone } = updateCustomerSchema.parse(req.body);
      const orders = await storage.getOrders();
      const toUpdate = orders.filter((o) => getCustomerKey(o) === id);
      if (toUpdate.length === 0) return res.status(404).json({ message: "Customer not found" });
      for (const order of toUpdate) {
        const data: Record<string, string> = {};
        if (name != null) data.customerName = data.customerNameEn = name;
        if (phone != null) data.customerPhone = phone;
        if (Object.keys(data).length > 0) await storage.updateOrder(order.id, data);
      }
      res.json({ updated: toUpdate.length });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Validation error", errors: error.errors });
      throw error;
    }
  });

  app.delete("/api/customers", requireAdmin, async (req, res) => {
    const id = typeof req.body?.id === "string" ? req.body.id : typeof req.query?.id === "string" ? req.query.id : undefined;
    if (!id) return res.status(400).json({ message: "Customer id required" });
    const orders = await storage.getOrders();
    const toDelete = orders.filter((o) => getCustomerKey(o) === id);
    if (toDelete.length === 0) return res.status(404).json({ message: "Customer not found" });
    for (const order of toDelete) await storage.deleteOrder(order.id);
    res.json({ deleted: toDelete.length });
  });

  // ===== SETTINGS =====
  app.get("/api/settings", async (_req, res) => {
    const s = await storage.getSettings();
    if (!s) {
      return res.json({
        storeName: "BILYAR",
        storeEmail: "info@bilyar.com",
        storePhone: "+965 1234 5678",
        currency: "KWD",
        freeShippingThreshold: 90,
        defaultShippingCost: 5,
      });
    }
    res.json(s);
  });

  const updateSettingsSchema = z.object({
    storeName: z.string().min(1).optional(),
    storeEmail: z.string().optional(),
    storePhone: z.string().optional(),
    currency: z.string().optional(),
    freeShippingThreshold: z.number().min(0).optional(),
    defaultShippingCost: z.number().min(0).optional(),
  });

  app.patch("/api/settings", requireAdmin, async (req, res) => {
    try {
      const data = updateSettingsSchema.parse(req.body);
      const s = await storage.updateSettings(data);
      res.json(s);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  // ===== DISCOUNTS =====
  app.post("/api/discounts/validate", express.json(), async (req, res) => {
    try {
      const { code, subtotal } = req.body;
      const sub = typeof subtotal === "number" ? subtotal : parseFloat(subtotal);
      if (!Number.isFinite(sub) || sub < 0) {
        return res.status(400).json({ valid: false, message: "Invalid subtotal" });
      }
      const result = await validateDiscount(typeof code === "string" ? code : undefined, sub);
      if (!result) {
        return res.json({ valid: false, message: "Invalid or expired discount code" });
      }
      return res.json({
        valid: true,
        discountAmount: result.discountAmount,
        discountCode: result.discountCode,
      });
    } catch (err) {
      console.error("Discount validate error:", err);
      return res.status(500).json({ valid: false, message: "Validation failed" });
    }
  });

  const insertDiscountSchema = z.object({
    code: z.string().min(1),
    type: z.enum(["percentage", "amount"]),
    value: z.number().min(0),
    minOrderAmount: z.number().min(0).optional().nullable(),
    maxUses: z.number().int().min(0).optional().nullable(),
    validFrom: z.string().optional().nullable(),
    validUntil: z.string().optional().nullable(),
    isActive: z.boolean().optional().default(true),
  });

  app.get("/api/discounts", requireAdmin, async (_req, res) => {
    const list = await storage.getDiscounts();
    res.json(list);
  });

  app.post("/api/discounts", requireAdmin, async (req, res) => {
    try {
      const data = insertDiscountSchema.parse(req.body);
      const existing = await storage.getDiscountByCode(data.code);
      if (existing) {
        return res.status(400).json({ message: "A discount with this code already exists" });
      }
      const created = await storage.createDiscount(data);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/discounts/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid discount ID" });
    try {
      const data = insertDiscountSchema.partial().parse(req.body);
      const updated = await storage.updateDiscount(id, data);
      if (!updated) return res.status(404).json({ message: "Discount not found" });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/discounts/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid discount ID" });
    const deleted = await storage.deleteDiscount(id);
    if (!deleted) return res.status(404).json({ message: "Discount not found" });
    res.status(204).send();
  });

  // ===== WHATSAPP (Twilio) =====
  const SITE_URL = process.env.SITE_URL || "";
  const TWILIO_CONTENT_ORDER_RECEIVED = process.env.TWILIO_CONTENT_ORDER_RECEIVED || "";
  const TWILIO_CONTENT_ORDER_SHIPPED = process.env.TWILIO_CONTENT_ORDER_SHIPPED || "";
  const TWILIO_CONTENT_MARKETING = process.env.TWILIO_CONTENT_MARKETING || "";

  async function sendOrderReceivedWhatsApp(orderId: number, baseUrl: string) {
    if (!isWhatsAppConfigured()) {
      console.warn("WhatsApp skip: not configured (TWILIO_ACCOUNT_SID/AUTH_TOKEN missing)");
      return;
    }
    if (!TWILIO_CONTENT_ORDER_RECEIVED) {
      console.warn("WhatsApp skip: TWILIO_CONTENT_ORDER_RECEIVED not set");
      return;
    }
    const order = await storage.getOrder(orderId);
    if (!order || !order.customerPhone) {
      console.warn("WhatsApp skip: order not found or no customerPhone", { orderId, hasOrder: !!order });
      return;
    }
    const name = order.customerName || (order as any).customerNameEn || "";
    const firstName = name.split(" ")[0] || name;
    const publicBase = (SITE_URL || baseUrl).replace(/\/$/, "");
    const isPublicUrl = publicBase.startsWith("https://");

    if (!isPublicUrl) {
      console.warn("WhatsApp skip: SITE_URL not set or not https; need public URL for invoice PDF in template");
      return;
    }

    // Build invoice PDF URL for template variable {{3}}. Template expects: {{1}}=name, {{2}}=orderNumber, {{3}}=media URL.
    const invoiceCandidates: string[] = [];
    const storedPublicUrl = (order as { invoicePublicUrl?: string | null }).invoicePublicUrl;
    if (storedPublicUrl) invoiceCandidates.push(storedPublicUrl);
    try {
      const settings = await storage.getSettings();
      const pdf = await generateInvoicePdf(order, settings);
      console.log("WhatsApp: invoice PDF size bytes", pdf.length);
      if (pdf.length > 15 * 1024 * 1024) {
        console.warn("WhatsApp: invoice PDF may exceed WhatsApp media size limits", { bytes: pdf.length });
      }
      const invoicesDir = path.join(UPLOADS_DIR, "invoices");
      if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });
      const filename = `invoice-${order.orderNumber}-${Date.now()}.pdf`;
      fs.writeFileSync(path.join(invoicesDir, filename), pdf);
      invoiceCandidates.push(`${publicBase}/uploads/invoices/${encodeURIComponent(filename)}`);

      const bucket = getFirebaseStorageBucket();
      if (bucket) {
        const objectName = `invoices/invoice-${order.orderNumber}-${Date.now()}.pdf`;
        const file = bucket.file(objectName);
        await file.save(pdf, { metadata: { contentType: "application/pdf" } });
        try {
          await file.makePublic();
          invoiceCandidates.push(`https://storage.googleapis.com/${bucket.name}/${objectName}`);
        } catch (publicErr) {
          console.warn("WhatsApp: makePublic failed, using signed GCS URL", publicErr);
          const [signedUrl] = await file.getSignedUrl({
            version: "v4",
            action: "read",
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
          });
          invoiceCandidates.push(signedUrl);
        }
      }
    } catch (err) {
      console.warn("WhatsApp: pre-generated invoice file failed:", err);
    }
    invoiceCandidates.push(`${publicBase}${getSignedInvoicePath(orderId, publicBase, true)}`);

    // Pick first reachable URL for Twilio to fetch the PDF.
    let invoiceUrl = "";
    for (const candidate of invoiceCandidates) {
      try {
        const check = await fetch(candidate, { method: "GET" });
        if (check.ok) {
          invoiceUrl = candidate;
          break;
        }
        console.warn("WhatsApp: invoice candidate not reachable", { candidate, status: check.status });
      } catch (checkErr) {
        console.warn("WhatsApp: invoice candidate fetch failed", { candidate, error: String(checkErr) });
      }
    }
    if (!invoiceUrl) invoiceUrl = invoiceCandidates[0] || "";

    if (!invoiceUrl) {
      console.error("WhatsApp: no invoice URL available for template");
      return;
    }

    console.log(`WhatsApp: sending order_received (message + invoice) to ${order.customerPhone}`);
    const templateRes = await sendTemplate(
      order.customerPhone,
      TWILIO_CONTENT_ORDER_RECEIVED,
      { "1": firstName, "2": order.orderNumber, "3": invoiceUrl }
    );
    if (!templateRes.ok) {
      console.error("WhatsApp order_received template failed:", templateRes.error, "- template expects {{1}}=name, {{2}}=orderNumber, {{3}}=invoice PDF URL");
      return;
    }
    console.log(`WhatsApp: Order ${order.orderNumber} confirmation + invoice sent to ${order.customerPhone}`);
  }

  async function sendOrderShippedWhatsApp(orderId: number) {
    if (!isWhatsAppConfigured() || !TWILIO_CONTENT_ORDER_SHIPPED) return;
    const order = await storage.getOrder(orderId);
    if (!order || !order.customerPhone) return;
    const name = order.customerName || (order as any).customerNameEn || "";
    const firstName = name.split(" ")[0] || name;
    await sendTemplate(
      order.customerPhone,
      TWILIO_CONTENT_ORDER_SHIPPED,
      { "1": firstName, "2": order.orderNumber }
    );
  }

  app.get("/api/whatsapp/status", (_req, res) => {
    res.json({
      configured: isWhatsAppConfigured(),
      contentSids: {
        orderReceived: TWILIO_CONTENT_ORDER_RECEIVED || "(not set)",
        orderShipped: TWILIO_CONTENT_ORDER_SHIPPED || "(not set)",
        marketing: TWILIO_CONTENT_MARKETING || "(not set)",
      },
    });
  });

  app.post("/api/whatsapp/send-marketing", requireAdmin, async (req, res) => {
    if (!isWhatsAppConfigured()) return res.status(503).json({ message: "WhatsApp not configured" });
    if (!TWILIO_CONTENT_MARKETING) return res.status(503).json({ message: "TWILIO_CONTENT_MARKETING not set" });
    const schema = z.object({ phones: z.array(z.string()).min(1), message: z.string().min(1) });
    try {
      const { phones, message } = schema.parse(req.body);
      const results: { phone: string; ok: boolean; error?: string }[] = [];
      for (const phone of phones) {
        const r = await sendTemplate(phone, TWILIO_CONTENT_MARKETING, { "1": message });
        results.push({ phone, ok: r.ok, error: r.error });
      }
      res.json({ results });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      throw e;
    }
  });

  async function resolveOrderId(input: string | number | undefined): Promise<number | null> {
    if (input == null || input === "") return null;
    const str = String(input).trim().toUpperCase();
    if (str.startsWith("ORD-")) {
      const orders = await storage.getOrders();
      const found = orders.find(o => o.orderNumber.toUpperCase() === str || o.orderNumber.toUpperCase().startsWith(str));
      return found ? found.id : null;
    }
    const id = parseInt(str, 10);
    return isNaN(id) ? null : id;
  }

  app.post("/api/whatsapp/send-order-received", requireAdmin, async (req, res) => {
    if (!isWhatsAppConfigured()) return res.status(503).json({ message: "WhatsApp not configured" });
    const id = await resolveOrderId(req.body?.orderId);
    if (id == null) return res.status(400).json({ message: "orderId or order number (e.g. ORD-XXX) required" });
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    const baseUrl = (SITE_URL || getBaseUrl(req)).replace(/\/$/, "");
    await ensurePublicInvoicePdf(id, baseUrl);
    await sendOrderReceivedWhatsApp(id, baseUrl);
    res.json({ sent: true });
  });

  app.post("/api/whatsapp/send-order-shipped", requireAdmin, async (req, res) => {
    if (!isWhatsAppConfigured()) return res.status(503).json({ message: "WhatsApp not configured" });
    const id = await resolveOrderId(req.body?.orderId);
    if (id == null) return res.status(400).json({ message: "orderId or order number (e.g. ORD-XXX) required" });
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    await sendOrderShippedWhatsApp(id);
    res.json({ sent: true });
  });

  // ===== PAYMENT STATUS CHECK =====
  app.get("/api/payment/status", async (_req, res) => {
    res.json({
      tap: !!TAP_API_KEY,
      deema: !!DEEMA_API_KEY,
      whatsapp: isWhatsAppConfigured(),
    });
  });

  async function parseJsonOrThrow(response: Response, context: string): Promise<any> {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      const snippet = text.length > 800 ? `${text.slice(0, 800)}…` : text;
      throw new Error(
        `${context}: Non-JSON response (status ${response.status}, content-type "${contentType}"). Body: ${snippet || "<empty>"}`
      );
    }
  }

  // ===== TAP PAYMENTS (Card / KNET) =====
  // Docs: https://developers.tap.company/reference/create-a-charge
  app.post("/api/payment/tap/initiate", async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await storage.getOrder(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });

      if (!TAP_API_KEY) {
        return res.json({
          demo: true,
          paymentUrl: `${getBaseUrl(req)}/order/success?orderId=${orderId}&t=${encodeURIComponent(signInvoiceId(orderId))}&demo=true`
        });
      }

      if (!order.customerName?.trim()) {
        return res.status(400).json({ message: "Customer name is required" });
      }
      if (!order.customerEmail?.trim()) {
        return res.status(400).json({ message: "Customer email is required" });
      }
      if (!order.customerPhone?.trim()) {
        return res.status(400).json({ message: "Customer phone is required" });
      }

      const customerMobile = order.customerPhone.replace(/\D/g, "").slice(-8);
      if (customerMobile.length !== 8) {
        return res.status(400).json({
          message: "Customer phone must be a valid Kuwait number (8 digits). Please update the phone number and try again.",
        });
      }

      const baseUrl = getBaseUrl(req);
      const redirectUrl = `${baseUrl}/api/payment/tap/callback?orderId=${orderId}`;

      const chargePayload = {
        amount: Math.round(order.total * 1000) / 1000,
        currency: "KWD",
        customer: {
          first_name: order.customerName.split(/\s+/)[0] || "Customer",
          last_name: order.customerName.split(/\s+/).slice(1).join(" ") || ".",
          email: order.customerEmail,
          phone: { country_code: 965, number: parseInt(customerMobile, 10) },
        },
        source: { id: "src_all" },
        redirect: { url: redirectUrl },
        post: { url: `${baseUrl}/api/payment/tap/webhook` },
        reference: { order: order.orderNumber, transaction: `bilyar-${orderId}` },
        description: `Order ${order.orderNumber}`,
        metadata: { udf1: String(orderId) },
      };

      const response = await fetch("https://api.tap.company/v2/charges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TAP_API_KEY}`,
        },
        body: JSON.stringify(chargePayload),
      });

      const result = await parseJsonOrThrow(response, "Tap Create Charge");

      const chargeId = result?.id;
      const paymentUrl = result?.transaction?.url;

      if (chargeId && paymentUrl) {
        await storage.updateOrderPayment(orderId, chargeId, "initiated");
        return res.json({ paymentUrl, chargeId });
      }

      const errMsg = result?.errors?.[0]?.description || result?.message || "Payment initiation failed";
      return res.status(400).json({ message: errMsg });
    } catch (error: any) {
      console.error("Tap error:", error);
      return res.status(500).json({
        message: "Payment service error",
        details: process.env.NODE_ENV === "production" ? undefined : String(error?.message || error),
      });
    }
  });

  app.get("/api/payment/tap/callback", async (req, res) => {
    const { orderId, tap_id } = req.query;
    const baseUrl = getBaseUrl(req);
    const id = parseInt(orderId as string);

    if (!orderId || isNaN(id)) {
      return res.redirect(`${baseUrl}/order/failed`);
    }

    try {
      if (TAP_API_KEY && tap_id) {
        const chargeRes = await fetch(`https://api.tap.company/v2/charges/${tap_id}`, {
          headers: { "Authorization": `Bearer ${TAP_API_KEY}` },
        });
        const charge = await parseJsonOrThrow(chargeRes, "Tap Get Charge");

        if (charge?.status === "CAPTURED") {
          const existing = await storage.getOrder(id);
          await storage.updateOrderPayment(id, String(tap_id), "paid");
          await storage.updateOrderStatus(id, "Paid");
          if (existing && !(existing as any).inventoryAdjusted) {
            await adjustInventoryForOrder(id, -1);
            await storage.updateOrder(id, { inventoryAdjusted: true } as any);
          }
          await applyDiscountUsageIfAny(id);
          await ensurePublicInvoicePdf(id, baseUrl);
          sendOrderReceivedWhatsApp(id, baseUrl).catch((err) => console.error("WhatsApp order_received:", err));
          sendAdminOrderNotification(id).catch((err) => console.error("Admin order email:", err));
          return res.redirect(`${baseUrl}/order/success?orderId=${orderId}&t=${encodeURIComponent(signInvoiceId(id))}`);
        }
        if (charge?.status === "DECLINED" || charge?.status === "CANCELLED" || charge?.status === "FAILED") {
          await storage.updateOrderPayment(id, String(tap_id), "failed");
          await storage.updateOrderStatus(id, "Cancelled");
          return res.redirect(`${baseUrl}/order/failed?orderId=${orderId}`);
        }
      }

      return res.redirect(`${baseUrl}/order/failed?orderId=${orderId}`);
    } catch (err) {
      console.error("Tap callback error:", err);
      return res.redirect(`${baseUrl}/order/failed?orderId=${orderId}`);
    }
  });

  app.post("/api/payment/tap/webhook", express.json(), async (req, res) => {
    res.status(200).send("OK");
    const body = req.body;
    const chargeId = body?.id;
    const status = body?.status;
    const orderId = body?.metadata?.udf1 ? parseInt(body.metadata.udf1, 10) : null;

    if (chargeId && orderId && !isNaN(orderId) && status === "CAPTURED") {
      try {
        const order = await storage.getOrder(orderId);
        if (order && order.paymentStatus !== "paid") {
          const baseUrl = (process.env.SITE_URL || "").replace(/\/$/, "") || "https://www.bilyarofficial.com";
          await storage.updateOrderPayment(orderId, chargeId, "paid");
          await storage.updateOrderStatus(orderId, "Paid");
          if (!(order as any).inventoryAdjusted) {
            await adjustInventoryForOrder(orderId, -1);
            await storage.updateOrder(orderId, { inventoryAdjusted: true } as any);
          }
          await applyDiscountUsageIfAny(orderId);
          await ensurePublicInvoicePdf(orderId, baseUrl);
          sendOrderReceivedWhatsApp(orderId, baseUrl).catch((err) => console.error("WhatsApp order_received (webhook):", err));
          sendAdminOrderNotification(orderId).catch((err) => console.error("Admin order email:", err));
        }
      } catch (e) {
        console.error("Tap webhook error:", e);
      }
    }
  });

  // ===== DEEMA BNPL PAYMENT =====
  app.post("/api/payment/deema/initiate", async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await storage.getOrder(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });

      if (!DEEMA_API_KEY) {
        return res.json({
          demo: true,
          paymentUrl: `${getBaseUrl(req)}/order/success?orderId=${orderId}&t=${encodeURIComponent(signInvoiceId(orderId))}&demo=true`
        });
      }

      const baseUrl = getBaseUrl(req);

      const isSandbox = DEEMA_BASE_URL.includes("sandbox-api") || DEEMA_BASE_URL.includes("staging-api");
      if (isSandbox && (order.total < 100 || order.total > 200)) {
        return res.status(400).json({
          message: "Deema Sandbox only accepts orders between 100 and 200 KWD. Your total is " + order.total.toFixed(3) + " KWD. Add or remove items to test.",
        });
      }

      // Deema API expects amount in KWD (decimal), not fils. Sandbox range 100-200 KWD.
      const amountKwd = Number(order.total);

      // Deema docs: "Authorization: Basic {API Key}". Options: basic (raw), basic64 (base64), bearer.
      const authMode = (process.env.DEEMA_AUTH || "basic").toLowerCase();
      let authHeader: string;
      if (authMode === "basic") {
        authHeader = `Basic ${DEEMA_API_KEY}`;
      } else if (authMode === "basic64") {
        authHeader = `Basic ${Buffer.from(`${DEEMA_API_KEY}:`).toString("base64")}`;
      } else {
        authHeader = `Bearer ${DEEMA_API_KEY}`;
      }

      const response = await fetch(`${DEEMA_BASE_URL}/api/merchant/v1/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          amount: amountKwd,
          currency_code: "KWD",
          merchant_order_id: String(orderId),
          merchant_urls: {
            success: `${baseUrl}/api/payment/deema/callback?orderId=${orderId}&status=success`,
            failure: `${baseUrl}/api/payment/deema/callback?orderId=${orderId}&status=failed`,
          },
        }),
      });

      const result = await response.json();
      console.log("Deema API response:", response.status, JSON.stringify(result));

      if (result.data && result.data.redirect_link) {
        await storage.updateOrderPayment(orderId, result.data.order_reference || "", "initiated");
        return res.json({
          paymentUrl: result.data.redirect_link,
          deemaOrderId: result.data.order_reference,
        });
      }

      const errMsg = result.message || result.error || (typeof result.errors === "string" ? result.errors : result.errors?.[0]?.message) || "Deema payment initiation failed";
      return res.status(400).json({ message: errMsg });
    } catch (error: any) {
      console.error("Deema error:", error);
      return res.status(500).json({ message: "Payment service error" });
    }
  });

  app.get("/api/payment/deema/callback", async (req, res) => {
    const { orderId, status } = req.query;
    const baseUrl = getBaseUrl(req);
    const id = parseInt(orderId as string);
    console.log("Deema callback:", { orderId, status, query: req.query });

    // Treat as success unless Deema explicitly sent status=failed (e.g. they may omit params or use "completed")
    const isFailure = String(status).toLowerCase() === "failed";
    if (isFailure) {
      await storage.updateOrderPayment(id, "", "failed");
      await storage.updateOrderStatus(id, "Cancelled");
      return res.redirect(`${baseUrl}/order/failed?orderId=${orderId}`);
    }
    const existing = await storage.getOrder(id);
    await storage.updateOrderPayment(id, "", "paid");
    await storage.updateOrderStatus(id, "Paid");
    if (existing && !(existing as any).inventoryAdjusted) {
      await adjustInventoryForOrder(id, -1);
      await storage.updateOrder(id, { inventoryAdjusted: true } as any);
    }
    await applyDiscountUsageIfAny(id);
    await ensurePublicInvoicePdf(id, baseUrl);
    sendOrderReceivedWhatsApp(id, baseUrl).catch((err) => console.error("WhatsApp order_received:", err));
    sendAdminOrderNotification(id).catch((err) => console.error("Admin order email:", err));
    return res.redirect(`${baseUrl}/order/success?orderId=${orderId}&t=${encodeURIComponent(signInvoiceId(id))}`);
  });

  app.post("/api/payment/deema/webhook", async (req, res) => {
    const headerKey = DEEMA_WEBHOOK_HEADER.toLowerCase();
    const webhookSecret = req.headers[headerKey] ?? req.headers["x-webhook-secret"];
    if (DEEMA_WEBHOOK_SECRET && webhookSecret !== DEEMA_WEBHOOK_SECRET) {
      console.warn("Deema webhook: invalid or missing secret header");
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log("Deema webhook received:", JSON.stringify(req.body));
      const orderRef = req.body.order_ref ?? req.body.order_reference;
      const merchantOrderId = req.body.merchant_order_ref ?? req.body.merchant_order_id;
      const status = String(req.body.status || "");

      const orders = await storage.getOrders();
      const order = orders.find(o =>
        o.paymentId === orderRef ||
        o.id === Number(merchantOrderId)
      );

      if (order) {
        if (status.toLowerCase() === "captured") {
          const baseUrl = (process.env.SITE_URL || "").replace(/\/$/, "") || "https://www.bilyarofficial.com";
          await storage.updateOrderPayment(order.id, orderRef || "", "paid");
          await storage.updateOrderStatus(order.id, "Paid");
          if (!(order as any).inventoryAdjusted) {
            await adjustInventoryForOrder(order.id, -1);
            await storage.updateOrder(order.id, { inventoryAdjusted: true } as any);
          }
          await applyDiscountUsageIfAny(order.id);
          await ensurePublicInvoicePdf(order.id, baseUrl);
          sendOrderReceivedWhatsApp(order.id, baseUrl).catch((err) => console.error("WhatsApp order_received (Deema webhook):", err));
          sendAdminOrderNotification(order.id).catch((err) => console.error("Admin order email:", err));
          console.log(`Deema webhook: Order ${order.id} payment captured`);
        } else if (status.toLowerCase() === "expired" || status.toLowerCase() === "cancelled") {
          // Don't overwrite if we already marked as paid (e.g. from callback) so successful payments aren't flipped to failed
          const currentPaymentStatus = (order as { paymentStatus?: string }).paymentStatus;
          if (currentPaymentStatus !== "paid") {
            await storage.updateOrderPayment(order.id, orderRef || "", "failed");
            await storage.updateOrderStatus(order.id, "Cancelled");
            console.log(`Deema webhook: Order ${order.id} payment ${status}`);
          }
        }
      } else {
        console.warn("Deema webhook: order not found", { orderRef, merchantOrderId });
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Deema webhook error:", error);
      return res.status(200).json({ received: true });
    }
  });

  return httpServer;
}
