import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Percent, Tag } from "lucide-react";

type Discount = {
  id: number;
  code: string;
  type: "percentage" | "amount";
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
};

const emptyForm = (): Partial<Discount> => ({
  code: "",
  type: "percentage",
  value: 0,
  minOrderAmount: null,
  maxUses: null,
  validFrom: null,
  validUntil: null,
  isActive: true,
});

export default function Discounts() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkLang = () => setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const t = translations[lang].admin;
  const isRtl = lang === "ar";

  const { data: discounts = [] } = useQuery<Discount[]>({
    queryKey: ["/api/discounts"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/discounts", {
        code: payload.code,
        type: payload.type,
        value: Number(payload.value) || 0,
        minOrderAmount: payload.minOrderAmount ? Number(payload.minOrderAmount) : null,
        maxUses: payload.maxUses ? Number(payload.maxUses) : null,
        validFrom: payload.validFrom || null,
        validUntil: payload.validUntil || null,
        isActive: payload.isActive ?? true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      toast({ title: "Discount created" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: typeof form }) => {
      const res = await apiRequest("PATCH", `/api/discounts/${id}`, {
        code: payload.code,
        type: payload.type,
        value: Number(payload.value) ?? 0,
        minOrderAmount: payload.minOrderAmount ? Number(payload.minOrderAmount) : null,
        maxUses: payload.maxUses ? Number(payload.maxUses) : null,
        validFrom: payload.validFrom || null,
        validUntil: payload.validUntil || null,
        isActive: payload.isActive ?? true,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      toast({ title: "Discount updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/discounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discounts"] });
      setDeleteTarget(null);
      toast({ title: "Discount deleted" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditing(d);
    setForm({
      code: d.code,
      type: d.type,
      value: d.value,
      minOrderAmount: d.minOrderAmount,
      maxUses: d.maxUses,
      validFrom: d.validFrom || "",
      validUntil: d.validUntil || "",
      isActive: d.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code?.trim()) {
      toast({ title: "Code is required", variant: "destructive" });
      return;
    }
    if (editing) updateMutation.mutate({ id: editing.id, payload: form });
    else createMutation.mutate(form);
  };

  const formatDiscount = (d: Discount) => {
    if (d.type === "percentage") return `${d.value}%`;
    return `${d.value.toFixed(3)} KWD`;
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">{t.discounts}</h1>
          <p className="text-gray-500">{t.manage_discounts}</p>
        </div>
        <Button className="bg-primary text-white hover:bg-primary/90" onClick={openAdd}>
          {t.add_discount}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(isRtl && "text-right")}>{t.discount_code}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.discount_type}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.discount_value}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.discount_min_order}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.discount_used} / {t.discount_max_uses}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.discount_active}</TableHead>
              <TableHead className={cn("text-right", isRtl && "text-left")}>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {t.no_discounts}
                </TableCell>
              </TableRow>
            )}
            {discounts.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono font-medium">{d.code}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1">
                    {d.type === "percentage" ? <Percent className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                    {d.type === "percentage" ? t.type_percentage : t.type_amount}
                  </span>
                </TableCell>
                <TableCell>{formatDiscount(d)}</TableCell>
                <TableCell>{d.minOrderAmount != null ? `${d.minOrderAmount} KWD` : "—"}</TableCell>
                <TableCell>{d.usedCount} / {d.maxUses ?? "∞"}</TableCell>
                <TableCell>{d.isActive ? (isRtl ? "نعم" : "Yes") : (isRtl ? "لا" : "No")}</TableCell>
                <TableCell className={cn("text-right", isRtl && "text-left")}>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => openEdit(d)}>{t.edit}</Button>
                    <Button variant="outline" size="sm" className="text-xs text-red-600" onClick={() => setDeleteTarget(d)}>{t.delete}</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn("max-w-xl rounded-none", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editing ? t.edit : t.add_discount}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t.discount_code}</Label>
              <Input
                value={form.code ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="rounded-none font-mono"
                placeholder="SAVE10"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.discount_type}</Label>
                <select
                  value={form.type ?? "percentage"}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percentage" | "amount" }))}
                  className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="percentage">{t.type_percentage}</option>
                  <option value="amount">{t.type_amount}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t.discount_value} {form.type === "percentage" ? "(%)" : "(KWD)"}</Label>
                <Input
                  type="number"
                  step={form.type === "percentage" ? 1 : 0.001}
                  min={0}
                  value={form.value ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                  className="rounded-none"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.discount_min_order} (optional)</Label>
                <Input
                  type="number"
                  step={0.001}
                  min={0}
                  value={form.minOrderAmount ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value ? parseFloat(e.target.value) : null }))}
                  className="rounded-none"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.discount_max_uses} (optional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.maxUses ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value ? parseInt(e.target.value, 10) : null }))}
                  className="rounded-none"
                  placeholder={isRtl ? "غير محدود" : "Unlimited"}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.discount_valid_from} (YYYY-MM-DD)</Label>
                <Input
                  type="date"
                  value={form.validFrom ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value || null }))}
                  className="rounded-none"
                />
              </div>
              <div className="space-y-2">
                <Label>{t.discount_valid_until} (YYYY-MM-DD)</Label>
                <Input
                  type="date"
                  value={form.validUntil ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value || null }))}
                  className="rounded-none"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={form.isActive ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: !!v }))} />
              <span>{t.discount_active}</span>
            </label>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">{t.cancel}</Button>
              <Button type="submit" className="rounded-none bg-primary text-white hover:bg-primary/90">
                {createMutation.isPending || updateMutation.isPending ? "..." : (editing ? t.edit : t.add_discount)}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none" dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl ? "هل أنت متأكد من حذف كود الخصم؟" : "Are you sure you want to delete this discount code?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">{t.cancel}</AlertDialogCancel>
            <AlertDialogAction className="rounded-none bg-red-600 hover:bg-red-700" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
              {deleteMutation.isPending ? "..." : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
