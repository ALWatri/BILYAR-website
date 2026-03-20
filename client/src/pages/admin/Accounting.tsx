import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Package, Truck, TrendingUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TopProduct = {
  productId: number;
  name: string;
  revenue: number;
  cost: number;
  profit: number;
  qty: number;
};

type DeliveryExpense = {
  id: number;
  periodStart: string;
  periodEnd: string;
  amount: number;
  note: string | null;
  createdAt: string;
};

type Summary = {
  revenue: number;
  cost: number;
  netProfit: number;
  grossMarginPct: number;
  profitAfterDelivery: number;
  discountsGiven: number;
  deliveryFeesCollected: number;
  deliveryExpensesDeclared: number;
  totalOrders: number;
  averageItemsPerOrder: number;
  averageOrderValue: number;
  totalItemsSold: number;
  topProductsByProfit: TopProduct[];
};

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0.000";
  return n.toFixed(3);
}

function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
}

export default function Accounting() {
  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const checkLang = () => setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const isRtl = lang === "ar";
  const currency = translations[lang].currency;

  const { data } = useQuery<Summary>({
    queryKey: ["/api/accounting/summary"],
  });

  const s = useMemo<Summary>(() => ({
    revenue: data?.revenue ?? 0,
    cost: data?.cost ?? 0,
    netProfit: data?.netProfit ?? 0,
    grossMarginPct: data?.grossMarginPct ?? 0,
    profitAfterDelivery: data?.profitAfterDelivery ?? 0,
    discountsGiven: data?.discountsGiven ?? 0,
    deliveryFeesCollected: data?.deliveryFeesCollected ?? 0,
    deliveryExpensesDeclared: data?.deliveryExpensesDeclared ?? 0,
    totalOrders: data?.totalOrders ?? 0,
    averageItemsPerOrder: data?.averageItemsPerOrder ?? 0,
    averageOrderValue: data?.averageOrderValue ?? 0,
    totalItemsSold: data?.totalItemsSold ?? 0,
    topProductsByProfit: data?.topProductsByProfit ?? [],
  }), [data]);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: expenses = [] } = useQuery<DeliveryExpense[]>({ queryKey: ["/api/delivery-expenses"] });

  const [form, setForm] = useState({ periodStart: "", periodEnd: "", amount: "", note: "" });
  const addMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      if (!form.periodStart || !form.periodEnd || isNaN(amount) || amount < 0) {
        throw new Error(isRtl ? "يرجى إدخال الفترة والمبلغ" : "Please enter period and amount");
      }
      await apiRequest("POST", "/api/delivery-expenses", {
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        amount,
        note: form.note.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      setForm({ periodStart: "", periodEnd: "", amount: "", note: "" });
      toast({ title: isRtl ? "تمت الإضافة" : "Added" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/delivery-expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/delivery-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/summary"] });
      toast({ title: isRtl ? "تم الحذف" : "Deleted" });
    },
  });

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Accounting</h1>
          <p className="text-gray-500">
            {isRtl ? "ملخص مالي للطلبات المدفوعة." : "Financial summary for paid orders."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {isRtl ? "الإيرادات" : "Revenue"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {fmt(s.revenue)} <span className="text-base font-normal text-muted-foreground">{currency}</span>
          </CardContent>
        </Card>

        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {isRtl ? "التكلفة (COGS)" : "Cost (COGS)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {fmt(s.cost)} <span className="text-base font-normal text-muted-foreground">{currency}</span>
          </CardContent>
        </Card>

        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {isRtl ? "صافي الربح" : "Net Profit"}
            </CardTitle>
          </CardHeader>
          <CardContent className={cn("text-3xl font-semibold", s.netProfit < 0 ? "text-red-600" : "text-emerald-700")}>
            {fmt(s.netProfit)} <span className="text-base font-normal text-muted-foreground">{currency}</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-6">
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {isRtl ? "رسوم التوصيل المُحصّلة" : "Delivery fees collected"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fmt(s.deliveryFeesCollected)} <span className="text-base font-normal text-muted-foreground">{currency}</span>
          </CardContent>
        </Card>

        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {isRtl ? "تكاليف التوصيل المُعلنة" : "Delivery expenses (declared)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fmt(s.deliveryExpensesDeclared)} <span className="text-base font-normal text-muted-foreground">{currency}</span>
          </CardContent>
        </Card>

        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "عدد الطلبات" : "Total orders"}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {s.totalOrders}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-6">
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "هامش الربح الإجمالي" : "Gross margin"}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fmtPct(s.grossMarginPct)}
          </CardContent>
        </Card>
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "الخصومات" : "Discounts given"}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fmt(s.discountsGiven)} <span className="text-base font-normal text-muted-foreground">{currency}</span>
          </CardContent>
        </Card>
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "الربح بعد التوصيل" : "Profit after delivery"}</CardTitle>
          </CardHeader>
          <CardContent className={cn("text-2xl font-semibold", s.profitAfterDelivery < 0 ? "text-red-600" : "text-emerald-700")}>
            {fmt(s.profitAfterDelivery)} <span className="text-base font-normal text-muted-foreground">{currency}</span>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "إعلان تكاليف التوصيل حسب الفترة" : "Declare delivery expenses by period"}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isRtl ? "أضف التكلفة الإجمالية للتوصيل لفترة معينة (مثلاً أسبوع أو 5 أيام). تُخصم من صافي الربح." : "Add total delivery cost for a period (e.g. a week or 5 days). Deducted from net profit."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-5", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
              <div className="space-y-2">
                <Label>{isRtl ? "من تاريخ" : "From"}</Label>
                <Input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                  className="rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "إلى تاريخ" : "To"}</Label>
                <Input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                  className="rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "المبلغ" : "Amount"} ({currency})</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="60"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "ملاحظة" : "Note"} ({isRtl ? "اختياري" : "optional"})</Label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder={isRtl ? "مثال: أسبوع ١" : "e.g. Week 1"}
                  className="rounded-none"
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="rounded-none bg-primary text-white hover:bg-primary/90 gap-1"
                  onClick={() => addMutation.mutate()}
                  disabled={addMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  {addMutation.isPending ? "..." : isRtl ? "إضافة" : "Add"}
                </Button>
              </div>
            </div>
            {expenses.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mt-4">
                <p className="text-sm font-medium mb-2">{isRtl ? "السجلات" : "Entries"}</p>
                <div className="space-y-2">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-50">
                      <span className="text-sm">
                        {e.periodStart} → {e.periodEnd}
                        {e.note ? ` (${e.note})` : ""}: {fmt(e.amount)} {currency}
                      </span>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteMutation.mutate(e.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "أفضل المنتجات حسب الربح" : "Top products by profit"}</CardTitle>
          </CardHeader>
          <CardContent>
            {s.topProductsByProfit.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isRtl ? "لا توجد بيانات بعد." : "No data yet."}</p>
            ) : (
              <div className="space-y-3">
                {s.topProductsByProfit.slice(0, 8).map((p) => (
                  <div key={p.productId} className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2">
                    <div className={cn("min-w-0", isRtl ? "text-right" : "text-left")}>
                      <p className="font-medium truncate">{p.name || `#${p.productId}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {isRtl ? "الكمية" : "Qty"}: {p.qty} • {isRtl ? "الإيراد" : "Revenue"}: {fmt(p.revenue)} {currency}
                      </p>
                    </div>
                    <div className={cn("text-right", isRtl && "text-left")}>
                      <p className={cn("font-semibold", p.profit < 0 ? "text-red-600" : "text-emerald-700")}>
                        {fmt(p.profit)} {currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isRtl ? "التكلفة" : "Cost"}: {fmt(p.cost)} {currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-6">
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "متوسط عدد القطع لكل طلب" : "Avg items per order"}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {s.averageItemsPerOrder.toFixed(2)}
          </CardContent>
        </Card>
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "متوسط قيمة الطلب" : "Avg order value"}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {fmt(s.averageOrderValue)} <span className="text-base font-normal text-muted-foreground">{currency}</span>
          </CardContent>
        </Card>
        <Card className="rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{isRtl ? "إجمالي القطع المباعة" : "Total items sold"}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {s.totalItemsSold}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

