import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { translations } from "@/lib/translations";
import { XCircle } from "lucide-react";

export default function OrderFailed() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const orderId = params.get("orderId");

  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const checkLang = () => setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const t = translations[lang].order_confirmation;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-24 pb-16 px-6">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-red-100 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-serif" data-testid="text-failed-title">{t.failed_title}</h1>
            <p className="text-muted-foreground max-w-sm mx-auto">{t.failed_desc}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/checkout">
              <Button className="h-12 px-8 uppercase tracking-widest bg-primary text-white hover:bg-primary/90" data-testid="button-try-again">
                {t.try_again}
              </Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" className="h-12 px-8 uppercase tracking-widest border-primary text-primary hover:bg-primary hover:text-white" data-testid="button-continue-shopping">
                {t.continue_shopping}
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
