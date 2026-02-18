import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, jsonb, real, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  price: real("price").notNull(),
  category: text("category").notNull(),
  categoryAr: text("category_ar").notNull(),
  images: text("images").array().notNull(),
  isNew: boolean("is_new").default(false),
  description: text("description").notNull(),
  descriptionAr: text("description_ar").notNull(),
  hasShirt: boolean("has_shirt").default(false),
  hasTrouser: boolean("has_trouser").default(false),
  sku: text("sku"),
  outOfStock: boolean("out_of_stock").default(false),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  isActive: boolean("is_active").default(true),
});

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleAr: text("title_ar").notNull(),
  description: text("description").notNull().default(""),
  descriptionAr: text("description_ar").notNull().default(""),
  image: text("image").notNull().default(""),
  isActive: boolean("is_active").default(true),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerCity: text("customer_city").notNull(),
  customerCountry: text("customer_country").notNull(),
  customerNameEn: text("customer_name_en"),
  customerAddressEn: text("customer_address_en"),
  customerCityEn: text("customer_city_en"),
  customerCountryEn: text("customer_country_en"),
  status: text("status").notNull().default("Pending"),
  paymentMethod: text("payment_method").default("myfatoorah"),
  paymentId: text("payment_id"),
  paymentStatus: text("payment_status").default("pending"),
  total: real("total").notNull(),
  shippingCost: real("shipping_cost").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`to_char(now(), 'YYYY-MM-DD')`),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  price: real("price").notNull(),
  image: text("image").notNull(),
  size: text("size"),
  measurements: jsonb("measurements"),
  notes: text("notes"),
  notesEn: text("notes_en"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").notNull().default("BILYAR"),
  storeEmail: text("store_email").notNull().default("info@bilyar.com"),
  storePhone: text("store_phone").notNull().default("+965 1234 5678"),
  currency: text("currency").notNull().default("KWD"),
  freeShippingThreshold: real("free_shipping_threshold").notNull().default(90),
  defaultShippingCost: real("default_shipping_cost").notNull().default(5),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertCollectionSchema = createInsertSchema(collections).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, orderNumber: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = typeof settings.$inferInsert;
