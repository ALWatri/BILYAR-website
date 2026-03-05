import PDFDocument from "pdfkit";
import type { Order, OrderItem, Settings } from "@shared/schema";
import { getInvoiceHtml } from "./invoice-html";

type OrderWithItems = Order & { items: OrderItem[] };

const EMERALD = "#0B3F34";
const EMERALD_DARK = "#072E26";
const GOLD = "#C8A96A";
const IVORY = "#F7F4EC";
const INK = "#1F1F1F";
const MUTED = "#6D6D6D";

function getDriver(order: OrderWithItems) {
  const o = order as OrderWithItems & {
    customerNameEn?: string | null;
    customerAddressEn?: string | null;
    customerCityEn?: string | null;
    customerCountryEn?: string | null;
  };
  return {
    name: o.customerNameEn ?? order.customerName,
    address: o.customerAddressEn ?? order.customerAddress,
    city: o.customerCityEn ?? order.customerCity,
    country: o.customerCountryEn ?? order.customerCountry,
  };
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

/** PDFKit fallback when Puppeteer/Chromium unavailable (e.g. Render) */
function generatePdfWithPdfKit(order: OrderWithItems, settings?: Settings | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const driver = getDriver(order);
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
    doc.y = 50;

    // BILYAR. logo
    doc.fontSize(32).fillColor(GOLD).font("Helvetica-Bold").text("BILYAR.", contentLeft, doc.y, { align: "center", width: contentWidth });
    doc.y += 28;
    // INVOICE
    doc.fontSize(11).fillColor(INK).font("Helvetica").text("INVOICE", contentLeft, doc.y, { align: "center", width: contentWidth });
    doc.y += 40;

    // BILL TO (left) | Invoice meta (right)
    doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("BILL TO", contentLeft);
    doc.y += 4;
    doc.fontSize(10).fillColor(INK).text(driver.name, contentLeft);
    doc.fontSize(9).text(`${driver.address}\n${driver.city}, ${driver.country}\n${order.customerPhone}\n${order.customerEmail || "—"}`, contentLeft);
    const billToBottom = doc.y;

    doc.y = 50 + 28 + 12;
    doc.fontSize(9).fillColor(INK);
    doc.text(`Invoice # ${order.orderNumber}`, contentRight, doc.y, { width: 180, align: "right" });
    doc.y += 14;
    doc.text(`Date: ${formatDate(order.createdAt)}`, contentRight, doc.y, { width: 180, align: "right" });
    doc.y += 14;
    doc.fillColor(EMERALD).text("Status: Paid", contentRight, doc.y, { width: 180, align: "right" });

    doc.y = Math.max(billToBottom, doc.y) + 20;

    // Table header
    const col1 = contentLeft;
    const col2 = contentLeft + 260;
    const col3 = contentLeft + 340;
    const col4 = contentRight - 80;
    const th = doc.y;
    doc.rect(contentLeft, th, contentWidth, 22).fill(EMERALD);
    doc.fontSize(9).fillColor("#ffffff").font("Helvetica-Bold");
    doc.text("DESCRIPTION", col1 + 8, th + 6);
    doc.text("PRICE", col2, th + 6);
    doc.text("QTY", col3, th + 6);
    doc.text("TOTAL", col4, th + 6);
    doc.y = th + 28;

    // Table rows
    doc.fontSize(10).fillColor(INK).font("Helvetica");
    for (const item of order.items) {
      const lineTotal = (item.price * item.quantity).toFixed(3);
      doc.text(item.productName, col1 + 8, doc.y, { width: 245 });
      doc.text((item.price).toFixed(3) + " KWD", col2, doc.y);
      doc.text(String(item.quantity), col3, doc.y);
      doc.text(lineTotal + " KWD", col4, doc.y);
      doc.y += 18;
    }
    doc.y += 12;

    // Summary (right-aligned)
    const sumLeft = contentRight - 200;
    doc.fontSize(10).fillColor(INK);
    doc.text("Subtotal", sumLeft, doc.y);
    doc.text((order.total - order.shippingCost).toFixed(3) + " KWD", contentRight, doc.y);
    doc.y += 14;
    doc.text("Delivery", sumLeft, doc.y);
    doc.text(order.shippingCost.toFixed(3) + " KWD", contentRight, doc.y);
    doc.y += 14;
    doc.moveTo(sumLeft, doc.y).lineTo(contentRight, doc.y).strokeColor("#E7E1D4").stroke();
    doc.y += 10;
    doc.fontSize(12).fillColor(EMERALD).font("Helvetica-Bold");
    doc.text("Total", sumLeft, doc.y);
    doc.text(order.total.toFixed(3) + " KWD", contentRight, doc.y);
    doc.y += 28;

    // PAYMENT DETAILS
    doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("PAYMENT DETAILS");
    doc.y += 6;
    const pm = paymentMethodLabel((order as { paymentMethod?: string }).paymentMethod);
    const pid = (order as { paymentId?: string }).paymentId || "—";
    doc.fontSize(10).fillColor(INK).font("Helvetica");
    doc.text(`Method: ${pm}`);
    doc.text(`Transaction: ${pid}`);
    doc.y += 28;

    // Divider
    doc.moveTo(contentLeft, doc.y).lineTo(contentRight, doc.y).strokeColor(GOLD).opacity(0.6).stroke().opacity(1);
    doc.y += 20;

    // Thank you
    doc.fontSize(22).fillColor(INK).font("Helvetica-Oblique").text("Thank you for your business!", contentLeft, doc.y, { align: "center", width: contentWidth });
    doc.y += 24;

    // Contact
    const siteUrl = process.env.SITE_URL || "https://bilyarofficial.com";
    const siteDisplay = siteUrl.replace(/^https?:\/\//, "");
    const storePhone = settings?.storePhone || "+965 XXXXXXXX";
    const storeEmail = settings?.storeEmail || "info@bilyarofficial.com";
    doc.fontSize(10).fillColor(MUTED).font("Helvetica").text(
      `${siteDisplay} • ${storePhone} • ${storeEmail}`,
      contentLeft, doc.y, { align: "center", width: contentWidth }
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

export async function generateInvoicePdf(order: OrderWithItems, settings?: Settings | null): Promise<Buffer> {
  try {
    const html = getInvoiceHtml(order, settings);
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
    console.warn("Puppeteer invoice failed, using PDFKit fallback:", puppeteerErr instanceof Error ? puppeteerErr.message : String(puppeteerErr));
    return generatePdfWithPdfKit(order, settings);
  }
}
