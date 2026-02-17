import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import type { OrderWithItems } from "@/lib/data";
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
import { Eye, Printer } from "lucide-react";
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

export default function Orders() {
  const [lang, setLang] = useState<"en" | "ar">("en");

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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

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
                      
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline">{t.print_invoice}</Button>
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
        <Button variant="outline" className="gap-2">
          <Printer className="h-4 w-4" /> {t.export_report}
        </Button>
      </div>

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
