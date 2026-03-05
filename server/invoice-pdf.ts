import type { Order, OrderItem, Settings } from "@shared/schema";
import { getInvoiceHtml } from "./invoice-html";

type OrderWithItems = Order & { items: OrderItem[] };

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
}
