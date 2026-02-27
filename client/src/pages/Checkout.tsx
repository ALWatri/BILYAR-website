import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/lib/cart";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, ShoppingBag, Truck, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function Checkout() {
  const { items, subtotal, shippingCost, total, clearCart } = useCart();
  const [, navigate] = useLocation();
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [paymentMethod, setPaymentMethod] = useState<"myfatoorah" | "deema">("myfatoorah");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Kuwait",
  });

  useEffect(() => {
    const checkLang = () => {
      setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    };
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const t = translations[lang].checkout;
  const isRtl = lang === "ar";

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledged) return;
    await doSubmit();
  };

  const doSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const orderRes = await apiRequest("POST", "/api/orders", {
        customer: {
          name: form.fullName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          country: form.country,
        },
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          image: item.product.images[0],
          size: item.size,
          measurements: item.measurements,
          notes: item.notes,
        })),
        paymentMethod,
      });

      const order = await orderRes.json();

      const paymentEndpoint = paymentMethod === "myfatoorah"
        ? "/api/payment/myfatoorah/initiate"
        : "/api/payment/deema/initiate";

      const paymentRes = await apiRequest("POST", paymentEndpoint, {
        orderId: order.id,
      });

      const paymentData = await paymentRes.json();

      if (paymentData.demo) {
        clearCart();
        navigate(`/order/success?orderId=${order.id}&demo=true`);
        return;
      }

      if (paymentData.paymentUrl) {
        clearCart();
        window.location.href = paymentData.paymentUrl;
      } else {
        setError(paymentData.message || "Payment initiation failed");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center pt-24 pb-16 px-6 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-6" />
          <h1 className="text-3xl font-serif mb-3">{t.empty_cart}</h1>
          <Link href="/shop">
            <Button className="mt-6 h-12 px-8 uppercase tracking-widest bg-primary text-white hover:bg-primary/90" data-testid="button-go-shopping">
              {t.go_shopping}
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-28 pb-16 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center gap-3 mb-10">
            <Link href="/shop">
              <Button variant="ghost" size="icon" className="hover:bg-secondary" data-testid="button-back">
                {isRtl ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
              </Button>
            </Link>
            <h1 className="text-3xl md:text-4xl font-serif">{t.title}</h1>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
              <div className="lg:col-span-3 space-y-8">
                <div className="border border-border p-6 space-y-6">
                  <h2 className="text-xl font-serif border-b border-border pb-4">{t.shipping_info}</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t.full_name}</Label>
                      <Input
                        id="fullName"
                        value={form.fullName}
                        onChange={e => updateField("fullName", e.target.value)}
                        required
                        className="rounded-none"
                        data-testid="input-full-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t.email}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={e => updateField("email", e.target.value)}
                        required
                        className="rounded-none"
                        data-testid="input-email"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t.phone}</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={e => updateField("phone", e.target.value)}
                        required
                        className="rounded-none"
                        data-testid="input-phone"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">{t.address}</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={e => updateField("address", e.target.value)}
                      required
                      className="rounded-none"
                      data-testid="input-address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">{t.city}</Label>
                      <Input
                        id="city"
                        value={form.city}
                        onChange={e => updateField("city", e.target.value)}
                        required
                        className="rounded-none"
                        data-testid="input-city"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">{t.country}</Label>
                      <Input
                        id="country"
                        value={form.country}
                        onChange={e => updateField("country", e.target.value)}
                        required
                        className="rounded-none"
                        data-testid="input-country"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-border p-6 space-y-4">
                  <h2 className="text-xl font-serif border-b border-border pb-4">{t.payment_method}</h2>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("myfatoorah")}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 border transition-all text-left",
                      paymentMethod === "myfatoorah"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    )}
                    data-testid="payment-myfatoorah"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      paymentMethod === "myfatoorah" ? "border-primary" : "border-muted-foreground/40"
                    )}>
                      {paymentMethod === "myfatoorah" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{t.card_payment}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.card_desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <svg viewBox="0 0 50 32" className="h-8 w-auto" aria-label="Visa">
                        <rect width="50" height="32" rx="4" fill="#1A1F71"/>
                        <text x="25" y="21" textAnchor="middle" fill="#F7B600" fontSize="14" fontWeight="bold" fontFamily="Arial, sans-serif" fontStyle="italic">VISA</text>
                      </svg>
                      <svg viewBox="0 0 50 32" className="h-8 w-auto" aria-label="Mastercard">
                        <rect width="50" height="32" rx="4" fill="#000000"/>
                        <circle cx="20" cy="16" r="10" fill="#EB001B"/>
                        <circle cx="30" cy="16" r="10" fill="#F79E1B"/>
                        <path d="M25 8a10 10 0 0 1 0 16 10 10 0 0 1 0-16z" fill="#FF5F00"/>
                      </svg>
                      <img src="/images/knet-logo.png" alt="KNET Kuwait" className="h-8 w-auto object-contain" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("deema")}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 border transition-all text-left",
                      paymentMethod === "deema"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/40"
                    )}
                    data-testid="payment-deema"
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      paymentMethod === "deema" ? "border-primary" : "border-muted-foreground/40"
                    )}>
                      {paymentMethod === "deema" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{t.installments}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{t.installments_desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <img src="/images/deema-logo.png" alt="Deema" className="h-8 w-auto object-contain" />
                    </div>
                  </button>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive p-4 border border-destructive/20" data-testid="text-error">
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>{isRtl ? "دفع آمن" : "Secure Payment"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    <span>{t.free_shipping_note}</span>
                  </div>
                </div>

                <div className="border border-border p-6 space-y-4">
                  <h2 className="text-xl font-serif border-b border-border pb-4">{t.order_confirm_title}</h2>
                  <ol className="list-decimal list-inside space-y-3 text-sm text-foreground">
                    <li>{t.order_confirm_1}</li>
                    <li>{t.order_confirm_2}</li>
                  </ol>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={acknowledged}
                      onCheckedChange={(c) => setAcknowledged(!!c)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">{t.order_confirm_checkbox}</span>
                  </label>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="border border-border p-6 sticky top-28 space-y-6">
                  <h2 className="text-xl font-serif border-b border-border pb-4">{t.order_summary}</h2>

                  <div className="space-y-4">
                    {items.map(item => {
                      const name = isRtl ? item.product.nameAr : item.product.name;
                      return (
                        <div key={`${item.product.id}-${item.size}`} className="flex gap-3" data-testid={`checkout-item-${item.product.id}`}>
                          <div className="h-16 w-14 flex-shrink-0 overflow-hidden bg-secondary/30">
                            <img src={item.product.images[0]} alt={name} className="h-full w-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {isRtl ? "المقاس" : "Size"}: {item.size} | {isRtl ? "الكمية" : "Qty"}: {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-medium whitespace-nowrap">{(item.product.price * item.quantity).toFixed(3)} KWD</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.subtotal}</span>
                      <span>{subtotal.toFixed(3)} KWD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.shipping}</span>
                      <span className={shippingCost === 0 ? "text-green-600 font-medium" : ""}>
                        {shippingCost === 0 ? t.free : `${shippingCost.toFixed(3)} KWD`}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-serif font-bold pt-3 border-t border-border">
                      <span>{t.total}</span>
                      <span>{total.toFixed(3)} KWD</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !acknowledged}
                    className="w-full h-14 uppercase tracking-widest text-sm bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                    data-testid="button-place-order"
                  >
                    {isSubmitting ? t.processing : t.place_order}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
