import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/ui/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, SlidersHorizontal, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@/lib/data";

export default function Shop() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

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

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", searchQuery],
    queryFn: async () => {
      const url = searchQuery.trim()
        ? `/api/products?q=${encodeURIComponent(searchQuery.trim())}`
        : "/api/products";
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
  });

  const t = translations[lang].shop;
  const isRtl = lang === "ar";

  const categories = isRtl 
    ? ["الكل", "فساتين", "ملابس خارجية", "إكسسوارات", "أطقم", "قمصان"]
    : ["All", "Dresses", "Outerwear", "Accessories", "Sets", "Tops"];

  const catMap: Record<string, string> = isRtl ? {
    "الكل": "All",
    "فساتين": "Dresses",
    "ملابس خارجية": "Outerwear",
    "إكسسوارات": "Accessories",
    "أطقم": "Sets",
    "قمصان": "Tops"
  } : {
    "All": "All",
    "Dresses": "Dresses",
    "Outerwear": "Outerwear",
    "Accessories": "Accessories",
    "Sets": "Sets",
    "Tops": "Tops"
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="pt-32 pb-12 bg-secondary/30">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-serif mb-4" data-testid="text-shop-title">{t.title}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">{t.subtitle}</p>
        </div>
      </div>

      <div className="border-b border-border sticky top-[72px] bg-background/95 backdrop-blur z-40">
        <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className={cn("absolute h-4 w-4 text-muted-foreground top-1/2 -translate-y-1/2", isRtl ? "right-3" : "left-3")} />
              <Input
                type="search"
                placeholder={t.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("rounded-none", isRtl ? "pr-9 pl-4" : "pl-9 pr-4")}
                aria-label={t.search}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(catMap[cat])}
                data-testid={`button-filter-${catMap[cat]}`}
                className={`px-4 py-2 text-sm uppercase tracking-wider transition-colors whitespace-nowrap ${
                  (filter === catMap[cat]) 
                    ? "text-primary font-bold border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
             <Button variant="outline" size="sm" className="hidden md:flex gap-2 rounded-none border-border">
              <SlidersHorizontal className="h-4 w-4" /> {t.filter}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 uppercase text-xs font-bold tracking-widest">
                  {t.sort} <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRtl ? "start" : "end"} className="w-48 rounded-none">
                <DropdownMenuItem>Newest Arrivals</DropdownMenuItem>
                <DropdownMenuItem>Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem>Price: High to Low</DropdownMenuItem>
                <DropdownMenuItem>Best Sellers</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {products
            .filter(p => filter === "All" || p.category === filter)
            .map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
        </div>
        {products.filter(p => filter === "All" || p.category === filter).length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t.search_no_results}</p>
        )}
      </div>

      <Footer />
    </div>
  );
}
