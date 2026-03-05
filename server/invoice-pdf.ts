import PDFDocument from "pdfkit";
import type { Order, OrderItem, Settings } from "@shared/schema";
import { getInvoiceHtml } from "./invoice-html";

type OrderWithItems = Order & { items: OrderItem[] };

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

/** PDFKit fallback when Puppeteer/Chromium unavailable (e.g. Render) */
function generatePdfWithPdfKit(order: OrderWithItems): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const driver = getDriver(order);

    doc.fontSize(24).fillColor("#0B3F34").text("BILYAR.", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#6D6D6D").text("PAYMENT SLIP • إيصال الدفع", { align: "center" });
    doc.fontSize(9).fillColor("#0B3F34").text("PAID • مدفوع", { align: "center" });
    doc.moveDown();

    doc.fontSize(9).fillColor("#6D6D6D").text("العميل • Customer");
    doc.fontSize(12).fillColor("#1F1F1F").text(driver.name);
    doc.fontSize(9).text(`${order.customerPhone}\n${order.customerEmail || "—"}`);
    doc.moveDown();

    doc.fontSize(9).fillColor("#6D6D6D").text(`Order: ${order.orderNumber}  |  Date: ${order.createdAt}`);
    doc.moveDown();

    let y = doc.y;
    doc.fontSize(9).fillColor("#0B3F34");
    doc.text("Item", 50, y);
    doc.text("Qty", 280, y);
    doc.text("Size", 320, y);
    doc.text("Total (KWD)", 400, y);
    doc.moveTo(50, y + 12).strokeColor("#E7E1D4").lineTo(550, y + 12).stroke();
    doc.moveDown();

    doc.fillColor("#1F1F1F");
    for (const item of order.items) {
      const lineTotal = (item.price * item.quantity).toFixed(3);
      doc.text(item.productName, 50);
      doc.text(String(item.quantity), 280);
      doc.text(item.size || "—", 320);
      doc.text(lineTotal, 400);
      doc.moveDown(0.4);
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).strokeColor("#E7E1D4").lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.text(`Subtotal: ${(order.total - order.shippingCost).toFixed(3)} KWD`, 400);
    doc.text(`Delivery: ${order.shippingCost} KWD`, 400);
    doc.fontSize(11).fillColor("#0B3F34").text(`Total: ${order.total.toFixed(3)} KWD`, 400);
    doc.moveDown();
    doc.fontSize(9).fillColor("#6D6D6D").text("Thank you for choosing Bilyar", { align: "center" });
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
    return generatePdfWithPdfKit(order);
  }
}
