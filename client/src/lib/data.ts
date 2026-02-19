import type { Product, Category, Collection, Order, OrderItem } from "@shared/schema";

export type { Product, Category, Collection, Order, OrderItem };

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// Collections are managed in Admin and fetched from /api/collections
