import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import type { IStorage } from "./storage";
import { getFirebaseStorageBucket } from "./firebase-init";
import { translateToEnglish } from "./translate";
import { z } from "zod";

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

const MYFATOORAH_BASE_URL = process.env.MYFATOORAH_BASE_URL || "https://demo.myfatoorah.com";
const MYFATOORAH_API_KEY = process.env.MYFATOORAH_API_KEY || "";
// Sandbox: https://sandbox-api.deema.me or https://staging-api.deema.me. Live: https://api.deema.me
const DEEMA_BASE_URL = process.env.DEEMA_BASE_URL || "https://sandbox-api.deema.me";
const DEEMA_API_KEY = process.env.DEEMA_API_KEY || "";
const DEEMA_WEBHOOK_HEADER = process.env.DEEMA_WEBHOOK_HEADER || "x-webhook-secret";
const DEEMA_WEBHOOK_SECRET = process.env.DEEMA_WEBHOOK_SECRET ?? "bilyar-deema-webhook-2026";

function getBaseUrl(req: any): string {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${protocol}://${host}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
  storage: IStorage
): Promise<Server> {

  ensureUploadsDir();
  app.use("/uploads", express.static(UPLOADS_DIR));

  app.post("/api/upload", memoryUpload.array("images", 20), async (req, res) => {
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
  });

  app.post("/api/products", async (req, res) => {
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

  app.patch("/api/products/:id", async (req, res) => {
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

  app.delete("/api/products/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid product ID" });
    const deleted = await storage.deleteProduct(id);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.status(204).send();
  });

  app.get("/api/orders", async (_req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get("/api/orders/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
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
      size: z.string().optional(),
      measurements: z.record(z.string()).optional(),
      notes: z.string().optional(),
    })).min(1),
    paymentMethod: z.enum(["myfatoorah", "deema"]),
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const data = createOrderSchema.parse(req.body);
      const subtotal = data.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
      const s = await storage.getSettings();
      const threshold = s?.freeShippingThreshold ?? 90;
      const defaultCost = s?.defaultShippingCost ?? 5;
      const shippingCost = subtotal >= threshold ? 0 : defaultCost;
      const total = subtotal + shippingCost;

      const [customerNameEn, customerAddressEn, customerCityEn, customerCountryEn] = await Promise.all([
        translateToEnglish(data.customer.name),
        translateToEnglish(data.customer.address),
        translateToEnglish(data.customer.city),
        translateToEnglish(data.customer.country),
      ]);

      const itemsWithNotesEn = await Promise.all(
        data.items.map(async (item) => {
          const notesEn = item.notes ? await translateToEnglish(item.notes) : null;
          return {
            orderId: 0,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
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
          customerNameEn: customerNameEn !== data.customer.name ? customerNameEn : null,
          customerAddressEn: customerAddressEn !== data.customer.address ? customerAddressEn : null,
          customerCityEn: customerCityEn !== data.customer.city ? customerCityEn : null,
          customerCountryEn: customerCountryEn !== data.customer.country ? customerCountryEn : null,
          status: "Pending",
          paymentMethod: data.paymentMethod,
          paymentStatus: "pending",
          total,
          shippingCost,
        },
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

  app.patch("/api/orders/:id/status", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const { status } = req.body;
    if (!["Pending", "Paid", "Processing", "Shipped", "Delivered", "Unfinished", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateOrderStatus(id, status);
    if (!updated) return res.status(404).json({ message: "Order not found" });
    res.json(updated);
  });

  // ===== CUSTOMERS (derived from orders) =====
  app.get("/api/customers", async (_req, res) => {
    const orders = await storage.getOrders();
    const customerMap = new Map<string, {
      email: string;
      name: string;
      phone: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: string;
      orders: typeof orders;
    }>();

    for (const order of orders) {
      const email = (order.customerEmail || "").trim().toLowerCase();
      const phone = (order.customerPhone || "").trim();
      const name = (order.customerName || "").trim();
      const key = email ? email : `${phone}|${name}`;
      const existing = customerMap.get(key);
      if (existing) {
        existing.totalOrders += 1;
        existing.totalSpent += order.total;
        if (order.createdAt > existing.lastOrderDate) {
          existing.lastOrderDate = order.createdAt;
          existing.name = order.customerName;
          existing.phone = order.customerPhone;
        }
        existing.orders.push(order);
      } else {
        customerMap.set(key, {
          email: order.customerEmail,
          name: order.customerName,
          phone: order.customerPhone,
          totalOrders: 1,
          totalSpent: order.total,
          lastOrderDate: order.createdAt,
          orders: [order],
        });
      }
    }

    const customers = Array.from(customerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent);
    res.json(customers);
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

  app.patch("/api/settings", async (req, res) => {
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

  // ===== PAYMENT STATUS CHECK =====
  app.get("/api/payment/status", async (_req, res) => {
    res.json({
      myfatoorah: !!MYFATOORAH_API_KEY,
      deema: !!DEEMA_API_KEY,
    });
  });

  // ===== MYFATOORAH PAYMENT =====
  app.post("/api/payment/myfatoorah/initiate", async (req, res) => {
    try {
      const { orderId } = req.body;
      const order = await storage.getOrder(orderId);
      if (!order) return res.status(404).json({ message: "Order not found" });

      if (!MYFATOORAH_API_KEY) {
        return res.json({
          demo: true,
          paymentUrl: `${getBaseUrl(req)}/order/success?orderId=${orderId}&demo=true`
        });
      }

      const baseUrl = getBaseUrl(req);

      const response = await fetch(`${MYFATOORAH_BASE_URL}/v2/ExecutePayment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MYFATOORAH_API_KEY}`,
        },
        body: JSON.stringify({
          InvoiceValue: order.total,
          CurrencyIso: "KWD",
          CustomerName: order.customerName,
          CustomerEmail: order.customerEmail,
          MobileCountryCode: "+965",
          CustomerMobile: order.customerPhone.replace(/\D/g, "").slice(-8),
          CallBackUrl: `${baseUrl}/api/payment/myfatoorah/callback?orderId=${orderId}`,
          ErrorUrl: `${baseUrl}/api/payment/myfatoorah/callback?orderId=${orderId}&error=true`,
          Language: "en",
          CustomerReference: order.orderNumber,
          InvoiceItems: order.items.map(item => ({
            ItemName: item.productName,
            Quantity: item.quantity,
            UnitPrice: item.price,
          })),
        }),
      });

      const result = await response.json();

      if (result.IsSuccess) {
        await storage.updateOrderPayment(orderId, result.Data.InvoiceId.toString(), "initiated");
        return res.json({
          paymentUrl: result.Data.PaymentURL,
          invoiceId: result.Data.InvoiceId,
        });
      } else {
        return res.status(400).json({ message: result.Message || "Payment initiation failed" });
      }
    } catch (error: any) {
      console.error("MyFatoorah error:", error);
      return res.status(500).json({ message: "Payment service error" });
    }
  });

  app.get("/api/payment/myfatoorah/callback", async (req, res) => {
    const { orderId, paymentId, error } = req.query;
    const baseUrl = getBaseUrl(req);
    const id = parseInt(orderId as string);

    if (error) {
      await storage.updateOrderPayment(id, paymentId as string || "", "failed");
      await storage.updateOrderStatus(id, "Cancelled");
      return res.redirect(`${baseUrl}/order/failed?orderId=${orderId}`);
    }

    try {
      if (MYFATOORAH_API_KEY && paymentId) {
        const statusRes = await fetch(`${MYFATOORAH_BASE_URL}/v2/GetPaymentStatus`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MYFATOORAH_API_KEY}`,
          },
          body: JSON.stringify({ Key: paymentId, KeyType: "PaymentId" }),
        });
        const statusResult = await statusRes.json();

        if (statusResult.IsSuccess && statusResult.Data?.InvoiceStatus === "Paid") {
          await storage.updateOrderPayment(id, paymentId as string, "paid");
          await storage.updateOrderStatus(id, "Paid");
          return res.redirect(`${baseUrl}/order/success?orderId=${orderId}`);
        }
      }

      await storage.updateOrderPayment(id, paymentId as string || "", "paid");
      await storage.updateOrderStatus(id, "Paid");
      return res.redirect(`${baseUrl}/order/success?orderId=${orderId}`);
    } catch (err) {
      console.error("MyFatoorah callback error:", err);
      return res.redirect(`${baseUrl}/order/success?orderId=${orderId}`);
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
          paymentUrl: `${getBaseUrl(req)}/order/success?orderId=${orderId}&demo=true`
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

    if (status === "success") {
      await storage.updateOrderPayment(id, "", "paid");
      await storage.updateOrderStatus(id, "Paid");
      return res.redirect(`${baseUrl}/order/success?orderId=${orderId}`);
    } else {
      await storage.updateOrderPayment(id, "", "failed");
      await storage.updateOrderStatus(id, "Cancelled");
      return res.redirect(`${baseUrl}/order/failed?orderId=${orderId}`);
    }
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
      const { order_reference, status, merchant_order_id } = req.body;

      const orders = await storage.getOrders();
      const order = orders.find(o =>
        o.paymentId === order_reference ||
        o.id === Number(merchant_order_id)
      );

      if (order) {
        if (status === "Captured") {
          await storage.updateOrderPayment(order.id, order_reference || "", "paid");
          await storage.updateOrderStatus(order.id, "Paid");
          console.log(`Deema webhook: Order ${order.id} payment captured`);
        } else if (status === "Expired" || status === "Cancelled") {
          await storage.updateOrderPayment(order.id, order_reference || "", "failed");
          await storage.updateOrderStatus(order.id, "Cancelled");
          console.log(`Deema webhook: Order ${order.id} payment ${status}`);
        }
      } else {
        console.warn("Deema webhook: order not found", { order_reference, merchant_order_id });
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Deema webhook error:", error);
      return res.status(200).json({ received: true });
    }
  });

  return httpServer;
}
