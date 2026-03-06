/**
 * Ensures invoice text is English-only (PDFKit Helvetica doesn't support Arabic).
 * Maps Arabic Kuwait areas and address parts to English when needed.
 */
const AR_TO_EN_AREA: Record<string, string> = {
  "المطلاع": "Al-Mutlaa",
  "صباح الأحمد": "Sabah Al Ahmad",
  "جنوب صباح الأحمد": "South Sabah Al Ahmad",
  "الخيران": "Khiran",
  "أم الهيمان": "Umm Al Hayman",
  "عبد الله السالم": "Abdullah Al-Salem",
  "الدعية": "Daiya",
  "الدسمة": "Dasma",
  "الدوحة": "Doha",
  "كيفان": "Kaifan",
  "الخالدية": "Khaldiya",
  "المنصورية": "Mansouriya",
  "النزهة": "Nuzha",
  "القادسية": "Qadsiya",
  "الروضة": "Rawda",
  "الشامية": "Shamiya",
  "السالمية": "Salmiya",
  "حولي": "Hawalli",
  "الجابرية": "Jabriya",
  "الرميثية": "Rumaithiya",
  "الفحيحيل": "Fahaheel",
  "المهبولة": "Mahboula",
  "المنقف": "Mangaf",
  "الجهراء": "Jahra",
  "الفروانية": "Farwaniya",
  "خيطان": "Khaitan",
  "العمرية": "Omariya",
  "جليب الشيوخ": "Jleeb Al-Shuyoukh",
  "العارضية": "Ardiya",
  "العارضية الصناعية": "Industrial Ardiya",
};

function arDigitsToLatin(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function normalizeSpace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Convert Kuwait-style Arabic address to English for drivers/invoice */
export function addressToEnglish(addressRaw: string | null | undefined): string {
  const raw = (addressRaw ?? "").trim();
  if (!raw) return "—";
  const a0 = normalizeSpace(arDigitsToLatin(raw));
  if (!a0) return a0;
  let a = a0
    .replace(/قطعة/g, "Block")
    .replace(/قطعه/g, "Block")
    .replace(/شارع/g, "Street")
    .replace(/جادة/g, "Avenue")
    .replace(/منزل/g, "House")
    .replace(/بيت/g, "House")
    .replace(/عمارة/g, "Building")
    .replace(/شقة/g, "Apt");
  for (const [ar, en] of Object.entries(AR_TO_EN_AREA)) {
    if (a.startsWith(ar + " ") || a === ar) {
      a = en + a.slice(ar.length);
      break;
    }
  }
  return a.replace(/[،]/g, ",").replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim();
}

function isLatinOrAscii(s: string): boolean {
  return /^[\x00-\x7F\u0080-\u024F]+$/.test(s);
}

export function toEnglishText(value: string | null | undefined, fallback = "-"): string {
  if (value == null || String(value).trim() === "") return fallback;
  const v = String(value).trim();
  if (isLatinOrAscii(v)) return v;
  return AR_TO_EN_AREA[v] ?? fallback;
}

export function toEnglishCity(city: string | null | undefined): string {
  const v = (city || "").trim();
  if (!v) return "Kuwait";
  if (isLatinOrAscii(v)) return v;
  return AR_TO_EN_AREA[v] ?? "Kuwait";
}
