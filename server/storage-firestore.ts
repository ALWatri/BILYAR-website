import { getFirestore, type DocumentSnapshot } from "firebase-admin/firestore";
import { initFirebase } from "./firebase-init";
import type {
  Product,
  Order,
  OrderItem,
  Settings,
  InsertProduct,
  InsertOrder,
  InsertOrderItem,
} from "@shared/schema";

const COLL = {
  products: "products",
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

async function nextId(collection: "products" | "orders" | "orderItems"): Promise<number> {
  const db = getDb();
  const ref = db.collection(COLL.counters).doc("next");
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() ?? { products: 0, orders: 0, orderItems: 0 };
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

  getOrders(): Promise<(Order & { items: OrderItem[] })[]>;
  getOrder(id: number): Promise<(Order & { items: OrderItem[] }) | undefined>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order & { items: OrderItem[] }>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrderPayment(id: number, paymentId: string, paymentStatus: string): Promise<Order | undefined>;

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
