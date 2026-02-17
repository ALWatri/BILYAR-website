import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product } from "@/lib/data";
import { Package, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES_EN = ["Outerwear", "Sets", "Dresses", "Tops", "Accessories"];
const CATEGORIES_AR = ["ملابس خارجية", "أطقم", "فساتين", "قمصان", "إكسسوارات"];

const emptyForm = () => ({
  name: "",
  nameAr: "",
  description: "",
  descriptionAr: "",
  price: "",
  category: "Dresses",
  categoryAr: "فساتين",
  images: "",
  isNew: false,
  hasShirt: false,
  hasTrouser: false,
});

function productToForm(p: Product) {
  return {
    name: p.name,
    nameAr: p.nameAr,
    description: p.description,
    descriptionAr: p.descriptionAr,
    price: String(p.price),
    category: p.category,
    categoryAr: p.categoryAr,
    images: p.images.join("\n"),
    isNew: p.isNew ?? false,
    hasShirt: p.hasShirt ?? false,
    hasTrouser: p.hasTrouser ?? false,
  };
}

export default function Products() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const checkLang = () => {
      setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    };
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const images = payload.images.split("\n").map((s) => s.trim()).filter(Boolean);
      if (images.length === 0) throw new Error("At least one image URL required");
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          nameAr: payload.nameAr,
          description: payload.description,
          descriptionAr: payload.descriptionAr,
          price: parseFloat(payload.price) || 0,
          category: payload.category,
          categoryAr: payload.categoryAr,
          images,
          isNew: payload.isNew,
          hasShirt: payload.hasShirt,
          hasTrouser: payload.hasTrouser,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t.product_saved });
      setDialogOpen(false);
      setForm(emptyForm());
      setEditingProduct(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: typeof form }) => {
      const images = payload.images.split("\n").map((s) => s.trim()).filter(Boolean);
      if (images.length === 0) throw new Error("At least one image URL required");
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          nameAr: payload.nameAr,
          description: payload.description,
          descriptionAr: payload.descriptionAr,
          price: parseFloat(payload.price) || 0,
          category: payload.category,
          categoryAr: payload.categoryAr,
          images,
          isNew: payload.isNew,
          hasShirt: payload.hasShirt,
          hasTrouser: payload.hasTrouser,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t.product_saved });
      setDialogOpen(false);
      setForm(emptyForm());
      setEditingProduct(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: t.product_deleted });
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const t = translations[lang].admin;
  const isRtl = lang === "ar";

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm(productToForm(product));
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900" data-testid="text-products-title">{t.products}</h1>
          <p className="text-gray-500">{t.manage_products}</p>
        </div>
        <Button className="gap-2 bg-primary text-white hover:bg-primary/90" data-testid="button-add-product" onClick={openAdd}>
          <Package className="h-4 w-4" /> {t.add_product}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(isRtl && "text-right")}>{t.image}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.product_name}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.category}</TableHead>
              <TableHead className={cn("text-right", isRtl && "text-left")}>{t.price}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.status}</TableHead>
              <TableHead className={cn("text-right", isRtl && "text-left")}>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {t.no_products}
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => {
              const name = isRtl ? product.nameAr : product.name;
              const category = isRtl ? product.categoryAr : product.category;
              return (
                <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                  <TableCell>
                    <div className="h-14 w-12 overflow-hidden bg-gray-100">
                      <img src={product.images[0]} alt={name} className="h-full w-full object-cover" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{name}</p>
                      {product.isNew && (
                        <Badge variant="outline" className="mt-1 text-[10px] bg-primary/5 text-primary border-primary/20">NEW</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{category}</TableCell>
                  <TableCell className={cn("text-right font-medium", isRtl && "text-left")}>{product.price} KWD</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-sm font-normal bg-green-100 text-green-800 border-green-200">
                      {t.in_stock}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("text-right", isRtl && "text-left")}>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => openEdit(product)}>{t.edit}</Button>
                      <Button variant="outline" size="sm" className="text-xs text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(product)}>{t.delete}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={cn("max-w-2xl max-h-[90vh] overflow-y-auto rounded-none", isRtl && "text-right")} dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{editingProduct ? t.edit : t.add_product}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.product_name}</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="rounded-none" required />
              </div>
              <div className="space-y-2">
                <Label>{t.name_ar}</Label>
                <Input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} className="rounded-none" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.description}</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="rounded-none min-h-[80px]" required />
              </div>
              <div className="space-y-2">
                <Label>{t.description_ar}</Label>
                <Textarea value={form.descriptionAr} onChange={(e) => setForm((f) => ({ ...f, descriptionAr: e.target.value }))} className="rounded-none min-h-[80px]" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.price} (KWD)</Label>
                <Input type="number" step="0.001" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="rounded-none" required />
              </div>
              <div className="space-y-2">
                <Label>{t.category}</Label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, categoryAr: CATEGORIES_AR[CATEGORIES_EN.indexOf(e.target.value)] || f.categoryAr }))}
                  className="w-full h-10 rounded-none border border-input bg-background px-3 py-2 text-sm"
                >
                  {CATEGORIES_EN.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.category_ar}</Label>
              <Input value={form.categoryAr} onChange={(e) => setForm((f) => ({ ...f, categoryAr: e.target.value }))} className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label>{t.images_placeholder}</Label>
              <Textarea value={form.images} onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))} className="rounded-none min-h-[60px] font-mono text-sm" placeholder="/images/prod-1.jpg" required />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.isNew} onCheckedChange={(v) => setForm((f) => ({ ...f, isNew: !!v }))} />
                <span>{t.new_badge}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.hasShirt} onCheckedChange={(v) => setForm((f) => ({ ...f, hasShirt: !!v }))} />
                <span>{t.has_shirt_measurements}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.hasTrouser} onCheckedChange={(v) => setForm((f) => ({ ...f, hasTrouser: !!v }))} />
                <span>{t.has_trouser_measurements}</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">{t.cancel}</Button>
              <Button type="submit" disabled={isPending} className="rounded-none bg-primary text-white hover:bg-primary/90">{isPending ? "..." : t.save_product}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none" dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete}</AlertDialogTitle>
            <AlertDialogDescription>{t.delete_product_confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none">{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-none bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "..." : t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
