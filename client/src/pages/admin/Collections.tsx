import { useEffect, useRef, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Collection } from "@/lib/data";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Upload } from "lucide-react";

const emptyForm = () => ({
  title: "",
  titleAr: "",
  description: "",
  descriptionAr: "",
  image: "",
  isActive: true,
});

export default function Collections() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Collection | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await fetch("/api/collections", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: typeof form }) => {
      const res = await fetch(`/api/collections/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (c: Collection) => {
    setEditing(c);
    setForm({
      title: c.title,
      titleAr: c.titleAr,
      description: c.description ?? "",
      descriptionAr: c.descriptionAr ?? "",
      image: c.image ?? "",
      isActive: (c as Collection & { isActive?: boolean }).isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, payload: form });
    else createMutation.mutate(form);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("images", files[0]);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Upload failed");
      }
      const { urls } = await res.json();
      setForm((f) => ({ ...f, image: urls?.[0] || f.image }));
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">{t.collections}</h1>
          <p className="text-gray-500">{isRtl ? "إدارة مجموعات المتجر (اختياري)." : "Manage store collections (optional)."} </p>
        </div>
        <Button className="bg-primary text-white hover:bg-primary/90" onClick={openAdd}>
          {isRtl ? "إضافة مجموعة" : "Add Collection"}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(isRtl && "text-right")}>{t.image}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{isRtl ? "العنوان" : "Title"}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{isRtl ? "نشط" : "Active"}</TableHead>
              <TableHead className={cn("text-right", isRtl && "text-left")}>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  {isRtl ? "لا توجد مجموعات بعد" : "No collections yet"}
                </TableCell>
              </TableRow>
            )}
            {collections.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="h-14 w-12 overflow-hidden bg-gray-100">
                    {c.image ? (
                      <img src={c.image} alt={c.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{isRtl ? c.titleAr : c.title}</TableCell>
                <TableCell>{(c as Collection & { isActive?: boolean }).isActive === false ? (isRtl ? "لا" : "No") : (isRtl ? "نعم" : "Yes")}</TableCell>
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
        <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto rounded-none", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editing ? t.edit : (isRtl ? "إضافة مجموعة" : "Add Collection")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRtl ? "العنوان" : "Title"}</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="rounded-none" required />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "العنوان (عربي)" : "Title (Arabic)"}</Label>
                <Input value={form.titleAr} onChange={(e) => setForm((f) => ({ ...f, titleAr: e.target.value }))} className="rounded-none" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRtl ? "الوصف" : "Description"}</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="rounded-none min-h-[80px]" />
              </div>
              <div className="space-y-2">
                <Label>{isRtl ? "الوصف (عربي)" : "Description (Arabic)"}</Label>
                <Textarea value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))} className="rounded-none min-h-[80px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.image}</Label>
              <div className="flex gap-2">
                <Input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className="rounded-none" placeholder="https://..." />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files)} />
                <Button type="button" variant="outline" className="rounded-none" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> {uploading ? (isRtl ? "..." : "...") : (isRtl ? "رفع" : "Upload")}
                </Button>
              </div>
              {form.image && (
                <div className="h-24 w-24 bg-gray-100 border border-input">
                  <img src={form.image} alt="" className="h-full w-full object-cover" />
                </div>
              )}
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
              {isRtl ? "هل أنت متأكد أنك تريد حذف هذه المجموعة؟" : "Are you sure you want to delete this collection?"}
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

