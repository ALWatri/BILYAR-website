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
  measurements?: Record<string, string>;
  notes?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, size?: string) => void;
  updateQuantity: (productId: number, quantity: number, size?: string) => void;
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
  const { data: storeSettings } = useQuery<StoreSettings>({ queryKey: ["/api/settings"] });

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = (newItem: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === newItem.product.id && i.size === newItem.size);
      if (existing) {
        return prev.map(i =>
          i.product.id === newItem.product.id && i.size === newItem.size
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        );
      }
      return [...prev, newItem];
    });
  };

  const removeItem = (productId: number, size?: string) => {
    setItems(prev => prev.filter(i => !(i.product.id === productId && (!size || i.size === size))));
  };

  const updateQuantity = (productId: number, quantity: number, size?: string) => {
    if (quantity < 1) return;
    setItems(prev => prev.map(i =>
      i.product.id === productId && (!size || i.size === size) ? { ...i, quantity } : i
    ));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const threshold = storeSettings?.freeShippingThreshold ?? 90;
  const defaultCost = storeSettings?.defaultShippingCost ?? 5;
  const shippingCost = subtotal >= threshold ? 0 : defaultCost;
  const total = subtotal + shippingCost;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

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
