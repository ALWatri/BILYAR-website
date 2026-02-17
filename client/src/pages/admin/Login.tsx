import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { translations } from "@/lib/translations";
import { Globe } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication
    if (email === "admin@bilyar.com" && password === "admin") {
      localStorage.setItem("isAdminAuthenticated", "true");
      setLocation("/admin");
    } else {
      toast({
        title: t.login_failed,
        description: t.invalid_credentials,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-md w-full bg-white p-8 border border-border shadow-lg relative">
        <Button onClick={toggleLang} variant="ghost" size="icon" className="absolute top-4 right-4 rtl:left-4 rtl:right-auto h-8 w-8">
            <Globe className="h-4 w-4" />
        </Button>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold tracking-tighter mb-2">BILYAR.</h1>
          <p className="text-muted-foreground uppercase tracking-widest text-xs">{t.admin_portal}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-none h-12"
              placeholder="admin@bilyar.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.password}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-none h-12"
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-none uppercase tracking-widest bg-primary text-white hover:bg-primary/90">
            {t.sign_in}
          </Button>
        </form>
      </div>
    </div>
  );
}
