import type { Order, OrderItem, Settings } from "@shared/schema";
import { toEnglishCity, toEnglishText, addressToEnglish } from "./invoice-locale";
import { hasArabic } from "./translate";

type OrderWithItems = Order & { items: OrderItem[] };

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
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 2 && parts[0].startsWith("ال") && !parts[1].startsWith("ال")) {
    return `${parts[1]} ${parts[0]}`;
  }
  return cleaned;
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

export function getInvoiceHtml(order: OrderWithItems, settings?: Settings | null): string {
  const driver = getDriverEnglish(order);
  const siteUrl = process.env.SITE_URL || "https://bilyarofficial.com";
  const logoUrl = siteUrl.replace(/\/$/, "") + "/images/bilyar-logo.png";
  const storeEmail = escapeHtml(settings?.storeEmail || "info@bilyarofficial.com");
  const storePhone = escapeHtml(settings?.storePhone || "+965 96665735");
  const siteDisplay = escapeHtml(siteUrl.replace(/^https?:\/\//, ""));

  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr>
          <td>${escapeHtml(i.productName)}</td>
          <td class="num">${(i.price).toFixed(3)} KWD</td>
          <td class="num">${i.quantity}</td>
          <td class="num">${(i.price * i.quantity).toFixed(3)} KWD</td>
        </tr>`
    )
    .join("");

  const subtotal = (order.total - order.shippingCost).toFixed(3);
  const shipping = order.shippingCost.toFixed(3);
  const total = order.total.toFixed(3);
  const paymentMethod = paymentMethodLabel((order as { paymentMethod?: string }).paymentMethod);
  const paymentId = escapeHtml((order as { paymentId?: string }).paymentId || "—");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BILYAR Invoice - ${escapeHtml(order.orderNumber)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Caveat&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--emerald:#0B3F34;--emerald-dark:#072E26;--gold:#C8A96A;--ivory:#F7F4EC;--ink:#1F1F1F;--muted:#6D6D6D}
*{box-sizing:border-box}
body{margin:0;background:var(--emerald-dark);font-family:Inter,sans-serif;padding:24px;min-height:100vh;display:flex;align-items:center;justify-content:center}
.paper{width:210mm;min-height:297mm;background:var(--ivory);border:12px solid var(--emerald);position:relative;box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column}
.paper::before{content:"";position:absolute;inset:18px;border:1px solid var(--gold)}
.paper::after{content:"";position:absolute;inset:22px;border:1px solid var(--emerald)}
.wrap{position:relative;padding:48px;z-index:2;flex:1;display:flex;flex-direction:column}
.logo{font-family:"Cormorant Garamond",serif;font-size:42px;font-weight:600;color:var(--gold);margin:0;text-align:center;letter-spacing:.08em}
.logo-img{display:block;margin:0 auto;height:48px;width:auto}
.logo-img-wrap{margin:0;text-align:center}
.invoice-title{font-size:14px;letter-spacing:.2em;color:var(--ink);text-align:center;margin:8px 0 32px;font-weight:500}
.top-row{display:flex;justify-content:space-between;margin-bottom:32px;gap:24px}
.bill-to{flex:1}
.bill-to h4{font-size:10px;letter-spacing:.15em;color:var(--muted);margin:0 0 8px;font-weight:600}
.bill-to p{margin:0 0 4px;font-size:12px;color:var(--ink);line-height:1.5}
.invoice-meta{text-align:right}
.invoice-meta p{margin:0 0 4px;font-size:11px;color:var(--ink)}
.invoice-meta strong{color:var(--emerald)}
table{width:100%;border-collapse:collapse;margin:0 0 24px}
thead th{background:var(--emerald);color:#fff;padding:12px 14px;font-size:10px;letter-spacing:.12em;font-weight:600;text-align:left}
thead th.num{text-align:right}
tbody td{padding:12px 14px;border-bottom:1px solid #E7E1D4;font-size:12px;color:var(--ink)}
tbody td.num{text-align:right}
.summary-wrap{display:flex;justify-content:flex-end;margin-bottom:28px}
.summary{width:220px;display:grid;grid-template-columns:1fr auto;gap:0 20px;align-items:center}
.summary .row{display:contents}
.summary .row span{padding:6px 0;font-size:12px;color:var(--ink)}
.summary .total-row span{border-top:1px solid #E7E1D4;margin-top:8px;padding-top:10px;font-size:14px;font-weight:600;color:var(--emerald)}
.summary .total-row span:first-child{border-top:1px solid #E7E1D4;padding-top:10px;margin-top:8px}
.payment-section{margin-bottom:28px}
.payment-section h4{font-size:10px;letter-spacing:.15em;color:var(--muted);margin:0 0 8px;font-weight:600}
.payment-section p{margin:0 0 4px;font-size:12px;color:var(--ink)}
.divider{height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);margin:24px 0;opacity:.6}
.thanks{font-family:Caveat,sans-serif;font-size:28px;color:var(--ink);text-align:center;margin:0}
.footer-spacer{flex:1;min-height:40px}
.contact-footer{font-size:11px;color:var(--muted);text-align:center;letter-spacing:.08em;padding-top:16px}
</style>
</head>
<body>
<div class="paper">
<div class="wrap">
<h1 class="logo-img-wrap"><img src="${logoUrl}" alt="BILYAR" class="logo-img"/></h1>
<div class="top-row">
<div class="bill-to">
<h4>BILL TO</h4>
<p><strong>${escapeHtml(driver.name)}</strong></p>
${driver.address !== "—" ? `<p>${escapeHtml(driver.address)}</p>` : ""}
<p>${escapeHtml(driver.city)}, ${escapeHtml(driver.country)}</p>
<p>Phone: ${escapeHtml(order.customerPhone)}</p>
<p>Email: ${escapeHtml(order.customerEmail || "—")}</p>
</div>
<div class="invoice-meta">
<p>Order # <strong>${escapeHtml(order.orderNumber)}</strong></p>
<p>Date of issue: <strong>${formatDate(order.createdAt)}</strong></p>
<p>Status: <strong>Paid</strong></p>
</div>
</div>
<table>
<thead>
<tr>
<th>DESCRIPTION</th>
<th class="num">PRICE</th>
<th class="num">QTY</th>
<th class="num">TOTAL</th>
</tr>
</thead>
<tbody>
${itemsHtml}
</tbody>
</table>
<div class="summary-wrap">
<div class="summary">
<div class="row"><span>Subtotal</span><span>${subtotal} KWD</span></div>
<div class="row"><span>Delivery</span><span>${shipping} KWD</span></div>
<div class="row total-row"><span>Total</span><span>${total} KWD</span></div>
</div>
</div>
<div class="payment-section">
<h4>PAYMENT DETAILS</h4>
<p>Method: <strong>${escapeHtml(paymentMethod)}</strong></p>
<p>Transaction: <strong>${paymentId}</strong></p>
</div>
<div class="footer-spacer"></div>
<div class="divider"></div>
<p class="thanks">We are honoured by your trust.</p>
<footer class="contact-footer">${siteDisplay} • ${storePhone} • ${storeEmail}</footer>
</div>
</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  if (s == null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
