import { Link, useLocation } from "wouter";
import { Menu, Search, User, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { translations } from "@/lib/translations";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [location] = useLocation();
  const [lang, setLang] = useState<"en" | "ar">(() => {
    return (localStorage.getItem("lang") as "en" | "ar") || "en";
  });

  const t = translations[lang].nav;
  const isRtl = lang === "ar";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    localStorage.setItem("lang", lang);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lang, isRtl]);

  const toggleLang = () => setLang(l => l === "en" ? "ar" : "en");

  const isHome = location === "/";
  const textColor = isHome && !isScrolled ? "text-primary-foreground" : "text-foreground";
  const bgColor = isScrolled || !isHome ? "bg-background/95 backdrop-blur-md border-b" : "bg-transparent";
  const mobileMenuColor = isHome && !isScrolled ? "text-white" : "text-foreground";

  return (
    <header className={cn("fixed top-0 w-full z-50 transition-all duration-300 ease-in-out py-4", bgColor)}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("md:hidden", mobileMenuColor)}>
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side={isRtl ? "right" : "left"} className="bg-background w-[300px] flex flex-col">
              <nav className="flex flex-col gap-6 mt-10 flex-1">
                <Link href="/" className="text-2xl font-serif text-primary hover:text-accent transition-colors">{t.home}</Link>
                <Link href="/shop" className="text-2xl font-serif text-primary hover:text-accent transition-colors">{t.shop}</Link>
                <Link href="/collections" className="text-2xl font-serif text-primary hover:text-accent transition-colors">{t.collections}</Link>
                <Link href="/about" className="text-2xl font-serif text-primary hover:text-accent transition-colors">{t.about}</Link>
                <Link href="/contact" className="text-2xl font-serif text-primary hover:text-accent transition-colors">{t.contact}</Link>
              </nav>
              
              <div className="pt-6 border-t border-border">
                <Button 
                  onClick={toggleLang} 
                  variant="outline" 
                  className="w-full flex justify-between items-center h-12 rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase text-xs font-bold tracking-widest"
                >
                  <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> {lang === "en" ? "Language" : "اللغة"}</span>
                  <span>{lang === "en" ? "عربي" : "English"}</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/shop" className={cn("text-sm uppercase tracking-widest hover:text-accent transition-colors", textColor)}>
              {t.shop}
            </Link>
            <Link href="/collections" className={cn("text-sm uppercase tracking-widest hover:text-accent transition-colors", textColor)}>
              {t.collections}
            </Link>
          </nav>
        </div>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <h1 
            className={cn(
              "text-3xl md:text-4xl font-serif font-bold tracking-tighter transition-colors duration-300 flex items-center", 
              textColor
            )} 
            style={{ fontFamily: "var(--font-rigot, 'Playfair Display'), serif", direction: "ltr" }}
          >
            BILYAR.
          </h1>
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          <Button onClick={toggleLang} variant="ghost" size="sm" className={cn("hidden md:flex gap-2 uppercase text-[10px] font-bold tracking-widest", textColor)}>
            <Globe className="h-4 w-4" /> {lang === "en" ? "عربي" : "EN"}
          </Button>
          <Button variant="ghost" size="icon" className={cn("hover:text-accent transition-colors", textColor)}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className={cn("hidden md:inline-flex hover:text-accent transition-colors", textColor)}>
            <User className="h-5 w-5" />
          </Button>
          <div className={cn("hover:text-accent transition-colors", textColor)}>
            <CartDrawer />
          </div>
        </div>
      </div>
    </header>
  );
}
