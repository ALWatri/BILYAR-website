import { useEffect, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Category } from "@/lib/data";
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

const emptyForm = () => ({
  name: "",
  nameAr: "",
  isActive: true,
});

export default function Categories() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
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

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: typeof form }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      nameAr: c.nameAr,
      isActive: (c as Category & { isActive?: boolean }).isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, payload: form });
    else createMutation.mutate(form);
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">{t.categories}</h1>
          <p className="text-gray-500">{isRtl ? "إدارة الفئات المستخدمة في المتجر." : "Manage categories used across the store."}</p>
        </div>
        <Button className="bg-primary text-white hover:bg-primary/90" onClick={openAdd}>
          {isRtl ? "إضافة فئة" : "Add Category"}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(isRtl && "text-right")}>{isRtl ? "الاسم" : "Name"}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{isRtl ? "الاسم (عربي)" : "Arabic name"}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{isRtl ? "نشط" : "Active"}</TableHead>
              <TableHead className={cn("text-right", isRtl && "text-left")}>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  {isRtl ? "لا توجد فئات بعد" : "No categories yet"}
                </TableCell>
              </TableRow>
            )}
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.nameAr}</TableCell>
                <TableCell>{(c as Category & { isActive?: boolean }).isActive === false ? (isRtl ? "لا" : "No") : (isRtl ? "نعم" : "Yes")}</TableCell>
                <TableCell className={cn("text-right", isRtl && "text-left")}>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => openEdit(c)}>{t.edit}</Button>
                    <Button variant="outline" size="sm" className="text-xs text-red-600" onClick={() => setDeleteTarget(c)}>{t.delete}</Button>
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
            <DialogTitle>{editing ? t.edit : (isRtl ? "إضافة فئة" : "Add Category")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{isRtl ? "الاسم" : "Name"}</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-none" required />
            </div>
            <div className="space-y-2">
              <Label>{isRtl ? "الاسم (عربي)" : "Arabic name"}</Label>
              <Input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="rounded-none" required />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: !!v }))} />
              <span>{isRtl ? "نشط" : "Active"}</span>
            </label>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">{t.cancel}</Button>
              <Button type="submit" className="rounded-none bg-primary text-white hover:bg-primary/90">{t.save_settings}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none" dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete}</AlertDialogTitle>
            <AlertDialogDescription>
              {isRtl ? "هل أنت متأكد أنك تريد حذف هذه الفئة؟" : "Are you sure you want to delete this category?"}
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

