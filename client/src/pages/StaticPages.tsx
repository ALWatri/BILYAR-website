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
      <div className="pt-32 pb-12 container mx-auto px-6 max-w-2xl">
        <h1 className="text-4xl font-serif mb-8 text-center">{t.contact_title}</h1>
        <div className="space-y-8">
          <p className="text-center text-muted-foreground">
            {t.contact_desc}
          </p>
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={cn("text-xs uppercase tracking-widest font-bold block", isRtl ? "text-right" : "text-left")}>
                  {t.first_name}
                </label>
                <input className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none" />
              </div>
              <div className="space-y-2">
                <label className={cn("text-xs uppercase tracking-widest font-bold block", isRtl ? "text-right" : "text-left")}>
                  {t.last_name}
                </label>
                <input className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none" />
              </div>
            </div>
            <div className="space-y-2">
              <label className={cn("text-xs uppercase tracking-widest font-bold block", isRtl ? "text-right" : "text-left")}>
                {t.email}
              </label>
              <input type="email" className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none" />
            </div>
            <div className="space-y-2">
              <label className={cn("text-xs uppercase tracking-widest font-bold block", isRtl ? "text-right" : "text-left")}>
                {t.message}
              </label>
              <textarea className="w-full p-3 bg-secondary/20 border border-transparent focus:border-primary outline-none h-32" />
            </div>
            <button className="w-full bg-primary text-white py-4 uppercase tracking-widest hover:bg-primary/90 transition-colors">
              {t.send}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
