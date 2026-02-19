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

// Test: https://apitest.myfatoorah.com/ | Live Kuwait: https://api.myfatoorah.com/
const MYFATOORAH_BASE_URL = process.env.MYFATOORAH_BASE_URL || "https://apitest.myfatoorah.com";
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
    sku: z.string().optional().nullable(),
    stockBySize: z.record(z.string(), z.number()).optional().nullable(),
    outOfStock: z.boolean().optional().default(false),
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

  app.post("/api/categories", async (req, res) => {
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

  app.patch("/api/categories/:id", async (req, res) => {
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

  app.delete("/api/categories/:id", async (req, res) => {
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

  app.post("/api/collections", async (req, res) => {
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

  app.patch("/api/collections/:id", async (req, res) => {
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

  app.delete("/api/collections/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid collection ID" });
    const deleted = await storage.deleteCollection(id);
    if (!deleted) return res.status(404).json({ message: "Collection not found" });
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
    paymentMethod: z.enum(["myfatoorah", "deema", "manual"]).optional().default("myfatoorah"),
  });

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
        productsById.set(item.productId, p);
      }

      const subtotal = data.items.reduce((acc, item) => {
        const p = productsById.get(item.productId)!;
        return acc + p.price * item.quantity;
      }, 0);
      const s = await storage.getSettings();
      const threshold = s?.freeShippingThreshold ?? 90;
      const defaultCost = s?.defaultShippingCost ?? 5;
      const shippingCost = subtotal >= threshold ? 0 : defaultCost;
      const total = subtotal + shippingCost;
      const isManual = data.paymentMethod === "manual";

      let customerNameEn: string, customerAddressEn: string, customerCityEn: string, customerCountryEn: string;
      if (isManual) {
        customerNameEn = data.customer.name;
        customerAddressEn = data.customer.address;
        customerCityEn = data.customer.city;
        customerCountryEn = data.customer.country;
      } else {
        [customerNameEn, customerAddressEn, customerCityEn, customerCountryEn] = await Promise.all([
          translateToEnglish(data.customer.name),
          translateToEnglish(data.customer.address),
          translateToEnglish(data.customer.city),
          translateToEnglish(data.customer.country),
        ]);
      }

      const itemsWithNotesEn = await Promise.all(
        data.items.map(async (item) => {
          const notesEn = !isManual && item.notes ? await translateToEnglish(item.notes) : null;
          const p = productsById.get(item.productId)!;
          return {
            orderId: 0,
            productId: item.productId,
            productName: item.productName || p.name,
            quantity: item.quantity,
            price: p.price,
            image: p.images?.[0] || item.image,
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
          paymentMethod: data.paymentMethod ?? "myfatoorah",
          paymentStatus: isManual ? "manual" : "pending",
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

  app.delete("/api/orders/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid order ID" });
    const deleted = await storage.deleteOrder(id);
    if (!deleted) return res.status(404).json({ message: "Order not found" });
    res.status(204).send();
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
      size: z.string().optional().nullable(),
      measurements: z.record(z.string()).optional().nullable(),
      notes: z.string().optional().nullable(),
      notesEn: z.string().optional().nullable(),
    })).optional(),
  });

  app.patch("/api/orders/:id", async (req, res) => {
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
          orderData.customerAddressEn = data.customer.address;
        }
        if (data.customer.city != null) {
          orderData.customerCity = data.customer.city;
          orderData.customerCityEn = data.customer.city;
        }
        if (data.customer.country != null) {
          orderData.customerCountry = data.customer.country;
          orderData.customerCountryEn = data.customer.country;
        }
      }
      if (data.status != null) orderData.status = data.status;

      let itemsData: { productId: number; productName: string; quantity: number; price: number; image: string; size?: string | null; measurements?: Record<string, string> | null; notes?: string | null; notesEn?: string | null }[] | undefined;
      if (data.items && data.items.length > 0) {
        const subtotal = data.items.reduce((acc, i) => acc + i.price * i.quantity, 0);
        const s = await storage.getSettings();
        const threshold = s?.freeShippingThreshold ?? 90;
        const defaultCost = s?.defaultShippingCost ?? 5;
        const shippingCost = subtotal >= threshold ? 0 : defaultCost;
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

  app.get("/api/customers", async (_req, res) => {
    const orders = await storage.getOrders();
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
          id: key,
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

  const updateCustomerSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
  });

  app.patch("/api/customers", async (req, res) => {
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

  app.delete("/api/customers", async (req, res) => {
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

      const parseJsonOrThrow = async (response: Response, context: string) => {
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
      };

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
          CustomerMobile: customerMobile,
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

      const result = await parseJsonOrThrow(response, "MyFatoorah ExecutePayment");

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
      return res.status(500).json({
        message: "Payment service error",
        details: process.env.NODE_ENV === "production" ? undefined : String(error?.message || error),
      });
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
        const parseJsonOrThrow = async (response: Response, context: string) => {
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
        };

        const statusRes = await fetch(`${MYFATOORAH_BASE_URL}/v2/GetPaymentStatus`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${MYFATOORAH_API_KEY}`,
          },
          body: JSON.stringify({ Key: paymentId, KeyType: "PaymentId" }),
        });
        const statusResult = await parseJsonOrThrow(statusRes, "MyFatoorah GetPaymentStatus");

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
    console.log("Deema callback:", { orderId, status, query: req.query });

    // Treat as success unless Deema explicitly sent status=failed (e.g. they may omit params or use "completed")
    const isFailure = String(status).toLowerCase() === "failed";
    if (isFailure) {
      await storage.updateOrderPayment(id, "", "failed");
      await storage.updateOrderStatus(id, "Cancelled");
      return res.redirect(`${baseUrl}/order/failed?orderId=${orderId}`);
    }
    await storage.updateOrderPayment(id, "", "paid");
    await storage.updateOrderStatus(id, "Paid");
    return res.redirect(`${baseUrl}/order/success?orderId=${orderId}`);
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
          await storage.updateOrderPayment(order.id, orderRef || "", "paid");
          await storage.updateOrderStatus(order.id, "Paid");
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
