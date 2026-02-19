/**
 * WhatsApp Cloud API integration
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const WHATSAPP_API = "https://graph.facebook.com/v21.0";

export function isWhatsAppConfigured(): boolean {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function api(
  toPhone: string,
  body: object
): Promise<{ ok: boolean; data?: unknown; error?: { message: string } }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return { ok: false, error: { message: "WhatsApp not configured" } };
  }
  const url = `${WHATSAPP_API}/${phoneId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formatPhone(toPhone),
      ...body,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json.error?.message || json.error || res.statusText;
    return { ok: false, error: { message: String(err) } };
  }
  return { ok: true, data: json };
}

/** Format phone for WhatsApp: country code + number, no + or spaces */
export function formatPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Send a template message (required for business-initiated conversations) */
export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams?: string[],
  headerParams?: string,
  buttonParams?: string[]
): Promise<{ ok: boolean; error?: string }> {
  const components: object[] = [];
  if (bodyParams?.length) {
    components.push({
      type: "body",
      parameters: bodyParams.map((text) => ({ type: "text", text })),
    });
  }
  if (headerParams) {
    components.push({
      type: "header",
      parameters: [{ type: "text", text: headerParams }],
    });
  }
  if (buttonParams?.length) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: buttonParams.map((text) => ({ type: "text", text })),
    });
  }
  const body: Record<string, unknown> = {
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length ? { components } : {}),
    },
  };
  const result = await api(formatPhone(to), body);
  return result.ok ? { ok: true } : { ok: false, error: result.error?.message };
}

/** Send a text message (only within 24h of customer reply) */
export async function sendText(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const result = await api(formatPhone(to), {
    type: "text",
    text: { body: text },
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error?.message };
}

/** Send a document (e.g. invoice PDF) - use template with document or send as media */
export async function sendDocument(
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await api(formatPhone(to), {
    type: "document",
    document: {
      link: documentUrl,
      caption: caption || "",
      filename,
    },
  });
  return result.ok ? { ok: true } : { ok: false, error: result.error?.message };
}
