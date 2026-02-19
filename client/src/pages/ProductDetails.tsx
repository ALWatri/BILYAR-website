import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { useRoute } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Truck, ShieldCheck, Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/data";

export default function ProductDetails() {
  const [, params] = useRoute("/product/:id");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem } = useCart();
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const measurementRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${params?.id}`],
    enabled: !!params?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">Product not found</div>
      <Footer />
    </div>
  );

  const t = translations[lang].product;
  const isRtl = lang === "ar";
  const name = isRtl ? product.nameAr : product.name;
  const description = isRtl ? product.descriptionAr : product.description;
  const stockBySize = (product as Product & { stockBySize?: Record<string, number> | null }).stockBySize;
  const sizesWithStock = stockBySize && typeof stockBySize === "object"
    ? Object.entries(stockBySize).filter(([, q]) => Number(q) > 0).map(([s]) => s)
    : [];
  const showSizes = sizesWithStock.length > 0;
  const outOfStock = (product as Product & { outOfStock?: boolean }).outOfStock ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="pt-24 pb-12 container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="grid grid-cols-2 gap-4">
            {product.images.map((img, idx) => (
              <img 
                key={idx} 
                src={img} 
                alt={`${name} ${idx + 1}`} 
                className={`w-full object-cover ${idx === 0 ? "col-span-2 aspect-[3/4]" : "aspect-[3/4]"}`}
              />
            ))}
          </div>

          <div className="sticky top-24 h-fit">
            <div className={cn("mb-8", isRtl ? "text-right" : "text-left")}>
              <h1 className="text-4xl font-serif mb-2" data-testid="text-product-name">{name}</h1>
              <p className="text-2xl text-primary font-medium" data-testid="text-product-price">{product.price} KWD</p>
            </div>

            <div className="space-y-8 mb-12">
              <p className={cn("text-muted-foreground leading-relaxed", isRtl ? "text-right" : "text-left")}>
                {description}
              </p>

              {showSizes && (
              <div>
                <div className="flex justify-between mb-4">
                  <span className="text-sm font-medium uppercase tracking-wide">{t.size}</span>
                  <button className="text-sm text-muted-foreground underline">{t.guide}</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {sizesWithStock.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      data-testid={`button-size-${size}`}
                      className={`h-12 border transition-all ${
                        selectedSize === size 
                          ? "border-primary bg-primary text-primary-foreground" 
                          : "border-input hover:border-primary"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

              <div className="space-y-6 pt-6 border-t border-border">
                <h3 className={cn("text-sm font-bold uppercase tracking-widest", isRtl ? "text-right" : "text-left")}>
                  {t.custom_measurements}
                </h3>
                
                {product.hasShirt && (
                  <div className="space-y-4">
                    <h4 className={cn("text-xs font-medium text-muted-foreground uppercase tracking-widest", isRtl ? "text-right" : "text-left")}>
                      {t.shirt_measurements}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.length}</Label>
                        <Input ref={el => { measurementRefs.current["shirtLength"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-shirt-length" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.shoulder}</Label>
                        <Input ref={el => { measurementRefs.current["shirtShoulder"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-shirt-shoulder" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.sleeve_length}</Label>
                        <Input ref={el => { measurementRefs.current["shirtSleeve"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-shirt-sleeve" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.armhole}</Label>
                        <Input ref={el => { measurementRefs.current["shirtArmhole"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-shirt-armhole" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.chest}</Label>
                        <Input ref={el => { measurementRefs.current["shirtChest"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-shirt-chest" />
                      </div>
                    </div>
                  </div>
                )}

                {product.hasTrouser && (
                  <div className="space-y-4 pt-4">
                    <h4 className={cn("text-xs font-medium text-muted-foreground uppercase tracking-widest", isRtl ? "text-right" : "text-left")}>
                      {t.trouser_measurements}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.waist}</Label>
                        <Input ref={el => { measurementRefs.current["trouserWaist"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-trouser-waist" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.hip_width}</Label>
                        <Input ref={el => { measurementRefs.current["trouserHip"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-trouser-hip" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.thigh_width}</Label>
                        <Input ref={el => { measurementRefs.current["trouserThigh"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-trouser-thigh" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.knee_width}</Label>
                        <Input ref={el => { measurementRefs.current["trouserKnee"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-trouser-knee" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.leg_opening}</Label>
                        <Input ref={el => { measurementRefs.current["trouserLeg"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-trouser-leg" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase">{t.length}</Label>
                        <Input ref={el => { measurementRefs.current["trouserLength"] = el; }} className="rounded-none h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0" type="number" step="0.1" data-testid="input-trouser-length" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4">
                  <Label className="text-xs font-bold uppercase tracking-widest block">{t.notes}</Label>
                  <textarea 
                    ref={notesRef}
                    className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none h-24 text-sm rounded-none" 
                    placeholder={t.notes_placeholder}
                    data-testid="input-notes"
                  />
                </div>
              </div>

              {outOfStock ? (
              <div className="w-full h-14 flex items-center justify-center border border-border bg-muted/30 text-muted-foreground uppercase tracking-widest text-sm">
                {t.out_of_stock}
              </div>
            ) : (
              <Button 
                size="lg" 
                className={cn(
                  "w-full h-14 text-lg uppercase tracking-widest rounded-none transition-all",
                  addedToCart && "bg-green-700 hover:bg-green-700"
                )}
                disabled={showSizes && !selectedSize}
                onClick={() => {
                  if (!product) return;
                  if (showSizes && !selectedSize) return;
                  const measurements: Record<string, string> = {};
                  Object.entries(measurementRefs.current).forEach(([key, el]) => {
                    if (el && el.value) measurements[key] = el.value;
                  });
                  addItem({
                    product,
                    quantity: 1,
                    size: showSizes ? (selectedSize ?? "") : t.one_size,
                    measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
                    notes: notesRef.current?.value || undefined,
                  });
                  setAddedToCart(true);
                  setTimeout(() => setAddedToCart(false), 2000);
                }}
                data-testid="button-add-to-cart"
              >
                {addedToCart ? (
                  <span className="flex items-center gap-2"><Check className="h-5 w-5" /> {isRtl ? "تمت الإضافة" : "Added!"}</span>
                ) : (
                  t.add_to_cart
                )}
              </Button>
            )}

              <div className="grid grid-cols-2 gap-4 text-center py-6 border-y border-border">
                <div className="flex flex-col items-center gap-2">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{t.free_shipping}</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{t.secure_checkout}</span>
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="details">
                  <AccordionTrigger className="font-serif text-lg">{t.details}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    <ul className={cn("list-disc space-y-2", isRtl ? "pr-5" : "pl-5")}>
                      <li>{isRtl ? "قماش إيطالي فاخر" : "Premium Italian fabric"}</li>
                      <li>{isRtl ? "درزات منسقة يدوياً" : "Hand-finished seams"}</li>
                      <li>{isRtl ? "إنتاج مستدام" : "Sustainable production"}</li>
                      <li>{isRtl ? "تنظيف جاف فقط" : "Dry clean only"}</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="shipping">
                  <AccordionTrigger className="font-serif text-lg">{t.shipping_returns}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {t.delivery_policy}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
