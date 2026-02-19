import PDFDocument from "pdfkit";
import type { Order, OrderItem } from "@shared/schema";

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

export function generateInvoicePdf(order: OrderWithItems): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const driver = getDriver(order);

    doc.fontSize(20).text("INVOICE", { align: "center" });
    doc.fontSize(10).text(`Order: ${order.orderNumber}`, { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Date: ${order.createdAt}`);
    doc.text(`Customer: ${driver.name}`);
    doc.text(`Phone: ${order.customerPhone}`);
    doc.moveDown();

    doc.fontSize(11).text("Shipping Address:", { continued: false });
    doc.fontSize(10).text(`${driver.address}`);
    doc.text(`${driver.city}, ${driver.country}`);
    doc.moveDown();

    doc.fontSize(11).text("Items", { underline: true });
    doc.moveDown(0.5);

    let y = doc.y;
    doc.fontSize(9);
    doc.text("Product", 50, y);
    doc.text("Qty", 250, y);
    doc.text("Size", 290, y);
    doc.text("Total (KWD)", 350, y);
    doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
    doc.moveDown();

    for (const item of order.items) {
      const lineTotal = (item.price * item.quantity).toFixed(3);
      doc.text(item.productName, 50);
      doc.text(String(item.quantity), 250);
      doc.text(item.size || "—", 290);
      doc.text(lineTotal, 350);
      doc.moveDown(0.5);
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.text(`Subtotal: ${(order.total - order.shippingCost).toFixed(3)} KWD`, 350);
    doc.text(`Shipping: ${order.shippingCost} KWD`, 350);
    doc.fontSize(11).text(`Total: ${order.total} KWD`, 350);
    doc.end();
  });
}
