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

const PRIVACY_CONTENT = {
  ar: {
    title: "سياسة الخصوصية",
    intro: "تحترم بيليار خصوصيتك وتلتزم بحماية بياناتك الشخصية وفقاً لأفضل الممارسات وقوانين دولة الكويت. توضح هذه السياسة كيفية جمعنا واستخدامنا وحمايتنا لمعلوماتك.",
    h1: "المعلومات التي نجمعها",
    p1: "نجمع المعلومات اللازمة لمعالجة طلباتك وخدمتك، منها: الاسم، البريد الإلكتروني، رقم الهاتف، عنوان التوصيل، تفاصيل المقاسات (للملابس المخصصة)، وملاحظات الطلب. لا نحفظ بيانات بطاقات الدفع الكاملة؛ تتم المعاملات عبر مزودي الدفع الآمنين (KNET / Deema).",
    h2: "كيف نستخدم معلوماتك",
    p2: "نستخدم بياناتك لمعالجة الطلبات، التواصل معك بخصوص الطلبات والتوصيل، إرسال إشعارات الدفع والتأكيد عبر الواتساب أو البريد عند موافقتك، ومنع الاحتيال.",
    h3: "مشاركة البيانات",
    p3: "لا نبيع بياناتك أو نشاركها مع أطراف ثالثة لأغراض تسويقية. قد نشاركها فقط مع شركاء موثوقين لتوصيل الطلبات ومعالجة الدفع، وفق التزامات تعاقدية صارمة.",
    h4: "حقوقك",
    p4: "لديك الحق في الاطلاع على بياناتك وطلب تصحيحها أو حذفها، وسحب موافقتك على الرسائل التسويقية في أي وقت. للتواصل: info@bilyarofficial.com.",
    h5: "التحديثات",
    p5: "نحدّث هذه السياسة عند الحاجة. يُنصح بمراجعتها دورياً.",
  },
  en: {
    title: "Privacy Policy",
    intro: "BILYAR respects your privacy and is committed to protecting your personal data in accordance with best practices and the laws of Kuwait. This policy explains how we collect, use, and safeguard your information.",
    h1: "Information We Collect",
    p1: "We collect the information necessary to process your orders and serve you: name, email, phone number, delivery address, measurement details (for custom garments), and order notes. We do not store full payment card details; transactions are handled by secure payment providers (KNET / Deema).",
    h2: "How We Use Your Information",
    p2: "We use your data to process orders, contact you about orders and delivery, send payment and confirmation notifications via WhatsApp or email when you consent, and prevent fraud.",
    h3: "Data Sharing",
    p3: "We do not sell your data or share it with third parties for marketing purposes. We may share it only with trusted partners for order delivery and payment processing, under strict contractual obligations.",
    h4: "Your Rights",
    p4: "You have the right to access your data, request correction or deletion, and withdraw consent for marketing messages at any time. Contact: info@bilyarofficial.com.",
    h5: "Updates",
    p5: "We update this policy when needed. We recommend reviewing it periodically.",
  },
};

export function Privacy() {
  const lang = useLang();
  const isRtl = lang === "ar";
  const c = PRIVACY_CONTENT[lang];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className={cn("pt-32 pb-12 container mx-auto px-6 max-w-3xl", isRtl ? "text-right" : "text-left")}>
        <h1 className="text-4xl font-serif mb-8">{c.title}</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">{c.intro}</p>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h1}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p1}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h2}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p2}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h3}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p3}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h4}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p4}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h5}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p5}</p>
        </section>
        <p className="text-sm text-muted-foreground mt-8">{lang === "ar" ? "آخر تحديث:" : "Last updated:"} {new Date().toLocaleDateString(lang === "ar" ? "ar-KW" : "en-GB")}</p>
      </div>
      <Footer />
    </div>
  );
}

const TERMS_CONTENT = {
  ar: {
    title: "شروط الاستخدام",
    intro: "مرحباً بكم في موقع بيليار. باستخدامك لهذا الموقع، فإنك توافق على الالتزام بهذه الشروط والأحكام. إن لم توافق عليها، يرجى عدم استخدام الموقع.",
    h1: "قبول الشروط",
    p1: "بوصولك إلى الموقع وإجراء عملية شراء أو استخدام أي خدمة، فإنك تقبل هذه الشروط. نحتفظ بحق تعديل الشروط في أي وقت، ويكون الاستمرار في الاستخدام بعد التعديل موافقةً على التغييرات.",
    h2: "متطلبات المستخدم",
    p2: "يجب أن يكون عمرك 18 عاماً فأكثر لاستخدام الموقع. تُحظر الاستخدامات غير القانونية، نقل الفيروسات أو الأكواد الضارة، أو انتهاك حقوق الملكية الفكرية للموقع أو العلامات التجارية.",
    h3: "الطلبات والدفع",
    p3: "يُعتبر الطلب مقيّماً عند استلام الدفع كاملاً. الأسعار بالدينار الكويتي وقد تتغير دون إشعار مسبق؛ في حال خطأ السعر، سنعلمك للاختيار بين الإلغاء أو تأكيد الطلب بالسعر الصحيح. وسائل الدفع المتاحة: KNET وبطاقات الائتمان و Deema.",
    h4: "التسليم",
    p4: "نقدم التوصيل داخل الكويت. تنطبق رسوم التوصيل وفق مناطق الكويت وقد تُعفى عند شراء عنصرين أو أكثر. يتم الاتصال بك عند تأكيد الطلب وفي حال أي تأخر متوقع. تنتقل المخاطر إليك عند استلام الطرد.",
    h5: "الاسترجاع والتبديل",
    p5: "للملابس المخصصة حسب المقاس، يُرجى التأكد من دقة المقاسات قبل التأكيد؛ قد تختلف سياسات الاسترجاع عن المنتجات الجاهزة. للاستفسارات عن الاسترجاع يرجى التواصل معنا.",
    h6: "الملكية الفكرية",
    p6: "جميع محتويات الموقع (نصوص، صور، شعارات) محمية بحقوق النشر والعلامات التجارية. لا يجوز نسخها أو استخدامها تجارياً دون إذن مكتوب من بيليار.",
    h7: "الاتصال",
    p7: "للتواصل: info@bilyarofficial.com أو +965 96665735.",
  },
  en: {
    title: "Terms of Service",
    intro: "Welcome to BILYAR. By using this website, you agree to be bound by these terms and conditions. If you do not agree, please do not use the site.",
    h1: "Acceptance of Terms",
    p1: "By accessing the site and placing an order or using any service, you accept these terms. We reserve the right to amend the terms at any time; continued use after changes constitutes acceptance of the amendments.",
    h2: "User Requirements",
    p2: "You must be 18 years or older to use the site. Illegal use, transmitting viruses or malicious code, or infringing intellectual property or trademarks is prohibited.",
    h3: "Orders and Payment",
    p3: "An order is confirmed upon full payment receipt. Prices are in Kuwaiti Dinar and may change without notice; in case of a pricing error, we will notify you to choose cancellation or confirmation at the correct price. Payment methods: KNET, credit cards, Deema.",
    h4: "Delivery",
    p4: "We deliver within Kuwait. Shipping fees apply by area and may be waived for 2+ items. We will contact you to confirm your order and in case of any expected delay. Risk passes to you upon receipt of the shipment.",
    h5: "Returns and Exchanges",
    p5: "For custom-tailored garments, please verify measurements before confirming; return policies may differ from ready-made items. Contact us for return inquiries.",
    h6: "Intellectual Property",
    p6: "All site content (text, images, logos) is protected by copyright and trademarks. It may not be copied or used commercially without written permission from BILYAR.",
    h7: "Contact",
    p7: "Contact: info@bilyarofficial.com or +965 96665735.",
  },
};

export function Terms() {
  const lang = useLang();
  const isRtl = lang === "ar";
  const c = TERMS_CONTENT[lang];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className={cn("pt-32 pb-12 container mx-auto px-6 max-w-3xl", isRtl ? "text-right" : "text-left")}>
        <h1 className="text-4xl font-serif mb-8">{c.title}</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">{c.intro}</p>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h1}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p1}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h2}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p2}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h3}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p3}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h4}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p4}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h5}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p5}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h6}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p6}</p>
        </section>
        <section className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold">{c.h7}</h2>
          <p className="text-muted-foreground leading-relaxed">{c.p7}</p>
        </section>
        <p className="text-sm text-muted-foreground mt-8">{lang === "ar" ? "آخر تحديث:" : "Last updated:"} {new Date().toLocaleDateString(lang === "ar" ? "ar-KW" : "en-GB")}</p>
      </div>
      <Footer />
    </div>
  );
}
