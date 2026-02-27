/**
 * WhatsApp via Twilio (BSP)
 * Docs: https://www.twilio.com/docs/whatsapp
 */

import twilio from "twilio";

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

function getClient(): twilio.Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

/** Format phone for WhatsApp: E.164 with country code */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("965")) return digits;
  if (digits.length === 8 && !digits.startsWith("965")) return `965${digits}`; // Kuwait local
  return digits;
}

/** WhatsApp address format */
function toWhatsApp(phone: string): string {
  const p = formatPhone(phone);
  return p.startsWith("whatsapp:") ? p : `whatsapp:+${p}`;
}

/** Resolve From: use MessagingServiceSid or WhatsApp From number */
function getFrom(): string | undefined {
  const svc = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (svc) return undefined; // will use messagingServiceSid
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (from) return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  return undefined;
}

/** Send a template message (Content API) */
export async function sendTemplate(
  to: string,
  contentSid: string,
  contentVariables?: Record<string, string>
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return { ok: false, error: "WhatsApp (Twilio) not configured" };

  const params: Record<string, unknown> = {
    to: toWhatsApp(to),
    contentSid,
  };
  const from = getFrom();
  if (from) params.from = from;
  else if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  else return { ok: false, error: "Set TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID" };

  if (contentVariables && Object.keys(contentVariables).length > 0) {
    params.contentVariables = JSON.stringify(contentVariables);
  }

  try {
    await client.messages.create(params as any);
    return { ok: true };
  } catch (err: any) {
    const msg = err?.message || String(err);
    return { ok: false, error: msg };
  }
}

/** Send a text message (only within 24h customer service window) */
export async function sendText(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return { ok: false, error: "WhatsApp (Twilio) not configured" };

  const params: Record<string, unknown> = {
    to: toWhatsApp(to),
    body: text,
  };
  const from = getFrom();
  if (from) params.from = from;
  else if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  else return { ok: false, error: "Set TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID" };

  try {
    await client.messages.create(params as any);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Send a document (e.g. invoice PDF) */
export async function sendDocument(
  to: string,
  documentUrl: string,
  _filename?: string,
  caption?: string
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return { ok: false, error: "WhatsApp (Twilio) not configured" };

  const params: Record<string, unknown> = {
    to: toWhatsApp(to),
    mediaUrl: [documentUrl],
  };
  if (caption) params.body = caption;

  const from = getFrom();
  if (from) params.from = from;
  else if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  else return { ok: false, error: "Set TWILIO_WHATSAPP_FROM or TWILIO_MESSAGING_SERVICE_SID" };

  try {
    await client.messages.create(params as any);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || String(err) };
  }
}
