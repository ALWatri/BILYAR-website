import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Users, Crown, Star, User, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/translations";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { OrderWithItems } from "@/lib/data";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Customer {
  id?: string;
  email: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  orders: OrderWithItems[];
}

export default function Customers() {
  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const checkLang = () => {
      setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    };
    checkLang();
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; phone: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const { toast } = useToast();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (payload: { id: string; name?: string; phone?: string }) => {
      await apiRequest("PATCH", "/api/customers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      setEditForm(null);
      toast({ title: "Customer updated" });
    },
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" }),
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/customers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }), credentials: "include" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDeleteTarget(null);
      toast({ title: "Customer deleted" });
    },
    onError: (err) => toast({ title: err instanceof Error ? err.message : "Failed", variant: "destructive" }),
  });

  const t = translations[lang].admin;
  const isRtl = lang === "ar";

  const getLoyaltyBadge = (totalOrders: number, totalSpent: number) => {
    if (totalOrders >= 5 || totalSpent >= 500) {
      return { label: t.loyal_customer, icon: Crown, className: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    if (totalOrders >= 2 || totalSpent >= 200) {
      return { label: t.regular_customer, icon: Star, className: "bg-blue-100 text-blue-800 border-blue-200" };
    }
    return { label: t.new_customer, icon: User, className: "bg-gray-100 text-gray-800 border-gray-200" };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Processing": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Shipped": return "bg-purple-100 text-purple-800 border-purple-200";
      case "Delivered": return "bg-green-100 text-green-800 border-green-200";
      case "Cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Users className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-serif font-bold text-gray-900" data-testid="text-customers-title">{t.customers}</h1>
        </div>
        <p className="text-gray-500">{t.manage_customers}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="bg-white border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.customers}</p>
              <p className="text-2xl font-bold" data-testid="text-total-customers">{customers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-amber-100 flex items-center justify-center">
              <Crown className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.loyal_customer}</p>
              <p className="text-2xl font-bold">{customers.filter(c => c.totalOrders >= 5 || c.totalSpent >= 500).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-green-100 flex items-center justify-center">
              <Star className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.total_spent}</p>
              <p className="text-2xl font-bold">{customers.reduce((sum, c) => sum + c.totalSpent, 0).toFixed(0)} KWD</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-sm shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(isRtl && "text-right")}>{t.customer_name}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.phone}</TableHead>
              <TableHead className={cn("text-center")}>{t.total_orders}</TableHead>
              <TableHead className={cn("text-right", isRtl && "text-left")}>{t.total_spent}</TableHead>
              <TableHead className={cn(isRtl && "text-right")}>{t.status}</TableHead>
              <TableHead className={cn("text-right", isRtl && "text-left")}>{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {t.no_customers}
                </TableCell>
              </TableRow>
            )}
            {customers.map((customer) => {
              const loyalty = getLoyaltyBadge(customer.totalOrders, customer.totalSpent);
              const customerId = (customer as Customer & { id?: string }).id ?? customer.email ?? `${customer.phone}|${customer.name}`;
              return (
                <TableRow key={customerId} data-testid={`row-customer-${customerId}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">{customer.phone}</TableCell>
                  <TableCell className="text-center font-medium">{customer.totalOrders}</TableCell>
                  <TableCell className={cn("text-right font-medium", isRtl && "text-left")}>{customer.totalSpent.toFixed(3)} KWD</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("rounded-sm font-normal gap-1", loyalty.className)}>
                      <loyalty.icon className="h-3 w-3" />
                      {loyalty.label}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn("text-right", isRtl && "text-left")}>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setEditingCustomer(customer); setEditForm({ name: customer.name, phone: customer.phone }); }}>
                        <Pencil className="h-3.5 w-3.5" /> {t.edit}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-xs text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(customer)}>
                        <Trash2 className="h-3.5 w-3.5" /> {t.delete}
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" data-testid={`button-view-customer-${customerId}`}>
                            <Eye className="h-3.5 w-3.5" /> {t.view_orders}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir={isRtl ? "rtl" : "ltr"}>
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-serif">{t.customer_orders} - {customer.name}</DialogTitle>
                          </DialogHeader>

                          <div className="grid grid-cols-2 gap-6 py-4 border-b border-gray-100">
                          <div>
                            <p className="text-sm text-gray-500">{t.email}</p>
                            <p className="font-medium">{customer.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t.phone}</p>
                            <p className="font-medium">{customer.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t.total_orders}</p>
                            <p className="font-medium">{customer.totalOrders}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">{t.total_spent}</p>
                            <p className="font-medium">{customer.totalSpent.toFixed(3)} KWD</p>
                          </div>
                        </div>

                        <div className="py-4">
                          <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wider mb-4">{t.orders}</h3>
                          <div className="space-y-4">
                            {customer.orders.map((order) => (
                              <div key={order.id} className="border border-gray-100 p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-medium font-serif">{order.orderNumber}</p>
                                    <p className="text-xs text-gray-500">{order.createdAt}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className={cn("rounded-sm font-normal", getStatusColor(order.status))}>
                                      {order.status}
                                    </Badge>
                                    <span className="font-medium">{order.total.toFixed(3)} KWD</span>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {order.items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-3 text-sm">
                                      <div className="h-10 w-8 bg-gray-100 overflow-hidden flex-shrink-0">
                                        <img src={item.image} alt={item.productName} className="h-full w-full object-cover" />
                                      </div>
                                      <span className="flex-1">{item.productName}</span>
                                      <span className="text-gray-500">x{item.quantity}</span>
                                      <span className="font-medium">{(item.price * item.quantity).toFixed(3)} KWD</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingCustomer} onOpenChange={(open) => { if (!open) { setEditingCustomer(null); setEditForm(null); } }}>
        <DialogContent className="max-w-md" dir={isRtl ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t.edit_customer || "Edit Customer"}</DialogTitle>
          </DialogHeader>
          {editingCustomer && editForm && (
            <div className="space-y-4 py-4">
              <div>
                <Label>{t.customer_name}</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm((f) => f ? { ...f, name: e.target.value } : f)} className="rounded-none" />
              </div>
              <div>
                <Label>{t.phone}</Label>
                <Input value={editForm.phone} onChange={(e) => setEditForm((f) => f ? { ...f, phone: e.target.value } : f)} className="rounded-none" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setEditingCustomer(null); setEditForm(null); }}>{t.cancel}</Button>
                <Button onClick={() => { const id = (editingCustomer as Customer & { id?: string }).id ?? editingCustomer.email ?? `${editingCustomer.phone}|${editingCustomer.name}`; updateCustomerMutation.mutate({ id, name: editForm.name, phone: editForm.phone }); }} disabled={updateCustomerMutation.isPending}>
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir={isRtl ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.delete_customer || "Delete Customer"}</AlertDialogTitle>
            <AlertDialogDescription>{t.delete_customer_confirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) { const id = (deleteTarget as Customer & { id?: string }).id ?? deleteTarget.email ?? `${deleteTarget.phone}|${deleteTarget.name}`; deleteCustomerMutation.mutate(id); } }} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
