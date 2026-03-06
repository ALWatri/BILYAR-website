import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";

export interface StoreSettings {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  currency: string;
  freeShippingThreshold: number;
  defaultShippingCost: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  variant?: "set" | "top";
  measurements?: Record<string, string>;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, size?: string, variant?: "set" | "top") => void;
  updateQuantity: (productId: number, quantity: number, size?: string, variant?: "set" | "top") => void;
  clearCart: () => void;
  subtotal: number;
  shippingCost: number;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = "bilyar_cart";

function loadCart(): CartItem[] {
  try {
    const saved = localStorage.getItem(CART_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  useQuery<StoreSettings>({ queryKey: ["/api/settings"] }); // keep cache warm for admin/settings usage

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = (newItem: CartItem) => {
    // Hard-block out-of-stock items from being added
    if ((newItem.product as Product & { outOfStock?: boolean }).outOfStock) {
      return;
    }
    const v = newItem.variant ?? "set";
    setItems(prev => {
      const existing = prev.find(i => i.product.id === newItem.product.id && i.size === newItem.size && (i.variant ?? "set") === v);
      if (existing) {
        return prev.map(i =>
          i.product.id === newItem.product.id && i.size === newItem.size && (i.variant ?? "set") === v
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        );
      }
      return [...prev, newItem];
    });
  };

  const removeItem = (productId: number, size?: string, variant?: "set" | "top") => {
    setItems(prev => prev.filter(i =>
      !(i.product.id === productId && (!size || i.size === size) && (!variant || (i.variant ?? "set") === variant))
    ));
  };

  const updateQuantity = (productId: number, quantity: number, size?: string, variant?: "set" | "top") => {
    if (quantity < 1) return;
    setItems(prev => prev.map(i =>
      i.product.id === productId && (!size || i.size === size) && (!variant || (i.variant ?? "set") === variant)
        ? { ...i, quantity }
        : i
    ));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((acc, item) => {
    const p = item.product as Product & { topPrice?: number | null };
    const price = item.variant === "top" && p.topPrice != null ? p.topPrice : item.product.price;
    return acc + price * item.quantity;
  }, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  // Shipping rules:
  // - Free delivery when cart has 2+ items
  // - Otherwise base delivery is 3 KWD
  // (Area-based 5 KWD exceptions are applied on checkout/server once area is known.)
  const shippingCost = itemCount >= 2 ? 0 : 3;
  const total = subtotal + shippingCost;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, shippingCost, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
