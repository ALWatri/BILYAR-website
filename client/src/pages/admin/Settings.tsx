import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, CreditCard, Truck, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StoreSettingsResp {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  currency: string;
  freeShippingThreshold: number;
  defaultShippingCost: number;
}

export default function Settings() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkLang = () => {
      setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    };
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const { data: paymentStatus } = useQuery<{ myfatoorah: boolean; deema: boolean }>({
    queryKey: ["/api/payment/status"],
  });

  const { data: savedSettings } = useQuery<StoreSettingsResp>({
    queryKey: ["/api/settings"],
  });

  const [storeSettings, setStoreSettings] = useState({
    storeName: "BILYAR",
    storeEmail: "info@bilyar.com",
    storePhone: "+965 1234 5678",
    currency: "KWD",
    freeShippingThreshold: "90",
    defaultShippingCost: "5",
  });

  useEffect(() => {
    if (savedSettings) {
      setStoreSettings({
        storeName: savedSettings.storeName,
        storeEmail: savedSettings.storeEmail,
        storePhone: savedSettings.storePhone,
        currency: savedSettings.currency,
        freeShippingThreshold: String(savedSettings.freeShippingThreshold),
        defaultShippingCost: String(savedSettings.defaultShippingCost),
      });
    }
  }, [savedSettings]);

  const t = translations[lang].admin;
  const isRtl = lang === "ar";

  const saveMutation = useMutation({
    mutationFn: async (payload: StoreSettingsResp) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: t.settings_saved, duration: 2000 });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      storeName: storeSettings.storeName,
      storeEmail: storeSettings.storeEmail,
      storePhone: storeSettings.storePhone,
      currency: storeSettings.currency,
      freeShippingThreshold: parseFloat(storeSettings.freeShippingThreshold) || 90,
      defaultShippingCost: parseFloat(storeSettings.defaultShippingCost) || 5,
    });
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center gap-3">
        <SettingsIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900" data-testid="text-settings-title">{t.store_settings}</h1>
        </div>
      </div>

      <div className="grid gap-6 max-w-3xl">
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              {t.general_settings}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.store_name}</Label>
                <Input
                  value={storeSettings.storeName}
                  onChange={e => setStoreSettings(s => ({ ...s, storeName: e.target.value }))}
                  className="rounded-none"
                  data-testid="input-store-name"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.store_email}</Label>
                <Input
                  value={storeSettings.storeEmail}
                  onChange={e => setStoreSettings(s => ({ ...s, storeEmail: e.target.value }))}
                  className="rounded-none"
                  data-testid="input-store-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.store_phone}</Label>
                <Input
                  value={storeSettings.storePhone}
                  onChange={e => setStoreSettings(s => ({ ...s, storePhone: e.target.value }))}
                  className="rounded-none"
                  data-testid="input-store-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.store_currency}</Label>
                <Input
                  value={storeSettings.currency}
                  disabled
                  className="rounded-none bg-gray-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {t.payment_settings}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-50 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">{t.myfatoorah_status}</p>
                  <p className="text-sm text-gray-500">{isRtl ? "بطاقة / كي نت" : "Card / KNET"}</p>
                </div>
              </div>
              <Badge variant="outline" className={cn(
                "rounded-sm gap-1",
                paymentStatus?.myfatoorah 
                  ? "bg-green-100 text-green-800 border-green-200" 
                  : "bg-red-100 text-red-800 border-red-200"
              )}>
                {paymentStatus?.myfatoorah ? (
                  <><CheckCircle className="h-3 w-3" /> {t.connected}</>
                ) : (
                  <><XCircle className="h-3 w-3" /> {t.not_connected}</>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-purple-50 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">{t.deema_status}</p>
                  <p className="text-sm text-gray-500">{isRtl ? "الدفع بالتقسيط" : "Buy Now Pay Later"}</p>
                </div>
              </div>
              <Badge variant="outline" className={cn(
                "rounded-sm gap-1",
                paymentStatus?.deema 
                  ? "bg-green-100 text-green-800 border-green-200" 
                  : "bg-red-100 text-red-800 border-red-200"
              )}>
                {paymentStatus?.deema ? (
                  <><CheckCircle className="h-3 w-3" /> {t.connected}</>
                ) : (
                  <><XCircle className="h-3 w-3" /> {t.not_connected}</>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {t.shipping_settings}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.free_shipping_threshold}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={storeSettings.freeShippingThreshold}
                    onChange={e => setStoreSettings(s => ({ ...s, freeShippingThreshold: e.target.value }))}
                    className="rounded-none pr-16"
                    data-testid="input-free-shipping"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">KWD</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t.default_shipping_cost}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={storeSettings.defaultShippingCost}
                    onChange={e => setStoreSettings(s => ({ ...s, defaultShippingCost: e.target.value }))}
                    className="rounded-none pr-16"
                    data-testid="input-default-shipping"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">KWD</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-12 px-8 bg-primary text-white hover:bg-primary/90 uppercase tracking-widest text-sm"
            data-testid="button-save-settings"
          >
            {saveMutation.isPending ? "..." : t.save_settings}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
