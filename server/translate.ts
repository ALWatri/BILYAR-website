/**
 * Translate Arabic customer/order text to English for drivers.
 * Uses LibreTranslate public API (no key). Falls back to Google Cloud Translate if configured.
 */

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function hasArabic(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return ARABIC_REGEX.test(text);
}

async function translateWithLibreTranslate(text: string): Promise<string | null> {
  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text.slice(0, 5000),
        source: "ar",
        target: "en",
        format: "text",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { translatedText?: string };
    return data.translatedText ?? null;
  } catch {
    return null;
  }
}

async function translateWithGoogle(text: string): Promise<string | null> {
  try {
    const { Translate } = await import("@google-cloud/translate/build/src/v2");
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!projectId && !keyFilename) return null;
    const translate = new Translate({ projectId, keyFilename: keyFilename || undefined });
    const [translation] = await translate.translate(text.slice(0, 5000), "en");
    return Array.isArray(translation) ? translation[0] : translation;
  } catch {
    return null;
  }
}

/** Simple Arabic-to-Latin transliteration for names when translation fails. */
const AR_TO_LATIN: Record<string, string> = {
  ا: "a", أ: "a", آ: "a", إ: "i", ء: "'", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
  د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh",
  ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "w", ي: "y", ى: "a", ئ: "y", ؤ: "w",
  َ: "a", ُ: "u", ِ: "i", ً: "an", ٌ: "un", ٍ: "in", ّ: "", ْ: "",
};

export function transliterateArabic(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .split("")
    .map((c) => AR_TO_LATIN[c] ?? (c.trim() ? c : " "))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Translate text to English if it contains Arabic. Returns original string if no Arabic or translation fails. */
export async function translateToEnglish(text: string): Promise<string> {
  if (!text || typeof text !== "string") return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  if (!hasArabic(trimmed)) return text;

  const translated =
    (await translateWithGoogle(trimmed)) ?? (await translateWithLibreTranslate(trimmed));
  const result = translated && translated.trim() ? translated.trim() : text;
  if (hasArabic(result)) return transliterateArabic(result);
  return result;
}

/** Translate multiple strings; returns array in same order. Skips empty and non-Arabic. */
export async function translateBatchToEnglish(texts: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const text of texts) {
    results.push(await translateToEnglish(text));
  }
  return results;
}
