import { getFirestore, type DocumentSnapshot } from "firebase-admin/firestore";
import { initFirebase } from "./firebase-init";
import type {
  Product,
  Category,
  Collection,
  Order,
  OrderItem,
  Settings,
  InsertProduct,
  InsertCategory,
  InsertCollection,
  InsertOrder,
  InsertOrderItem,
} from "@shared/schema";

const COLL = {
  products: "products",
  categories: "categories",
  collections: "collections",
  orders: "orders",
  orderItems: "order_items",
  settings: "settings",
  counters: "counters",
} as const;

function getDb() {
  initFirebase();
  return getFirestore();
}

function toProduct(doc: DocumentSnapshot): Product {
  const d = doc.data()!;
  return {
    id: d.id,
    name: d.name,
    nameAr: d.nameAr,
    price: d.price,
    category: d.category,
    categoryAr: d.categoryAr,
    images: d.images ?? [],
    isNew: d.isNew ?? false,
    description: d.description,
    descriptionAr: d.descriptionAr,
    hasShirt: d.hasShirt ?? false,
    hasTrouser: d.hasTrouser ?? false,
    sku: d.sku ?? null,
    stockBySize: (d.stockBySize as Record<string, number>) ?? null,
    outOfStock: d.outOfStock ?? false,
  };
}

function toCategory(doc: DocumentSnapshot): Category {
  const d = doc.data()!;
  return {
    id: d.id,
    name: d.name,
    nameAr: d.nameAr,
    isActive: d.isActive ?? true,
  };
}

function toCollection(doc: DocumentSnapshot): Collection {
  const d = doc.data()!;
  return {
    id: d.id,
    title: d.title,
    titleAr: d.titleAr,
    description: d.description ?? "",
    descriptionAr: d.descriptionAr ?? "",
    image: d.image ?? "",
    isActive: d.isActive ?? true,
  };
}

function toOrder(doc: DocumentSnapshot): Order {
  const d = doc.data()!;
  return {
    id: d.id,
    orderNumber: d.orderNumber,
    customerName: d.customerName,
    customerEmail: d.customerEmail,
    customerPhone: d.customerPhone,
    customerAddress: d.customerAddress,
    customerCity: d.customerCity,
    customerCountry: d.customerCountry,
    customerNameEn: d.customerNameEn ?? null,
    customerAddressEn: d.customerAddressEn ?? null,
    customerCityEn: d.customerCityEn ?? null,
    customerCountryEn: d.customerCountryEn ?? null,
    status: d.status ?? "Pending",
    paymentMethod: d.paymentMethod ?? "myfatoorah",
    paymentId: d.paymentId ?? null,
    paymentStatus: d.paymentStatus ?? "pending",
    total: d.total,
    shippingCost: d.shippingCost ?? 0,
    createdAt: d.createdAt ?? new Date().toISOString().slice(0, 10),
  };
}

function toOrderItem(doc: DocumentSnapshot): OrderItem {
  const d = doc.data()!;
  return {
    id: d.id,
    orderId: d.orderId,
    productId: d.productId,
    productName: d.productName,
    quantity: d.quantity ?? 1,
    price: d.price,
    image: d.image,
    size: d.size ?? null,
    measurements: d.measurements ?? null,
    notes: d.notes ?? null,
    notesEn: d.notesEn ?? null,
  };
}

function toSettings(doc: DocumentSnapshot): Settings {
  const d = doc.data()!;
  return {
    id: d.id,
    storeName: d.storeName ?? "BILYAR",
    storeEmail: d.storeEmail ?? "info@bilyar.com",
    storePhone: d.storePhone ?? "+965 1234 5678",
    currency: d.currency ?? "KWD",
    freeShippingThreshold: d.freeShippingThreshold ?? 90,
    defaultShippingCost: d.defaultShippingCost ?? 5,
  };
}

async function nextId(collection: "products" | "categories" | "collections" | "orders" | "orderItems"): Promise<number> {
  const db = getDb();
  const ref = db.collection(COLL.counters).doc("next");
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? { products: 0, categories: 0, collections: 0, orders: 0, orderItems: 0 };
    const key = collection === "orderItems" ? "orderItems" : collection;
    const next = (data[key] ?? 0) + 1;
    tx.set(ref, { ...data, [key]: next });
    return next;
  });
  return result;
}

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
  updateOrder(id: number, orderData: Partial<InsertOrder>, items?: Omit<InsertOrderItem, "orderId">[]): Promise<(Order & { items: OrderItem[] }) | undefined>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrderPayment(id: number, paymentId: string, paymentStatus: string): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;

  getSettings(): Promise<Settings | undefined>;
  updateSettings(data: Partial<Settings>): Promise<Settings>;
}

export class FirestoreStorage implements IStorage {
  async getProducts(filter?: string): Promise<Product[]> {
    const db = getDb();
    const snap = await db.collection(COLL.products).orderBy("id").get();
    let list = snap.docs.map((doc) => toProduct(doc));
    if (filter && filter.trim()) {
      const term = filter.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.nameAr.includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.descriptionAr.includes(term) ||
          p.category.toLowerCase().includes(term) ||
          p.categoryAr.includes(term)
      );
    }
    return list;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const db = getDb();
    const doc = await db.collection(COLL.products).doc(String(id)).get();
    if (!doc.exists) return undefined;
    return toProduct(doc);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const db = getDb();
    const id = await nextId("products");
    const docRef = db.collection(COLL.products).doc(String(id));
    const data = {
      id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      category: product.category,
      categoryAr: product.categoryAr,
      images: product.images,
      isNew: product.isNew ?? false,
      description: product.description,
      descriptionAr: product.descriptionAr,
      hasShirt: product.hasShirt ?? false,
      hasTrouser: product.hasTrouser ?? false,
      sku: product.sku ?? null,
      stockBySize: (product as { stockBySize?: Record<string, number> | null }).stockBySize ?? null,
      outOfStock: product.outOfStock ?? false,
    };
    await docRef.set(data);
    return data as Product;
  }

  async updateProduct(id: number, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const db = getDb();
    const ref = db.collection(COLL.products).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    const update: Record<string, unknown> = { ...data };
    if (Object.keys(update).length === 0) return toProduct(snap);
    await ref.update(update);
    const updated = await ref.get();
    return toProduct(updated);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const db = getDb();
    const ref = db.collection(COLL.products).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  }

  async getCategories(): Promise<Category[]> {
    const db = getDb();
    const snap = await db.collection(COLL.categories).orderBy("id").get();
    return snap.docs.map((doc) => toCategory(doc));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const db = getDb();
    const id = await nextId("categories");
    const docRef = db.collection(COLL.categories).doc(String(id));
    const data = {
      id,
      name: category.name,
      nameAr: category.nameAr,
      isActive: category.isActive ?? true,
    };
    await docRef.set(data);
    return data as Category;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const db = getDb();
    const ref = db.collection(COLL.categories).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    const update: Record<string, unknown> = { ...data };
    if (Object.keys(update).length === 0) return toCategory(snap);
    await ref.update(update);
    const updated = await ref.get();
    return toCategory(updated);
  }

  async deleteCategory(id: number): Promise<boolean> {
    const db = getDb();
    const ref = db.collection(COLL.categories).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  }

  async getCollections(): Promise<Collection[]> {
    const db = getDb();
    const snap = await db.collection(COLL.collections).orderBy("id").get();
    return snap.docs.map((doc) => toCollection(doc));
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const db = getDb();
    const id = await nextId("collections");
    const docRef = db.collection(COLL.collections).doc(String(id));
    const data = {
      id,
      title: collection.title,
      titleAr: collection.titleAr,
      description: collection.description ?? "",
      descriptionAr: collection.descriptionAr ?? "",
      image: collection.image ?? "",
      isActive: collection.isActive ?? true,
    };
    await docRef.set(data);
    return data as Collection;
  }

  async updateCollection(id: number, data: Partial<InsertCollection>): Promise<Collection | undefined> {
    const db = getDb();
    const ref = db.collection(COLL.collections).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    const update: Record<string, unknown> = { ...data };
    if (Object.keys(update).length === 0) return toCollection(snap);
    await ref.update(update);
    const updated = await ref.get();
    return toCollection(updated);
  }

  async deleteCollection(id: number): Promise<boolean> {
    const db = getDb();
    const ref = db.collection(COLL.collections).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return false;
    await ref.delete();
    return true;
  }

  async getOrders(): Promise<(Order & { items: OrderItem[] })[]> {
    const db = getDb();
    const ordersSnap = await db.collection(COLL.orders).orderBy("id", "desc").get();
    const orders: (Order & { items: OrderItem[] })[] = [];
    for (const doc of ordersSnap.docs) {
      const order = toOrder(doc);
      const itemsSnap = await db.collection(COLL.orderItems).where("orderId", "==", order.id).get();
      const items = itemsSnap.docs.map((d) => toOrderItem(d));
      orders.push({ ...order, items });
    }
    return orders;
  }

  async getOrder(id: number): Promise<(Order & { items: OrderItem[] }) | undefined> {
    const db = getDb();
    const doc = await db.collection(COLL.orders).doc(String(id)).get();
    if (!doc.exists) return undefined;
    const order = toOrder(doc);
    const itemsSnap = await db.collection(COLL.orderItems).where("orderId", "==", id).get();
    const items = itemsSnap.docs.map((d) => toOrderItem(d));
    return { ...order, items };
  }

  async createOrder(orderData: InsertOrder, itemsData: InsertOrderItem[]): Promise<Order & { items: OrderItem[] }> {
    const db = getDb();
    const orderId = await nextId("orders");
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const createdAt = new Date().toISOString().slice(0, 10);
    const orderRef = db.collection(COLL.orders).doc(String(orderId));
    await orderRef.set({
      id: orderId,
      orderNumber,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      customerAddress: orderData.customerAddress,
      customerCity: orderData.customerCity,
      customerCountry: orderData.customerCountry,
      customerNameEn: (orderData as Record<string, unknown>).customerNameEn ?? null,
      customerAddressEn: (orderData as Record<string, unknown>).customerAddressEn ?? null,
      customerCityEn: (orderData as Record<string, unknown>).customerCityEn ?? null,
      customerCountryEn: (orderData as Record<string, unknown>).customerCountryEn ?? null,
      status: orderData.status ?? "Pending",
      paymentMethod: orderData.paymentMethod ?? "myfatoorah",
      paymentId: orderData.paymentId ?? null,
      paymentStatus: orderData.paymentStatus ?? "pending",
      total: orderData.total,
      shippingCost: orderData.shippingCost ?? 0,
      createdAt,
    });
    const items: OrderItem[] = [];
    for (let i = 0; i < itemsData.length; i++) {
      const itemId = await nextId("orderItems");
      const item = itemsData[i];
      const itemData = item as InsertOrderItem & { notesEn?: string | null };
      await db.collection(COLL.orderItems).doc(String(itemId)).set({
        id: itemId,
        orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity ?? 1,
        price: item.price,
        image: item.image,
        size: item.size ?? null,
        measurements: item.measurements ?? null,
        notes: item.notes ?? null,
        notesEn: itemData.notesEn ?? null,
      });
      items.push({
        id: itemId,
        orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity ?? 1,
        price: item.price,
        image: item.image,
        size: item.size ?? null,
        measurements: item.measurements ?? null,
        notes: item.notes ?? null,
        notesEn: itemData.notesEn ?? null,
      });
    }
    const order = await this.getOrder(orderId)!;
    return order!;
  }

  async updateOrder(id: number, orderData: Partial<InsertOrder>, items?: Omit<InsertOrderItem, "orderId">[]): Promise<(Order & { items: OrderItem[] }) | undefined> {
    const db = getDb();
    const orderRef = db.collection(COLL.orders).doc(String(id));
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return undefined;
    const { orderNumber: _on, ...data } = orderData as InsertOrder & { orderNumber?: string };
    if (Object.keys(data).length > 0) await orderRef.update(data);
    if (items !== undefined) {
      const itemsSnap = await db.collection(COLL.orderItems).where("orderId", "==", id).get();
      for (const d of itemsSnap.docs) await d.ref.delete();
      const newItems: OrderItem[] = [];
      for (const item of items) {
        const itemId = await nextId("orderItems");
        await db.collection(COLL.orderItems).doc(String(itemId)).set({
          id: itemId,
          orderId: id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity ?? 1,
          price: item.price,
          image: item.image,
          size: item.size ?? null,
          measurements: item.measurements ?? null,
          notes: item.notes ?? null,
          notesEn: (item as InsertOrderItem & { notesEn?: string | null }).notesEn ?? null,
        });
        newItems.push({
          id: itemId,
          orderId: id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity ?? 1,
          price: item.price,
          image: item.image,
          size: item.size ?? null,
          measurements: item.measurements ?? null,
          notes: item.notes ?? null,
          notesEn: (item as InsertOrderItem & { notesEn?: string | null }).notesEn ?? null,
        });
      }
      const updatedSnap = await orderRef.get();
      return { ...toOrder(updatedSnap), items: newItems };
    }
    return this.getOrder(id);
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const db = getDb();
    const ref = db.collection(COLL.orders).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    await ref.update({ status });
    const updated = await ref.get();
    return toOrder(updated);
  }

  async updateOrderPayment(id: number, paymentId: string, paymentStatus: string): Promise<Order | undefined> {
    const db = getDb();
    const ref = db.collection(COLL.orders).doc(String(id));
    const snap = await ref.get();
    if (!snap.exists) return undefined;
    await ref.update({ paymentId, paymentStatus });
    const updated = await ref.get();
    return toOrder(updated);
  }

  async deleteOrder(id: number): Promise<boolean> {
    const db = getDb();
    const orderRef = db.collection(COLL.orders).doc(String(id));
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return false;
    const itemsSnap = await db.collection(COLL.orderItems).where("orderId", "==", id).get();
    for (const d of itemsSnap.docs) await d.ref.delete();
    await orderRef.delete();
    return true;
  }

  async getSettings(): Promise<Settings | undefined> {
    const db = getDb();
    const doc = await db.collection(COLL.settings).doc("store").get();
    if (!doc.exists) return undefined;
    return toSettings(doc);
  }

  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    const db = getDb();
    const existing = await this.getSettings();
    const payload = {
      storeName: data.storeName ?? existing?.storeName ?? "BILYAR",
      storeEmail: data.storeEmail ?? existing?.storeEmail ?? "info@bilyar.com",
      storePhone: data.storePhone ?? existing?.storePhone ?? "+965 1234 5678",
      currency: data.currency ?? existing?.currency ?? "KWD",
      freeShippingThreshold: data.freeShippingThreshold ?? existing?.freeShippingThreshold ?? 90,
      defaultShippingCost: data.defaultShippingCost ?? existing?.defaultShippingCost ?? 5,
    };
    const ref = db.collection(COLL.settings).doc("store");
    await ref.set({ id: 1, ...payload });
    return { id: 1, ...payload } as Settings;
  }
}
