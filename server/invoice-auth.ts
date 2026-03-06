import crypto from "crypto";

const INVOICE_SECRET = process.env.INVOICE_SECRET || process.env.SESSION_SECRET || "bilyar-invoice-secret-change-in-production";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bilyar.com";
const SESSION_COOKIE = "bilyar_admin";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hmac(data: string): string {
  return crypto.createHmac("sha256", INVOICE_SECRET).update(data).digest("base64url");
}

/** Generate a signed token for invoice PDF access (order id → token). */
export function signInvoiceId(orderId: number): string {
  return hmac(`invoice:${orderId}`);
}

/** Verify that the token is valid for the given order id. */
export function verifyInvoiceToken(orderId: number, token: string | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const expected = signInvoiceId(orderId);
  return crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(token, "utf8"));
}

/** Create a signed invoice URL for the given order (for emails/redirects). */
export function getSignedInvoicePath(orderId: number, baseUrl: string, download = false): string {
  const t = signInvoiceId(orderId);
  const path = `/api/orders/${orderId}/invoice-pdf?t=${encodeURIComponent(t)}`;
  if (download) return `${path}&dl=1`;
  return path;
}

/** Create session value for admin (stored in cookie). */
export function createAdminSession(): string {
  const payload = `admin:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  return `${payload}.${hmac(payload)}`;
}

/** Verify admin session cookie; returns true if valid. */
export function verifyAdminSession(cookieHeader: string | undefined): boolean {
  if (!cookieHeader) return false;
  const prefix = SESSION_COOKIE + "=";
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(prefix));
  const value = match?.slice(prefix.length)?.trim();
  return verifyAdminSessionValue(value);
}

/** Verify raw session value (from cookie or Authorization Bearer). */
export function verifyAdminSessionValue(value: string | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = trimmed.slice(0, lastDot);
  const sig = trimmed.slice(lastDot + 1);
  const expected = hmac(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(sig, "utf8"))) return false;
  const parts = payload.split(":");
  if (parts[0] !== "admin" || parts.length < 3) return false;
  const created = parseInt(parts[1], 10);
  if (isNaN(created) || Date.now() - created > SESSION_MAX_AGE_MS) return false;
  return true;
}

export function getAdminSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function checkAdminCredentials(email: string, password: string): boolean {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}
