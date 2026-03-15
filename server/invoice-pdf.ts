import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import type { Order, OrderItem, Settings } from "@shared/schema";
import { getInvoiceHtml } from "./invoice-html";
import { toEnglishCity, toEnglishText, addressToEnglish } from "./invoice-locale";
import { hasArabic } from "./translate";

type OrderWithItems = Order & { items: OrderItem[] };

const EMERALD = "#0B3F34";
const EMERALD_DARK = "#072E26";
const GOLD = "#C8A96A";
const IVORY = "#F7F4EC";
const INK = "#1F1F1F";
const MUTED = "#6D6D6D";

function getDriverEnglish(order: OrderWithItems) {
  const o = order as OrderWithItems & {
    customerNameEn?: string | null;
    customerAddressEn?: string | null;
    customerCityEn?: string | null;
    customerCountryEn?: string | null;
  };
  const rawName = (order.customerName ?? o.customerNameEn)?.trim();
  const name = normalizeDisplayName(rawName || "");
  return {
    name: name || "—",
    address: o.customerAddressEn ? toEnglishText(o.customerAddressEn, "—") : addressToEnglish(order.customerAddress),
    city: toEnglishCity(o.customerCityEn ?? order.customerCity),
    country: toEnglishText(o.customerCountryEn ?? order.customerCountry, "Kuwait"),
  };
}

function normalizeDisplayName(name: string): string {
  const cleaned = (name || "").trim();
  if (!cleaned || !hasArabic(cleaned)) return cleaned;
  return cleaned.replace(/\s+/g, " ");
}

function toPdfArabicDisplay(name: string): string {
  const cleaned = (name || "").trim().replace(/\s+/g, " ");
  if (!cleaned || !hasArabic(cleaned)) return cleaned;
  // PDFKit text flow is LTR in this layout; reverse Arabic words so the visual
  // output reads in the intended first-name/last-name order.
  const words = cleaned.split(" ").filter(Boolean);
  return words.reverse().join("   ");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function paymentMethodLabel(method: string | undefined): string {
  const m = (method || "tap").toLowerCase();
  if (m === "tap" || m === "card") return "KNET / Card";
  if (m === "deema") return "Deema";
  if (m === "manual") return "Manual";
  return method || "—";
}

function safeStr(v: unknown): string {
  if (v == null) return "-";
  const s = String(v).trim();
  return s || "-";
}

function safeNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getLogoPath(): string | null {
  return getImagePath("bilyar-logo.png");
}

function getImagePath(filename: string): string | null {
  const candidates = [
    path.join(__dirname, "public", "images", filename),
    path.join(process.cwd(), "dist", "public", "images", filename),
    path.join(process.cwd(), "client", "public", "images", filename),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function loadSvgAsPngBuffer(filename: string): Promise<Buffer | null> {
  const p = getImagePath(filename);
  if (!p) return null;
  try {
    return await sharp(p).png().toBuffer();
  } catch {
    return null;
  }
}

function getArabicFontPath(): string | null {
  const candidates = [
    path.join(process.cwd(), "assets", "fonts", "NotoNaskhArabic-Regular.ttf"),
    path.join(process.cwd(), "client", "public", "fonts", "NotoNaskhArabic-Regular.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** PDFKit fallback when Puppeteer/Chromium unavailable (e.g. Render) */
async function generatePdfWithPdfKit(order: OrderWithItems, settings?: Settings | null): Promise<Buffer> {
  const [knetPng, visaPng, mcPng, applePng, deemaPng] = await Promise.all([
    loadSvgAsPngBuffer("knet.svg"),
    loadSvgAsPngBuffer("visa.svg"),
    loadSvgAsPngBuffer("mastercard.svg"),
    loadSvgAsPngBuffer("applepay.svg"),
    loadSvgAsPngBuffer("deema.svg"),
  ]);

  return new Promise((resolve, reject) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    const total = safeNum(order?.total, 0);
    const shippingCost = safeNum(order?.shippingCost, 0);
    const discountAmount = safeNum((order as Order & { discountAmount?: number | null }).discountAmount, 0);
    const subtotal = total + discountAmount - shippingCost;

    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const driver = order ? getDriverEnglish(order) : { name: "-", address: "-", city: "Kuwait", country: "Kuwait" };
    const pageW = 595;
    const pageH = 842;
    const margin = 24;
    const border = 10;
    const contentLeft = margin + border + 10;
    const contentRight = pageW - contentLeft;
    const contentWidth = contentRight - contentLeft;
    const paperW = pageW - 2 * margin;
    const paperH = pageH - 2 * margin;

    // Dark green background
    doc.rect(0, 0, pageW, pageH).fill(EMERALD_DARK);
    // Cream paper
    doc.rect(margin, margin, paperW, paperH).fill(IVORY);
    // Dark green thick border
    doc.rect(margin, margin, paperW, paperH).lineWidth(border).stroke(EMERALD);
    // Gold inner line
    doc.rect(margin + border + 2, margin + border + 2, paperW - 2 * (border + 2), paperH - 2 * (border + 2))
      .lineWidth(1).stroke(GOLD);
    // Thin emerald inner
    doc.rect(margin + border + 5, margin + border + 5, paperW - 2 * (border + 5), paperH - 2 * (border + 5))
      .lineWidth(1).stroke(EMERALD);

    doc.x = contentLeft;
    const topStartY = margin + border + 1;
    doc.y = topStartY;

    const logoPath = getLogoPath();
    const logoHeight = 36;
    const logoWidth = 180;
    if (logoPath) {
      doc.image(logoPath, contentLeft + (contentWidth - logoWidth) / 2, doc.y, { width: logoWidth } as any);
      doc.y += logoHeight + 8;
    } else {
      doc.fontSize(32).fillColor(GOLD).font("Helvetica-Bold").text("BILYAR.", contentLeft, doc.y, { align: "center", width: contentWidth });
      doc.y += 28;
    }
    // INVOICE line removed per request
    doc.y += 16;

    // BILL TO (left) | Order # + Date + Status (right)
    doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("BILL TO", contentLeft);
    doc.y += 6;
    const arabicFontPath = getArabicFontPath();
    const hasArabicName = hasArabic(driver.name);
    const displayName = hasArabicName ? toPdfArabicDisplay(driver.name) : driver.name;
    if (hasArabicName && arabicFontPath) {
      doc.font(arabicFontPath);
    } else {
      doc.font("Helvetica");
    }
    doc.fontSize(10).fillColor(INK).text(displayName, contentLeft, doc.y, { width: 280, align: "left" });
    if (hasArabicName && arabicFontPath) doc.font("Helvetica");
    doc.y += 14;
    const addressLine = driver.address !== "—" ? driver.address : "";
    const cityCountry = [driver.city, driver.country].filter(Boolean).join(", ");
    doc.fontSize(9).fillColor(INK).font("Helvetica");
    if (addressLine) {
      doc.text(addressLine, contentLeft, doc.y, { width: 280 });
      doc.y += 12;
    }
    if (cityCountry) {
      doc.text(cityCountry, contentLeft, doc.y, { width: 280 });
      doc.y += 12;
    }
    doc.text(`Phone: ${safeStr(order?.customerPhone)}`, contentLeft, doc.y, { width: 280 });
    doc.y += 12;
    doc.text(`Email: ${safeStr(order?.customerEmail)}`, contentLeft, doc.y, { width: 280 });
    const billToBottom = doc.y;

    const metaWidth = 180;
    const metaX = contentLeft + contentWidth - metaWidth;
    doc.y = topStartY + (logoPath ? logoHeight + 8 : 28) + 12;
    doc.fontSize(9).fillColor(INK);
    doc.text(`Order # ${safeStr(order?.orderNumber)}`, metaX, doc.y, { width: metaWidth, align: "right" });
    doc.y += 14;
    doc.text(`Date of issue: ${formatDate(safeStr(order?.createdAt))}`, metaX, doc.y, { width: metaWidth, align: "right" });
    doc.y += 14;
    doc.fillColor(EMERALD).text("Status: Paid", metaX, doc.y, { width: metaWidth, align: "right" });

    doc.y = Math.max(billToBottom, doc.y) + 20;

    // Table header
    const tableInset = 8;
    const colGap = 8;
    const tableLeft = contentLeft + tableInset;
    const tableRight = contentRight - tableInset;
    const totalW = 98;
    const qtyW = 44;
    const priceW = 88;
    const totalX = tableRight - totalW;
    const qtyX = totalX - colGap - qtyW;
    const priceX = qtyX - colGap - priceW;
    const descX = tableLeft;
    const descW = priceX - colGap - descX;
    const th = doc.y;
    const ROW_HEIGHT = 20;
    doc.rect(contentLeft, th, contentWidth, 22).fill(EMERALD);
    doc.fontSize(9).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("DESCRIPTION", descX, th + 6, { width: descW });
    doc.text("PRICE", priceX, th + 6, { width: priceW, align: "right" });
    doc.text("QTY", qtyX, th + 6, { width: qtyW, align: "center" });
    doc.text("TOTAL", totalX, th + 6, { width: totalW, align: "right" });
    doc.y = th + 28;

    // Table rows — fixed row height for consistent spacing
    doc.fontSize(10).fillColor(INK).font("Helvetica");
    for (const item of items) {
      const rowY = doc.y;
      const price = safeNum(item?.price, 0);
      const qty = Math.max(1, Math.floor(safeNum(item?.quantity, 1)));
      const lineTotal = (price * qty).toFixed(3);
      doc.text(safeStr(item?.productName), descX, rowY, { width: descW, lineBreak: false, ellipsis: true });
      doc.text(price.toFixed(3) + " KWD", priceX, rowY, { width: priceW, align: "right", lineBreak: false });
      doc.text(String(qty), qtyX, rowY, { width: qtyW, align: "center", lineBreak: false });
      doc.text(lineTotal + " KWD", totalX, rowY, { width: totalW, align: "right", lineBreak: false });
      doc.y = rowY + ROW_HEIGHT;
    }
    doc.y += 14;

    // Summary — aligned to the same table columns (label near price, value on total edge)
    const sumLabelX = priceX;
    const sumLabelW = qtyX - colGap - sumLabelX;
    doc.fontSize(10).fillColor(INK).font("Helvetica");
    let summaryY = doc.y;
    doc.text("Subtotal", sumLabelX, summaryY, { width: sumLabelW, align: "right", lineBreak: false });
    doc.text(subtotal.toFixed(3) + " KWD", totalX, summaryY, { width: totalW, align: "right", lineBreak: false });
    summaryY += 18;
    if (discountAmount > 0) {
      const code = (order as Order & { discountCode?: string | null }).discountCode;
      doc.text("Discount" + (code ? ` (${code})` : ""), sumLabelX, summaryY, { width: sumLabelW, align: "right", lineBreak: false });
      doc.text("-" + discountAmount.toFixed(3) + " KWD", totalX, summaryY, { width: totalW, align: "right", lineBreak: false });
      summaryY += 18;
    }
    doc.text("Delivery", sumLabelX, summaryY, { width: sumLabelW, align: "right", lineBreak: false });
    doc.text(shippingCost.toFixed(3) + " KWD", totalX, summaryY, { width: totalW, align: "right", lineBreak: false });
    summaryY += 18;
    doc.y = summaryY;
    doc.moveTo(sumLabelX, doc.y).lineTo(tableRight, doc.y).strokeColor("#E7E1D4").stroke();
    doc.y += 12;
    doc.fontSize(12).fillColor(EMERALD).font("Helvetica-Bold");
    const totalRowY = doc.y;
    doc.text("Total", sumLabelX, totalRowY, { width: sumLabelW, align: "right", lineBreak: false });
    doc.text(total.toFixed(3) + " KWD", totalX, totalRowY, { width: totalW, align: "right", lineBreak: false });
    doc.y = totalRowY + 28;

    // PAYMENT DETAILS - left-aligned, full width for readability
    doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("PAYMENT DETAILS", contentLeft);
    doc.y += 6;
    const pm = paymentMethodLabel((order as { paymentMethod?: string })?.paymentMethod);
    const pid = safeStr((order as { paymentId?: string })?.paymentId);
    doc.fontSize(10).fillColor(INK).font("Helvetica");
    doc.text(`Method: ${pm}`, contentLeft, doc.y, { width: contentWidth });
    doc.y += 14;
    doc.text(`Transaction: ${pid}`, contentLeft, doc.y, { width: contentWidth });
    doc.y += 24;

    // Footer fixed at very bottom of page
    const footerThanksY = pageH - margin - 90;
    const footerContactY = pageH - margin - 32;

    // Divider above footer
    doc.moveTo(contentLeft, footerThanksY - 22).lineTo(contentRight, footerThanksY - 22).strokeColor(GOLD).opacity(0.6).stroke().opacity(1);

    // Thank you — fixed position
    doc.fontSize(18).fillColor(INK).font("Helvetica-Oblique").text("We are honoured by your trust.", contentLeft, footerThanksY, { align: "center", width: contentWidth });

    // Payment logos — KNET, Visa, Mastercard, Apple Pay, Deema (Tap-style SVGs as PNG)
    const logoW = 34;
    const logoH = 22;
    const logoGap = 10;
    const logosStartY = footerThanksY + 28;
    const logoBuffers = [knetPng, visaPng, mcPng, applePng, deemaPng].filter(Boolean);
    const totalLogosW = logoBuffers.length * logoW + (logoBuffers.length - 1) * logoGap;
    let logoX = contentLeft + (contentWidth - totalLogosW) / 2;
    for (const buf of logoBuffers) {
      doc.image(buf as Buffer, logoX, logosStartY, { fit: [logoW, logoH], align: "center", valign: "center" } as any);
      logoX += logoW + logoGap;
    }

    // Contact — fixed at very bottom
    const siteUrl = process.env.SITE_URL || "https://bilyarofficial.com";
    const siteDisplay = siteUrl.replace(/^https?:\/\//, "");
    const storePhone = settings?.storePhone || "+965 96665735";
    const storeEmail = settings?.storeEmail || "info@bilyarofficial.com";
    doc.fontSize(10).fillColor(MUTED).font("Helvetica").text(
      `${siteDisplay} • ${storePhone} • ${storeEmail}`,
      contentLeft, footerContactY, { align: "center", width: contentWidth }
    );

    doc.end();
  });
}

let browser: Awaited<ReturnType<typeof import("puppeteer").default.launch>> | null = null;

async function getBrowser() {
  if (browser && browser.connected) return browser;
  const puppeteer = await import("puppeteer");
  browser = await puppeteer.default.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  browser.on("disconnected", () => { browser = null; });
  return browser;
}

const USE_PUPPETEER = process.env.DISABLE_PUPPETEER !== "1" && !process.env.RENDER;

async function enrichOrderForInvoice(order: OrderWithItems): Promise<OrderWithItems> {
  const o = order as OrderWithItems & {
    customerNameEn?: string | null;
    customerAddressEn?: string | null;
    customerCityEn?: string | null;
    customerCountryEn?: string | null;
  };

  const customerNameEn = (order.customerName || o.customerNameEn || "").trim() || "Customer";

  let customerAddressEn = (o.customerAddressEn || "").trim();
  if (!customerAddressEn || hasArabic(customerAddressEn)) {
    customerAddressEn = addressToEnglish(order.customerAddress);
  }

  let customerCityEn = (o.customerCityEn || "").trim();
  if (!customerCityEn || hasArabic(customerCityEn)) {
    customerCityEn = toEnglishCity(order.customerCity);
  }

  let customerCountryEn = (o.customerCountryEn || "").trim();
  if (!customerCountryEn || hasArabic(customerCountryEn)) {
    customerCountryEn = toEnglishText(order.customerCountry, "Kuwait");
  }

  return {
    ...(order as any),
    customerNameEn,
    customerAddressEn,
    customerCityEn,
    customerCountryEn,
  } as OrderWithItems;
}

export async function generateInvoicePdf(order: OrderWithItems, settings?: Settings | null): Promise<Buffer> {
  const enriched = await enrichOrderForInvoice(order);
  if (USE_PUPPETEER) {
    try {
      const html = getInvoiceHtml(enriched, settings);
      const b = await getBrowser();
      const page = await b.newPage();
      try {
        await page.setContent(html, {
          waitUntil: ["networkidle0", "load"],
          timeout: 15000,
        });
        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        });
        return Buffer.from(pdf);
      } finally {
        await page.close();
      }
    } catch (puppeteerErr) {
      console.warn("Puppeteer invoice failed, using PDFKit:", puppeteerErr instanceof Error ? puppeteerErr.message : String(puppeteerErr));
    }
  }
  return generatePdfWithPdfKit(enriched, settings);
}
