import type { Product, Category, Collection, Order, OrderItem } from "@shared/schema";

export type { Product, Category, Collection, Order, OrderItem };

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export const collections = [
  {
    id: "noir-gold",
    title: "Noir & Gold",
    title_ar: "الأسود والذهبي",
    image: "/images/prod-1.jpg",
    description: "The ultimate expression of prestige and depth.",
    description_ar: "التعبير النهائي عن الهيبة والعمق."
  },
  {
    id: "heritage-modern",
    title: "Heritage Modern",
    title_ar: "التراث الحديث",
    image: "/images/prod-3.jpg",
    description: "Bridging the gap between tradition and future.",
    description_ar: "جسر الفجوة بين التقاليد والمستقبل."
  },
  {
    id: "silk-road",
    title: "The Silk Road",
    title_ar: "طريق الحرير",
    image: "/images/prod-4.jpg",
    description: "Ethereal fabrics meet architectural tailoring.",
    description_ar: "أقمشة أثيرية تلتقي مع خياطة معمارية."
  }
];
