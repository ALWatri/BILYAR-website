import { AdminLayout } from "./AdminLayout";
import { DollarSign, ShoppingBag, Package, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { translations } from "@/lib/translations";
import { useQuery } from "@tanstack/react-query";
import type { OrderWithItems } from "@/lib/data";

export default function Dashboard() {
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

  const t = translations[lang].admin;

  const paidStatuses = ["Paid", "Processing", "Shipped", "Delivered"];
  const totalRevenue = orders.filter((o) => paidStatuses.includes(o.status)).reduce((acc, order) => acc + order.total, 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "Pending").length;
  const uniqueCustomers = new Set(orders.map((o) => o.customerEmail.toLowerCase())).size;
  const recentPaidOrders = orders.filter((o) => paidStatuses.includes(o.status)).slice(0, 10);
  const recentRevenue = recentPaidOrders.reduce((acc, o) => acc + o.total, 0);

  const stats = [
    {
      title: t.total_revenue,
      value: `${totalRevenue.toLocaleString()} KWD`,
      icon: DollarSign,
      description: t.from_last_month
    },
    {
      title: t.orders,
      value: totalOrders,
      icon: ShoppingBag,
      description: t.since_last_week
    },
    {
      title: t.pending_orders,
      value: pendingOrders,
      icon: Package,
      description: t.requires_attention
    },
    {
      title: t.active_customers,
      value: uniqueCustomers,
      icon: Users,
      description: t.since_last_month
    }
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-gray-900" data-testid="text-dashboard-title">{t.dashboard}</h1>
        <p className="text-gray-500">{t.overview}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="rounded-none border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{t.recent_revenue}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-2xl font-bold text-gray-900">{recentRevenue.toFixed(3)} KWD</p>
              <p className="text-sm text-gray-500">From last {recentPaidOrders.length} paid orders (Paid, Processing, Shipped, Delivered)</p>
              {recentPaidOrders.length === 0 && (
                <p className="text-sm text-muted-foreground py-4">No paid orders yet</p>
              )}
              <div className="space-y-2 max-h-[120px] overflow-y-auto">
                {recentPaidOrders.map((o) => (
                  <div key={o.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                    <span>{o.orderNumber}</span>
                    <span className="font-medium">+{o.total} KWD</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 rounded-none border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>{t.recent_sales}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center">
                   <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {order.customerName.charAt(0)}
                   </div>
                   <div className="ml-4 space-y-1 rtl:mr-4 rtl:ml-0">
                     <p className="text-sm font-medium leading-none">{order.customerName}</p>
                     <p className="text-xs text-muted-foreground">{order.items.length} {t.items}</p>
                   </div>
                   <div className="ml-auto rtl:mr-auto rtl:ml-0 font-medium text-sm">+{order.total} KWD</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
