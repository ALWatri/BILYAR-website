import { Link } from "wouter";
import type { Product } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { translations } from "@/lib/translations";
import { useEffect, useState } from "react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const checkLang = () => {
      const currentLang = (localStorage.getItem("lang") as "en" | "ar") || "en";
      setLang(currentLang);
    };
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const isRtl = lang === "ar";
  const name = isRtl ? product.nameAr : product.name;
  const category = isRtl ? product.categoryAr : product.category;

  return (
    <div className="group relative" data-testid={`card-product-${product.id}`}>
      <div className="aspect-[3/4] overflow-hidden bg-gray-100 relative">
        <Link href={`/product/${product.id}`}>
          <img
            src={product.images[0]}
            alt={name}
            className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
          />
          {product.images[1] && (
            <img
              src={product.images[1]}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
        </Link>
        {product.isNew && (
          <span className={cn(
            "absolute top-4 bg-primary text-primary-foreground text-xs uppercase tracking-widest px-3 py-1",
            isRtl ? "right-4" : "left-4"
          )}>
            {isRtl ? "جديد" : "New"}
          </span>
        )}
        {(product as Product & { outOfStock?: boolean }).outOfStock && (
          <span className={cn(
            "absolute top-4 bg-muted-foreground/90 text-white text-xs uppercase tracking-widest px-3 py-1",
            product.isNew ? (isRtl ? "right-4 mt-8" : "left-4 mt-8") : (isRtl ? "right-4" : "left-4")
          )}>
            {translations[lang].product.out_of_stock}
          </span>
        )}
        {!(product as Product & { outOfStock?: boolean }).outOfStock && (
          <Link href={`/product/${product.id}`}>
            <Button
              size="icon"
              className={cn(
                "absolute bottom-4 rounded-full bg-white text-black hover:bg-primary hover:text-white opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 shadow-lg",
                isRtl ? "left-4" : "right-4"
              )}
            >
              <Plus className="h-5 w-5" />
              <span className="sr-only">Add to cart</span>
            </Button>
          </Link>
        )}
      </div>
      <div className="mt-4 flex justify-between items-start">
        <div className={isRtl ? "text-right" : "text-left"}>
          <h3 className="text-lg font-serif font-medium text-foreground group-hover:text-primary transition-colors">
            <Link href={`/product/${product.id}`}>{name}</Link>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{category}</p>
        </div>
        <p className="text-lg font-medium text-primary whitespace-nowrap" data-testid={`text-price-${product.id}`}>{product.price} KWD</p>
      </div>
    </div>
  );
}
