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
import { useState, useEffect, useMemo } from "react";
import { useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { useQuery } from "@tanstack/react-query";
import type { Category, Product } from "@/lib/data";

const CAT_MAP: Record<string, string> = { dresses: "Dresses", outerwear: "Outerwear", accessories: "Accessories", sets: "Sets", tops: "Tops" };
type SortKey = "newest" | "price-asc" | "price-desc" | "bestseller";

export default function Shop() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const catParam = params.get("cat")?.toLowerCase();
  const initialFilter = catParam && CAT_MAP[catParam] ? CAT_MAP[catParam] : "All";

  const [lang, setLang] = useState<"en" | "ar">("en");
  const [filter, setFilter] = useState(initialFilter);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
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

  useEffect(() => {
    const f = catParam && CAT_MAP[catParam] ? CAT_MAP[catParam] : "All";
    setFilter(f);
  }, [catParam]);

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

  const { data: apiCategories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const categoryOptions = [
    { label: isRtl ? "الكل" : "All", value: "All" },
    ...apiCategories
      .filter((c: any) => c.isActive !== false)
      .map((c) => ({ label: isRtl ? c.nameAr : c.name, value: c.name })),
  ];

  const filteredProducts = useMemo(() => {
    const list = products.filter((p) => filter === "All" || (p.category && p.category.toLowerCase() === filter.toLowerCase()));
    if (sortBy === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    if (sortBy === "newest") return [...list].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return list;
  }, [products, filter, sortBy]);

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
            {categoryOptions.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                data-testid={`button-filter-${cat.value}`}
                className={`px-4 py-2 text-sm uppercase tracking-wider transition-colors whitespace-nowrap ${
                  (filter === cat.value) 
                    ? "text-primary font-bold border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {cat.label}
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
                <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest Arrivals</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("price-asc")}>Price: Low to High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("price-desc")}>Price: High to Low</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        {filteredProducts.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{t.search_no_results}</p>
        )}
      </div>

      <Footer />
    </div>
  );
}
