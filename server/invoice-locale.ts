/**
 * Ensures invoice text is English-only (PDFKit Helvetica doesn't support Arabic).
 * Maps Arabic Kuwait areas to English when needed.
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
};

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
