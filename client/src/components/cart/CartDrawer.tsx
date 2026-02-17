import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, X, Minus, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { useLocation } from "wouter";

export function CartDrawer() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const { items, removeItem, updateQuantity, subtotal, total } = useCart();
  const [, navigate] = useLocation();

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

  const t = translations[lang].cart;
  const isRtl = lang === "ar";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:text-accent transition-colors relative" data-testid="button-cart">
          <ShoppingBag className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
              {items.length}
            </span>
          )}
          <span className="sr-only">Cart</span>
        </Button>
      </SheetTrigger>
      <SheetContent side={isRtl ? "right" : "left"} className="w-full sm:max-w-md flex flex-col p-0 bg-background border-l border-border">
        <SheetHeader className="px-6 py-6 border-b border-border">
          <SheetTitle className="text-2xl font-serif">{t.title} ({items.length})</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground">{t.empty}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {items.map((item) => {
                const name = isRtl ? item.product.nameAr : item.product.name;
                return (
                  <div key={`${item.product.id}-${item.size}`} className="flex gap-4" data-testid={`cart-item-${item.product.id}`}>
                    <div className="h-24 w-20 flex-shrink-0 overflow-hidden bg-secondary/30">
                      <img src={item.product.images[0]} alt={name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div className={isRtl ? "text-right" : "text-left"}>
                          <h3 className="font-serif font-medium">{name}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{t.item_size}: {item.size}</p>
                        </div>
                        <button onClick={() => removeItem(item.product.id, item.size)} className="text-muted-foreground hover:text-destructive transition-colors" data-testid={`remove-item-${item.product.id}`}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center border border-border">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size)} className="p-1 hover:bg-secondary transition-colors">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs w-8 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.size)} className="p-1 hover:bg-secondary transition-colors">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="font-medium whitespace-nowrap">{item.product.price * item.quantity} KWD</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <SheetFooter className="p-6 border-t border-border bg-secondary/10 mt-auto">
            <div className="w-full space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.subtotal}</span>
                <span>{subtotal} KWD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.shipping}</span>
                <span>{isRtl ? "يتم احتسابه عند الدفع" : "Calculated at checkout"}</span>
              </div>
              <div className="flex justify-between text-lg font-serif font-medium pt-4 border-t border-border">
                <span>{t.total}</span>
                <span>{total} KWD</span>
              </div>
              <SheetClose asChild>
                <Button
                  onClick={() => navigate("/checkout")}
                  className="w-full h-12 uppercase tracking-widest rounded-none bg-primary text-white hover:bg-primary/90"
                  data-testid="button-checkout"
                >
                  {t.checkout}
                </Button>
              </SheetClose>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
