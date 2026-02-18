import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { translations } from "@/lib/translations";
import { CheckCircle, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { OrderWithItems } from "@/lib/data";

export default function OrderSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const orderId = params.get("orderId");
  const isDemo = params.get("demo") === "true";

  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const checkLang = () => setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const t = translations[lang].order_confirmation;
  const isRtl = lang === "ar";

  const { data: order } = useQuery<OrderWithItems>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-24 pb-16 px-6">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-serif" data-testid="text-success-title">{t.success_title}</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">{t.success_desc}</p>
          </div>

          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 rounded-md">
              {t.demo_banner}
            </div>
          )}

          {order && (
            <div className="border border-border p-6 space-y-4 text-left">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">{t.order_number}</p>
                  <p className="font-serif font-bold text-lg" data-testid="text-order-number">{order.orderNumber}</p>
                </div>
              </div>

              <div className="space-y-2">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.productName} x{item.quantity}</span>
                    <span className="font-medium">{(item.price * item.quantity).toFixed(3)} KWD</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-border flex justify-between font-serif font-bold">
                <span>{isRtl ? "الإجمالي" : "Total"}</span>
                <span>{order.total.toFixed(3)} KWD</span>
              </div>
            </div>
          )}

          <Link href="/shop">
            <Button className="h-12 px-10 uppercase tracking-widest bg-primary text-white hover:bg-primary/90" data-testid="button-continue-shopping">
              {t.continue_shopping}
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
