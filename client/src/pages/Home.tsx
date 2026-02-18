import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/lib/data";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { translations } from "@/lib/translations";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export default function Home() {
  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const checkLang = () => {
      const currentLang = (localStorage.getItem("lang") as "en" | "ar") || "en";
      setLang(currentLang);
    };
    checkLang();
    window.addEventListener("storage", checkLang);
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => {
      window.removeEventListener("storage", checkLang);
      observer.disconnect();
    };
  }, []);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const t = translations[lang].home;
  const isRtl = lang === "ar";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/30 z-10" />
        <img 
          src="/images/hero-main.png" 
          alt="BILYAR Collection" 
          className="absolute inset-0 h-full w-full object-cover object-top animate-ken-burns"
        />
        <div className="relative z-20 h-full container mx-auto px-6 flex flex-col justify-center items-center text-center text-white">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="uppercase tracking-[0.3em] text-sm md:text-base mb-6 font-medium text-accent"
          >
            Spring / Summer 2026
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-9xl font-serif font-medium mb-8 leading-tight"
          >
            {t.hero}
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col md:flex-row gap-6"
          >
            <Button size="lg" className="bg-white text-black hover:bg-accent hover:text-white border-0 text-xs md:text-sm uppercase tracking-widest px-8 py-6 rounded-none min-w-[200px]">
              {t.shop_now}
            </Button>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-6">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-accent uppercase tracking-widest text-xs font-bold block mb-2">{t.most_desired}</span>
              <h2 className="text-3xl md:text-5xl font-serif">{t.best_sellers}</h2>
            </div>
            <Link href="/shop" className="hidden md:flex items-center gap-2 text-primary hover:text-accent transition-colors uppercase text-xs font-bold tracking-widest">
              {t.view_all} <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      <section className="py-32 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-accent/5 -skew-x-12 translate-x-1/2" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Star className="h-8 w-8 text-accent mx-auto mb-8" />
            <h2 className="text-4xl md:text-6xl font-serif mb-8 leading-tight">{t.heritage_quote}</h2>
            <p className="text-lg md:text-xl text-primary-foreground/80 font-light leading-relaxed mb-12">{t.heritage_desc}</p>
            <Button variant="outline" className="text-accent border-accent hover:bg-accent hover:text-primary uppercase tracking-widest px-10 py-6 rounded-none">
              Read Our Story
            </Button>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
