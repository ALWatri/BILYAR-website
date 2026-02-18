import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc, or, ilike } from "drizzle-orm";
import {
  products, categories, collections, orders, orderItems, settings,
  type Product, type InsertProduct,
  type Category, type InsertCategory,
  type Collection, type InsertCollection,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Settings,
} from "@shared/schema";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

export interface IStorage {
  getProducts(filter?: string): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;

  getCollections(): Promise<Collection[]>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, data: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: number): Promise<boolean>;

  getOrders(): Promise<(Order & { items: OrderItem[] })[]>;
  getOrder(id: number): Promise<(Order & { items: OrderItem[] }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order & { items: OrderItem[] }>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrderPayment(id: number, paymentId: string, paymentStatus: string): Promise<Order | undefined>;

  getSettings(): Promise<Settings | undefined>;
  updateSettings(data: Partial<Settings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  async getProducts(filter?: string): Promise<Product[]> {
    if (filter && filter.trim()) {
      const term = `%${filter.trim()}%`;
      return db.select().from(products).where(
        or(
          ilike(products.name, term),
          ilike(products.nameAr, term),
          ilike(products.description, term),
          ilike(products.descriptionAr, term),
          ilike(products.category, term),
          ilike(products.categoryAr, term)
        )
      );
    }
    return db.select().from(products);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    return result.length > 0;
  }

  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return updated;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    return result.length > 0;
  }

  async getCollections(): Promise<Collection[]> {
    return db.select().from(collections);
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const [created] = await db.insert(collections).values(collection).returning();
    return created;
  }

  async updateCollection(id: number, data: Partial<InsertCollection>): Promise<Collection | undefined> {
    const [updated] = await db.update(collections).set(data).where(eq(collections.id, id)).returning();
    return updated;
  }

  async deleteCollection(id: number): Promise<boolean> {
    const result = await db.delete(collections).where(eq(collections.id, id)).returning({ id: collections.id });
    return result.length > 0;
  }

  async getOrders(): Promise<(Order & { items: OrderItem[] })[]> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.id));
    const result = [];
    for (const order of allOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      result.push({ ...order, items });
    }
    return result;
  }

  async getOrder(id: number): Promise<(Order & { items: OrderItem[] }) | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    return { ...order, items };
  }

  async createOrder(orderData: InsertOrder, itemsData: InsertOrderItem[]): Promise<Order & { items: OrderItem[] }> {
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const [order] = await db.insert(orders).values({ ...orderData, orderNumber }).returning();
    const items: OrderItem[] = [];
    for (const item of itemsData) {
      const [created] = await db.insert(orderItems).values({ ...item, orderId: order.id }).returning();
      items.push(created);
    }
    return { ...order, items };
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updated;
  }

  async updateOrderPayment(id: number, paymentId: string, paymentStatus: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set({ paymentId, paymentStatus }).where(eq(orders.id, id)).returning();
    return updated;
  }

  async getSettings(): Promise<Settings | undefined> {
    const [row] = await db.select().from(settings).limit(1);
    return row;
  }

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    const existing = await this.getSettings();
    const payload = {
      storeName: data.storeName ?? existing?.storeName ?? "BILYAR",
      storeEmail: data.storeEmail ?? existing?.storeEmail ?? "info@bilyar.com",
      storePhone: data.storePhone ?? existing?.storePhone ?? "+965 1234 5678",
      currency: data.currency ?? existing?.currency ?? "KWD",
      freeShippingThreshold: data.freeShippingThreshold ?? existing?.freeShippingThreshold ?? 90,
      defaultShippingCost: data.defaultShippingCost ?? existing?.defaultShippingCost ?? 5,
    };
    if (existing) {
      const [updated] = await db.update(settings).set(payload).where(eq(settings.id, existing.id)).returning();
      return updated!;
    }
    const [created] = await db.insert(settings).values(payload).returning();
    return created!;
  }
}
