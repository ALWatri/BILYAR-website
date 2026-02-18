import { Link, useLocation } from "wouter";
import { LayoutDashboard, ShoppingBag, Package, Settings, LogOut, Globe, Users, Tags, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { translations } from "@/lib/translations";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const checkLang = () => {
      const currentLang = (localStorage.getItem("lang") as "en" | "ar") || "en";
      setLang(currentLang);
    };
    checkLang();
    // Watch for lang changes
    const observer = new MutationObserver(checkLang);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const toggleLang = () => {
    const newLang = lang === "en" ? "ar" : "en";
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const t = translations[lang].admin;
  const isRtl = lang === "ar";

  const handleLogout = () => {
    localStorage.removeItem("isAdminAuthenticated");
    setLocation("/admin/login");
  };

  const navItems = [
    { href: "/admin", label: t.dashboard, icon: LayoutDashboard },
    { href: "/admin/orders", label: t.orders, icon: ShoppingBag },
    { href: "/admin/products", label: t.products, icon: Package },
    { href: "/admin/categories", label: t.categories, icon: Tags },
    { href: "/admin/collections", label: t.collections, icon: Layers },
    { href: "/admin/customers", label: t.customers, icon: Users },
    { href: "/admin/settings", label: t.settings, icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex" dir={isRtl ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <aside className={cn("w-64 bg-white border-r border-gray-200 fixed h-full z-10 hidden md:block", isRtl ? "border-l border-r-0 right-0" : "left-0")}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
           <h1 className="text-2xl font-serif font-bold tracking-tighter text-primary">BILYAR.</h1>
           <Button onClick={toggleLang} variant="ghost" size="icon" className="h-8 w-8">
             <Globe className="h-4 w-4" />
           </Button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors cursor-pointer",
                  location === item.href
                    ? "bg-primary/5 text-primary"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 w-full transition-colors"
          >
            <LogOut className={cn("h-5 w-5", isRtl && "rotate-180")} />
            {t.sign_out}
          </button>
        </div>
      </aside>

      {/* Mobile Header (visible on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-10 flex items-center justify-between px-4">
         <h1 className="text-xl font-serif font-bold text-primary">BILYAR. Admin</h1>
         <div className="flex items-center gap-2">
           <Button onClick={toggleLang} variant="ghost" size="icon" className="h-8 w-8">
             <Globe className="h-4 w-4" />
           </Button>
           <button onClick={handleLogout}>
              <LogOut className="h-5 w-5 text-gray-600" />
           </button>
         </div>
      </div>

      {/* Main Content */}
      <main className={cn("flex-1 p-4 md:p-8 pt-20 md:pt-8", isRtl ? "md:mr-64" : "md:ml-64")}>
        {children}
      </main>
    </div>
  );
}
