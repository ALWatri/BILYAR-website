import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useEffect, useState } from "react";
import { translations } from "@/lib/translations";
import { cn } from "@/lib/utils";

export function About() {
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

  const t = translations[lang].static;
  const isRtl = lang === "ar";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="pt-32 pb-12 container mx-auto px-6 max-w-4xl text-center">
        <h1 className="text-4xl md:text-6xl font-serif mb-8">{t.heritage_title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">
          {t.heritage_p1}
        </p>
        <div className="aspect-video bg-secondary/20 w-full mb-12">
            <img src="/images/hero-fashion.png" className="w-full h-full object-cover" alt="Atelier" />
        </div>
        <div className={cn("text-lg text-muted-foreground leading-relaxed", isRtl ? "text-right" : "text-left")}>
          <p>
            {t.heritage_p2}
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export function Contact() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);

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

  const t = translations[lang].static;
  const isRtl = lang === "ar";

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      setForm({ firstName: "", lastName: "", email: "", message: "" });
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="pt-32 pb-12 container mx-auto px-6 max-w-2xl">
        <h1 className="text-4xl font-serif mb-8 text-center">{t.contact_title}</h1>
        <div className="space-y-8">
          <p className="text-center text-muted-foreground">
            {t.contact_desc}
          </p>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={cn("text-xs uppercase tracking-widest font-bold block", isRtl ? "text-right" : "text-left")}>
                  {t.first_name}
                </label>
                <input
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className={cn("text-xs uppercase tracking-widest font-bold block", isRtl ? "text-right" : "text-left")}>
                  {t.last_name}
                </label>
                <input
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className={cn("text-xs uppercase tracking-widest font-bold block", isRtl ? "text-right" : "text-left")}>
                {t.email}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className={cn("text-xs uppercase tracking-widest font-bold block", isRtl ? "text-right" : "text-left")}>
                {t.message}
              </label>
              <textarea
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none h-32"
                required
              />
            </div>
            {status === "success" && (
              <div className="bg-green-50 text-green-800 p-3 border border-green-200">
                {t.contact_sent}
              </div>
            )}
            {status === "error" && (
              <div className="bg-destructive/10 text-destructive p-3 border border-destructive/20">
                {t.contact_failed}
              </div>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-white py-4 uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? t.sending : t.send}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function useLang() {
  const [lang, setLang] = useState<"en" | "ar">("en");
  useEffect(() => {
    const check = () => setLang((localStorage.getItem("lang") as "en" | "ar") || "en");
    check();
    const ob = new MutationObserver(check);
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => ob.disconnect();
  }, []);
  return lang;
}

export function Privacy() {
  const lang = useLang();
  const isRtl = lang === "ar";
  const content = lang === "ar"
    ? { title: "سياسة الخصوصية", p1: "تحترم بيليار خصوصيتك. لا نجمع معلوماتك الشخصية إلا لغرض معالجة الطلبات وتحسين تجربتك.", p2: "لا نشارك بياناتك مع أطراف ثالثة إلا حسب الضرورة للوفاء بالطلبات (مثل التوصيل والدفع).", p3: "يمكنك التواصل معنا في أي وقت بخصوص بياناتك أو الأسئلة." }
    : { title: "Privacy Policy", p1: "BILYAR respects your privacy. We collect your personal information only to process orders and improve your experience.", p2: "We do not share your data with third parties except as necessary to fulfill orders (e.g. shipping and payment).", p3: "You may contact us at any time regarding your data or questions." };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className={cn("pt-32 pb-12 container mx-auto px-6 max-w-3xl", isRtl ? "text-right" : "text-left")}>
        <h1 className="text-4xl font-serif mb-8">{content.title}</h1>
        <p className="text-muted-foreground leading-relaxed mb-6">{content.p1}</p>
        <p className="text-muted-foreground leading-relaxed mb-6">{content.p2}</p>
        <p className="text-muted-foreground leading-relaxed">{content.p3}</p>
        <p className="text-sm text-muted-foreground mt-8">Last updated: {new Date().toLocaleDateString()}</p>
      </div>
      <Footer />
    </div>
  );
}

export function Terms() {
  const lang = useLang();
  const isRtl = lang === "ar";
  const content = lang === "ar"
    ? { title: "شروط الخدمة", p1: "باستخدام موقع بيليار، فإنك توافق على هذه الشروط.", p2: "جميع المنتجات عرضة للتوفر. نحتفظ بالحق في رفض أو إلغاء الطلبات.", p3: "التوصيل والاسترجاع يخضعان لسياساتنا المنشورة." }
    : { title: "Terms of Service", p1: "By using the BILYAR website, you agree to these terms.", p2: "All products are subject to availability. We reserve the right to refuse or cancel orders.", p3: "Shipping and returns are subject to our published policies." };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className={cn("pt-32 pb-12 container mx-auto px-6 max-w-3xl", isRtl ? "text-right" : "text-left")}>
        <h1 className="text-4xl font-serif mb-8">{content.title}</h1>
        <p className="text-muted-foreground leading-relaxed mb-6">{content.p1}</p>
        <p className="text-muted-foreground leading-relaxed mb-6">{content.p2}</p>
        <p className="text-muted-foreground leading-relaxed">{content.p3}</p>
        <p className="text-sm text-muted-foreground mt-8">Last updated: {new Date().toLocaleDateString()}</p>
      </div>
      <Footer />
    </div>
  );
}
