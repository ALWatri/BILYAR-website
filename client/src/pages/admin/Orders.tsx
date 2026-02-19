import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import type { OrderWithItems } from "@/lib/data";
import type { OrderItem } from "@/lib/data";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Printer, Truck, FileDown, Trash2, Pencil, Save, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Orders() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    customer: { name: string; email: string; phone: string; address: string; city: string; country: string };
    items: { id: number; productId: number; productName: string; quantity: number; price: number; image: string; size: string | null; measurements: Record<string, string> | null; notes: string | null }[];
  } | null>(null);
  const [createForm, setCreateForm] = useState({
    customer: { name: "", email: "", phone: "", address: "", city: "", country: "" },
    items: [] as { productId: number; productName: string; quantity: number; price: number; image: string; size?: string }[],
  });

  const { data: products = [] } = useQuery<{ id: number; name: string; nameAr: string; price: number; images: string[] }[]>({
    queryKey: ["/api/products"],
    enabled: createOrderOpen,
  });

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

  const { data: orders = [] } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: createForm.customer,
          items: createForm.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, price: i.price, image: i.image, size: i.size })),
          paymentMethod: "manual",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setCreateOrderOpen(false);
      setCreateForm({ customer: { name: "", email: "", phone: "", address: "", city: "", country: "" }, items: [] });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (payload: { id: number; customer: { name: string; email: string; phone: string; address: string; city: string; country: string }; items: { productId: number; productName: string; quantity: number; price: number; image: string; size?: string | null; measurements?: Record<string, string> | null; notes?: string | null }[] }) => {
      const { id, customer, items } = payload;
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer, items }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update order");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setEditingOrderId(null);
      setEditForm(null);
    },
  });

  const startEdit = (order: OrderWithItems) => {
    const driver = forDriver(order);
    setEditingOrderId(order.id);
    setEditForm({
      customer: {
        name: driver.name,
        email: order.customerEmail || "",
        phone: order.customerPhone || "",
        address: (order as OrderWithItems & { customerAddressEn?: string | null }).customerAddressEn ?? order.customerAddress,
        city: driver.city,
        country: driver.country,
      },
      items: order.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        price: i.price,
        image: i.image,
        size: i.size ?? null,
        measurements: (i.measurements as Record<string, string>) ?? null,
        notes: i.notes ?? (i as OrderItem & { notesEn?: string | null }).notesEn ?? null,
      })),
    });
  };

  const cancelEdit = () => {
    setEditingOrderId(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (!editingOrderId || !editForm) return;
    updateOrderMutation.mutate({
      id: editingOrderId,
      customer: editForm.customer,
      items: editForm.items.map(({ productId, productName, quantity, price, image, size, measurements, notes }) => ({
        productId, productName, quantity, price, image,
        size: size || undefined,
        measurements: measurements || undefined,
        notes: notes || undefined,
      })),
    });
  };

  const t = translations[lang].admin;
  const isRtl = lang === "ar";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Paid": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Processing": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Shipped": return "bg-purple-100 text-purple-800 border-purple-200";
      case "Delivered": return "bg-green-100 text-green-800 border-green-200";
      case "Unfinished": return "bg-gray-100 text-gray-700 border-gray-200";
      case "Cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const paymentMethodLabel = (method: string | null | undefined) => {
    if (method === "deema") return "Deema (BNPL)";
    if (method === "myfatoorah") return "MyFatoorah";
    return method || "—";
  };

  /** Show English translation for drivers when available, else original */
  const forDriver = (order: OrderWithItems) => ({
    name: (order as OrderWithItems & { customerNameEn?: string | null }).customerNameEn ?? order.customerName,
    address: (order as OrderWithItems & { customerAddressEn?: string | null }).customerAddressEn ?? order.customerAddress,
    city: (order as OrderWithItems & { customerCityEn?: string | null }).customerCityEn ?? order.customerCity,
    country: (order as OrderWithItems & { customerCountryEn?: string | null }).customerCountryEn ?? order.customerCountry,
  });
  const itemNotesForDriver = (item: OrderWithItems["items"][0]) =>
    (item as { notesEn?: string | null }).notesEn ?? item.notes;

  const printInvoice = (order: OrderWithItems) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const itemsHtml = order.items.map(
      (i) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${i.size || "—"}</td><td>${(i.price * i.quantity).toFixed(3)} KWD</td></tr>`
    ).join("");
    win.document.write(`
      <!DOCTYPE html><html><head><title>Invoice ${order.orderNumber}</title>
      <style>body{font-family:sans-serif;padding:24px;max-width:600px;margin:0 auto}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}
      h1{margin-bottom:8px}.meta{color:#666;margin-bottom:24px}</style></head><body>
      <h1>Invoice - ${order.orderNumber}</h1>
      <div class="meta">${order.createdAt} | ${forDriver(order).name} | ${order.customerPhone}</div>
      <h3>Shipping</h3>
      <p>${forDriver(order).address}<br>${forDriver(order).city}, ${forDriver(order).country}</p>
      <h3>Items</h3>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Size</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <p style="margin-top:16px"><strong>Subtotal:</strong> ${(order.total - order.shippingCost).toFixed(3)} KWD | <strong>Shipping:</strong> ${order.shippingCost} KWD | <strong>Total:</strong> ${order.total} KWD</p>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  };

  const printDeliverySlip = (order: OrderWithItems) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const itemsHtml = order.items.map(
      (i) => `<tr><td>${i.productName}</td><td>${i.quantity}</td><td>${i.size || "—"}</td></tr>`
    ).join("");
    win.document.write(`
      <!DOCTYPE html><html><head><title>Delivery Slip ${order.orderNumber}</title>
      <style>body{font-family:sans-serif;padding:24px;max-width:500px;margin:0 auto}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}
      h1{font-size:1.25rem;margin-bottom:8px}.meta{color:#666;margin-bottom:16px}</style></head><body>
      <h1>DELIVERY SLIP - ${order.orderNumber}</h1>
      <div class="meta">${order.createdAt}</div>
      <p><strong>Customer:</strong> ${forDriver(order).name}<br><strong>Phone:</strong> ${order.customerPhone}</p>
      <p><strong>Address:</strong><br>${forDriver(order).address}<br>${forDriver(order).city}, ${forDriver(order).country}</p>
      <h3>Items (no images, no prices)</h3>
      <table><thead><tr><th>Product</th><th>Qty</th><th>Size</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  };

  const exportReport = () => {
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      date: o.createdAt,
      customer: o.customerName,
      email: o.customerEmail,
      phone: o.customerPhone,
      status: o.status,
      total: o.total,
    }));
    const headers = ["Order #", "Date", "Customer", "Email", "Phone", "Status", "Total (KWD)"];
    const csv = [headers.join(","), ...rows.map((r) => [r.orderNumber, r.date, r.customer, r.email, r.phone, r.status, r.total].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successfulStatuses = ["Paid", "Processing", "Shipped", "Delivered"];
  const pendingAbandonedStatuses = ["Pending", "Unfinished", "Cancelled"];
  const successfulOrders = orders.filter((o) => successfulStatuses.includes(o.status));
  const pendingAbandonedOrders = orders.filter((o) => pendingAbandonedStatuses.includes(o.status));

  const renderOrderRow = (order: OrderWithItems) => (
              <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                <TableCell className="font-medium">{order.orderNumber}</TableCell>
                <TableCell>{order.createdAt}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{forDriver(order).name}</span>
                    <span className="text-xs text-muted-foreground">{order.customerEmail}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {paymentMethodLabel((order as OrderWithItems & { paymentMethod?: string }).paymentMethod)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("rounded-sm font-normal", getStatusColor(order.status))}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className={cn("text-right font-medium", isRtl && "text-left")}>{order.total} KWD</TableCell>
                <TableCell className={cn("text-right", isRtl && "text-left")}>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-view-order-${order.id}`}>
                        <Eye className="h-4 w-4 text-gray-500 hover:text-primary" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-serif">{t.order_details} - {order.orderNumber}</DialogTitle>
                      </DialogHeader>
                      
                      {editingOrderId === order.id && editForm ? (
                        <>
                          <div className="grid grid-cols-2 gap-6 py-4 border-b border-gray-100">
                            <div className="space-y-3">
                              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider">{t.customer_info}</h3>
                              <div>
                                <Label className="text-xs">{t.customer_name}</Label>
                                <Input value={editForm.customer.name} onChange={(e) => setEditForm((f) => f ? { ...f, customer: { ...f.customer, name: e.target.value } } : f)} className="rounded-none" />
                              </div>
                              <div>
                                <Label className="text-xs">{t.email}</Label>
                                <Input type="email" value={editForm.customer.email} onChange={(e) => setEditForm((f) => f ? { ...f, customer: { ...f.customer, email: e.target.value } } : f)} className="rounded-none" />
                              </div>
                              <div>
                                <Label className="text-xs">{t.phone || "Phone"}</Label>
                                <Input value={editForm.customer.phone} onChange={(e) => setEditForm((f) => f ? { ...f, customer: { ...f.customer, phone: e.target.value } } : f)} className="rounded-none" />
                              </div>
                            </div>
                            <div className="space-y-3">
                              <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider">{t.shipping_address}</h3>
                              <div>
                                <Label className="text-xs">Address</Label>
                                <Input value={editForm.customer.address} onChange={(e) => setEditForm((f) => f ? { ...f, customer: { ...f.customer, address: e.target.value } } : f)} className="rounded-none" />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">City</Label>
                                  <Input value={editForm.customer.city} onChange={(e) => setEditForm((f) => f ? { ...f, customer: { ...f.customer, city: e.target.value } } : f)} className="rounded-none" />
                                </div>
                                <div>
                                  <Label className="text-xs">Country</Label>
                                  <Input value={editForm.customer.country} onChange={(e) => setEditForm((f) => f ? { ...f, customer: { ...f.customer, country: e.target.value } } : f)} className="rounded-none" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="py-4">
                            <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4">{t.order_items}</h3>
                            <div className="space-y-4">
                              {editForm.items.map((item, idx) => (
                                <div key={item.id} className="flex gap-4 items-center border-b border-gray-50 pb-4">
                                  <div className="h-16 w-14 flex-shrink-0 bg-gray-100">
                                    <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{item.productName}</p>
                                    <p className="text-xs text-gray-500">{t.size}: {item.size || "—"}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs">{t.qty}</Label>
                                    <Input type="number" min={1} value={item.quantity} onChange={(e) => {
                                      const q = parseInt(e.target.value, 10);
                                      if (!isNaN(q) && q >= 1) setEditForm((f) => f ? { ...f, items: f.items.map((it, i) => i === idx ? { ...it, quantity: q } : it) } : f);
                                    }} className="w-16 rounded-none" />
                                  </div>
                                  <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => setEditForm((f) => f ? { ...f, items: f.items.filter((_, i) => i !== idx) } : f)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            {editForm.items.length === 0 && (
                              <p className="text-sm text-amber-600 py-2">At least one item is required.</p>
                            )}
                          </div>
                          <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={cancelEdit} className="gap-2">
                              <X className="h-4 w-4" /> Cancel
                            </Button>
                            <Button onClick={saveEdit} disabled={editForm.items.length === 0 || updateOrderMutation.isPending} className="gap-2">
                              <Save className="h-4 w-4" /> Save
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                      <div className="grid grid-cols-2 gap-8 py-4 border-b border-gray-100">
                        <div>
                          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">{t.customer_info}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="text-gray-500">{t.payment_method}:</span> {paymentMethodLabel((order as OrderWithItems & { paymentMethod?: string }).paymentMethod)}
                            {(order as OrderWithItems & { paymentStatus?: string }).paymentStatus && (
                              <span className="ml-2"> • {(order as OrderWithItems & { paymentStatus?: string }).paymentStatus}</span>
                            )}
                          </p>
                          <p className="font-medium">{forDriver(order).name}</p>
                          <p className="text-sm text-gray-600">{order.customerEmail}</p>
                          <p className="text-sm text-gray-600">{order.customerPhone}</p>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-2">{t.shipping_address}</h3>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{forDriver(order).address}</p>
                          <p className="text-sm text-gray-600">{forDriver(order).city}, {forDriver(order).country}</p>
                        </div>
                      </div>

                      <div className="py-4">
                        <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4">{t.order_items}</h3>
                        <div className="space-y-6">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                              <div className="h-24 w-20 flex-shrink-0 bg-gray-100">
                                <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-medium text-lg font-serif">{item.productName}</h4>
                                    <p className="text-sm text-gray-500">{t.qty}: {item.quantity} | {t.size}: {item.size || "N/A"}</p>
                                  </div>
                                  <p className="font-medium">{item.price * item.quantity} KWD</p>
                                </div>
                                
                                {Boolean(item.measurements && typeof item.measurements === "object") && (
                                  <div className="bg-gray-50 p-3 rounded-sm mt-2">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t.custom_measurements}</p>
                                    <div className="grid grid-cols-3 gap-2">
                                      {Object.entries((item.measurements || {}) as Record<string, string>).map(([key, value]) => (
                                        <div key={key} className="text-xs">
                                          <span className="text-gray-500">{key}:</span> <span className="font-medium">{String(value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {(item.notes || itemNotesForDriver(item)) && (
                                  <div className="mt-2 bg-yellow-50 p-3 rounded-sm border border-yellow-100">
                                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-1">{t.customer_notes}</p>
                                    <p className="text-sm text-yellow-900 italic">"{itemNotesForDriver(item) ?? item.notes}"</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4 flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{t.subtotal}</span>
                            <span>{(order.total - order.shippingCost).toFixed(2)} KWD</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">{t.shipping}</span>
                            <span>{order.shippingCost} KWD</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                            <span>{t.total}</span>
                            <span>{order.total} KWD</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-4 flex-wrap gap-2">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => startEdit(order)} className="gap-2">
                            <Pencil className="h-4 w-4" /> {t.edit}
                          </Button>
                          <Button variant="outline" onClick={() => printInvoice(order)} className="gap-2">
                            <Printer className="h-4 w-4" /> {t.print_invoice}
                          </Button>
                          <Button variant="outline" onClick={() => printDeliverySlip(order)} className="gap-2">
                            <Truck className="h-4 w-4" /> Delivery Slip
                          </Button>
                        </div>
                        <Button
                          variant="outline"
                          className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => { if (confirm("Delete this order?")) deleteOrderMutation.mutate(order.id); }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete Order
                        </Button>
                        <Select
                          defaultValue={order.status}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: order.id, status: value })}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder={t.update_status} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Processing">Processing</SelectItem>
                            <SelectItem value="Shipped">Shipped</SelectItem>
                            <SelectItem value="Delivered">Delivered</SelectItem>
                            <SelectItem value="Unfinished">Unfinished</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                        </>
                      )}

                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
  );

  const tableHeader = (
    <TableRow>
      <TableHead className={cn(isRtl && "text-right")}>{t.order_id}</TableHead>
      <TableHead className={cn(isRtl && "text-right")}>{t.date}</TableHead>
      <TableHead className={cn(isRtl && "text-right")}>{t.customer}</TableHead>
      <TableHead className={cn(isRtl && "text-right")}>{t.payment_method}</TableHead>
      <TableHead className={cn(isRtl && "text-right")}>{t.status}</TableHead>
      <TableHead className={cn("text-right", isRtl && "text-left")}>{t.total}</TableHead>
      <TableHead className={cn("text-right", isRtl && "text-left")}>{t.actions}</TableHead>
    </TableRow>
  );

  return (
    <AdminLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900" data-testid="text-orders-title">{t.orders}</h1>
          <p className="text-gray-500">{t.manage_orders}</p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2 bg-primary text-white hover:bg-primary/90" onClick={() => setCreateOrderOpen(true)}>
            <Plus className="h-4 w-4" /> {t.create_order}
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportReport}>
            <FileDown className="h-4 w-4" /> {t.export_report}
          </Button>
        </div>
      </div>

      <Dialog open={createOrderOpen} onOpenChange={setCreateOrderOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.create_order}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t.customer_name}</Label>
                <Input value={createForm.customer.name} onChange={(e) => setCreateForm((f) => ({ ...f, customer: { ...f.customer, name: e.target.value } }))} className="rounded-none" required />
              </div>
              <div>
                <Label>{t.email}</Label>
                <Input type="email" value={createForm.customer.email} onChange={(e) => setCreateForm((f) => ({ ...f, customer: { ...f.customer, email: e.target.value } }))} className="rounded-none" />
              </div>
              <div>
                <Label>{t.phone || "Phone"}</Label>
                <Input value={createForm.customer.phone} onChange={(e) => setCreateForm((f) => ({ ...f, customer: { ...f.customer, phone: e.target.value } }))} className="rounded-none" required />
              </div>
              <div className="col-span-2">
                <Label>Address</Label>
                <Input value={createForm.customer.address} onChange={(e) => setCreateForm((f) => ({ ...f, customer: { ...f.customer, address: e.target.value } }))} className="rounded-none" required />
              </div>
              <div>
                <Label>City</Label>
                <Input value={createForm.customer.city} onChange={(e) => setCreateForm((f) => ({ ...f, customer: { ...f.customer, city: e.target.value } }))} className="rounded-none" required />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={createForm.customer.country} onChange={(e) => setCreateForm((f) => ({ ...f, customer: { ...f.customer, country: e.target.value } }))} className="rounded-none" required />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>{t.order_items}</Label>
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => {
                  const p = products[0];
                  if (!p) return;
                  const name = lang === "ar" ? (p as { nameAr?: string }).nameAr ?? p.name : p.name;
                  setCreateForm((f) => ({ ...f, items: [...f.items, { productId: p.id, productName: name, quantity: 1, price: p.price, image: p.images?.[0] || "" }] }));
                }} disabled={!products.length}>
                  <Plus className="h-3 w-3" /> Add item
                </Button>
              </div>
              <div className="space-y-2">
                {createForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center border border-gray-100 p-2">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const p = products.find((x) => x.id === id);
                        if (!p) return;
                        const name = lang === "ar" ? (p as { nameAr?: string }).nameAr ?? p.name : p.name;
                        setCreateForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, productId: p.id, productName: name, price: p.price, image: p.images?.[0] || "" } : it) }));
                      }}
                      className="flex-1 h-9 rounded-none border px-2 text-sm"
                    >
                      {products.map((p) => {
                        const name = lang === "ar" ? (p as { nameAr?: string }).nameAr ?? p.name : p.name;
                        return <option key={p.id} value={p.id}>{name} – {p.price} KWD</option>;
                      })}
                    </select>
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => { const q = parseInt(e.target.value, 10); if (!isNaN(q) && q >= 1) setCreateForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, quantity: q } : it) })); }} className="w-16 rounded-none" />
                    <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => setCreateForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {createForm.items.length === 0 && <p className="text-sm text-amber-600">Add at least one item.</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOrderOpen(false)}>{t.cancel}</Button>
              <Button onClick={() => createOrderMutation.mutate()} disabled={createForm.items.length === 0 || !createForm.customer.name.trim() || !createForm.customer.phone.trim() || !createForm.customer.address.trim() || !createForm.customer.city.trim() || !createForm.customer.country.trim() || createOrderMutation.isPending}>
                {createOrderMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section className="mb-12">
        <h2 className="text-xl font-serif font-semibold text-gray-900 mb-4">{t.successful_orders}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isRtl ? "طلبات مدفوعة أو قيد التجهيز أو الشحن أو التسليم." : "Paid orders and those in progress, shipped, or delivered."}
        </p>
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm">
          <Table>
            <TableHeader>{tableHeader}</TableHeader>
            <TableBody>
              {successfulOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {isRtl ? "لا توجد طلبات ناجحة" : "No successful orders yet"}
                  </TableCell>
                </TableRow>
              ) : (
                successfulOrders.map((order) => renderOrderRow(order))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-serif font-semibold text-gray-900 mb-4">{t.pending_abandoned_orders}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {isRtl ? "طلبات معلقة أو غير مكتملة أو ملغاة. يمكنك متابعة العملاء بعروض." : "Pending, abandoned, or cancelled. You can follow up with offers."}
        </p>
        <div className="bg-white border border-gray-200 rounded-sm shadow-sm">
          <Table>
            <TableHeader>{tableHeader}</TableHeader>
            <TableBody>
              {pendingAbandonedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {isRtl ? "لا توجد طلبات معلقة أو غير مكتملة" : "No pending or abandoned orders"}
                  </TableCell>
                </TableRow>
              ) : (
                pendingAbandonedOrders.map((order) => renderOrderRow(order))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </AdminLayout>
  );
}
