import { Link } from "wouter";
import { Instagram } from "lucide-react";
import { translations } from "@/lib/translations";
import { useEffect, useState } from "react";

// Simple custom icons for TikTok and Snapchat since they aren't in Lucide standard
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.13-1.47-.13 3.44-.3 6.88-.5 10.31-.1 2.44-1.12 4.96-3.3 6.13-2.26 1.34-5.4 1.14-7.3-1.1-1.63-1.92-1.63-4.9-.1-6.9 1.48-1.92 4.18-2.61 6.43-1.87.03-1.41.02-2.82.02-4.23-2.73-.32-5.74.5-7.66 2.63-2.22 2.45-2.24 6.42-.04 8.92 2.1 2.5 6.04 3.01 8.71 1.28 1.94-1.2 2.87-3.57 2.91-5.83.05-4.04.1-8.08.1-12.12-.96-.03-1.92-.04-2.88-.04-.08 0-.15 0-.21.01V.02z"/>
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 1.625c-3.111 0-5.875 2.16-5.875 6.5s2.438 4.625 2.438 4.625c0 .375-1.5 1.5-2.625 1.5-1.125 0-2.25 1.5-2.25 1.5s0 1.5 1.875 1.5c1.875 0 2.25.75 2.25.75s-.375.375-1.125 1.125c-.75.75-.75 1.5 0 1.5s2.625 1.125 5.25 1.125c2.625 0 4.5-.75 5.25-1.125s.75-.75 0-1.5c-.75-.75-1.125-1.125-1.125-1.125s.375-.75 2.25-.75c1.875 0 1.875-1.5 1.875-1.5s-1.125-1.5-2.25-1.5c-1.125 0-2.625-1.125-2.625-1.5 0 0 2.438-.285 2.438-4.625 0-4.34-2.764-6.5-5.875-6.5z"/>
  </svg>
);

export function Footer() {
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

  const t = translations[lang].footer;

  return (
    <footer className="bg-primary text-primary-foreground pt-20 pb-10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="space-y-6">
            <h2 
              className="text-3xl font-serif font-bold tracking-tighter"
              style={{ fontFamily: "var(--font-rigot, 'Playfair Display'), serif", direction: "ltr" }}
            >
              BILYAR.
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed font-light">
              {t.tagline}
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-serif font-medium mb-6 text-accent">{t.shop}</h3>
            <ul className="space-y-4">
              <li><Link href="/shop" className="hover:text-accent transition-colors text-sm uppercase tracking-wide">{t.new_arrivals}</Link></li>
              <li><Link href="/shop?cat=dresses" className="hover:text-accent transition-colors text-sm uppercase tracking-wide">{t.dresses}</Link></li>
              <li><Link href="/shop?cat=outerwear" className="hover:text-accent transition-colors text-sm uppercase tracking-wide">{t.outerwear}</Link></li>
              <li><Link href="/shop?cat=accessories" className="hover:text-accent transition-colors text-sm uppercase tracking-wide">{t.accessories}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-serif font-medium mb-6 text-accent">{t.company}</h3>
            <ul className="space-y-4">
              <li><Link href="/about" className="hover:text-accent transition-colors text-sm uppercase tracking-wide">{t.story}</Link></li>
              <li><Link href="/contact" className="hover:text-accent transition-colors text-sm uppercase tracking-wide">{t.contact}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-serif font-medium mb-6 text-accent">{t.follow}</h3>
            <div className="flex gap-6 items-center">
              <a href="#" className="hover:text-accent transition-colors" aria-label="Instagram">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="hover:text-accent transition-colors" aria-label="TikTok">
                <TikTokIcon className="h-6 w-6" />
              </a>
              <a href="#" className="hover:text-accent transition-colors" aria-label="Snapchat">
                <SnapchatIcon className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-primary-foreground/60 uppercase tracking-wider">
          <p>&copy; {new Date().getFullYear()} BILYAR Fashion House. {t.rights}</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-accent transition-colors">{t.privacy}</Link>
            <Link href="/terms" className="hover:text-accent transition-colors">{t.terms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

