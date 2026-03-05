import type { Order, OrderItem, Settings } from "@shared/schema";

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

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "—";
  if (!/T|\s\d/.test(dateStr)) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function paymentMethodLabel(method: string | undefined): string {
  const m = (method || "tap").toLowerCase();
  if (m === "tap" || m === "card") return "KNET / Card";
  if (m === "deema") return "Deema";
  if (m === "manual") return "Manual";
  return method || "—";
}

function statusLabel(status: string): string {
  const s = status?.toLowerCase();
  if (s === "paid" || s === "processing") return "Preparing";
  if (s === "shipped") return "Shipped";
  if (s === "delivered") return "Delivered";
  if (s === "pending" || s === "unfinished") return "Pending";
  return status || "—";
}

export function getInvoiceHtml(order: OrderWithItems, settings?: Settings | null): string {
  const driver = getDriver(order);
  const siteUrl = process.env.SITE_URL || "https://bilyarofficial.com";
  const orderUrl = `${siteUrl}/order/${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(orderUrl)}`;

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
  const paymentId = (order as { paymentId?: string }).paymentId || "—";
  const deliveryStatus = statusLabel(order.status);
  const eta = order.status === "Shipped" ? "24-48h" : "24-48h";

  const slipNumber = `PS-${String(order.id).padStart(4, "0")}`;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BILYAR Payment Slip - ${escapeHtml(order.orderNumber)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{--emerald:#0B3F34;--emerald2:#072E26;--gold:#C8A96A;--ivory:#F7F4EC;--ink:#1F1F1F;--muted:#6D6D6D;--line:#E7E1D4}
*{box-sizing:border-box}
body{margin:0;background:#111;font-family:Tajawal,Inter,sans-serif;padding:20px;color:var(--ink)}
.paper{width:210mm;min-height:297mm;margin:auto;background:var(--ivory);border:10px solid var(--emerald);position:relative;box-shadow:0 20px 60px rgba(0,0,0,.4);overflow:hidden}
.paper::before{content:"";position:absolute;inset:14px;border:2px solid rgba(200,169,106,.7)}
.watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:"Cormorant Garamond",serif;font-size:220px;color:rgba(200,169,106,.05);letter-spacing:.2em;pointer-events:none}
.wrap{position:relative;padding:40px;z-index:2}
.brand{text-align:center;margin-bottom:20px}
.logo{font-family:"Cormorant Garamond",serif;font-size:46px;letter-spacing:.12em;color:var(--gold);margin:0}
.rule{height:2px;width:180px;background:var(--gold);margin:14px auto}
.subtitle{font-size:12px;letter-spacing:.25em;text-transform:uppercase}
.status{display:inline-block;margin-top:10px;padding:8px 14px;border-radius:30px;background:rgba(11,63,52,.1);border:1px solid var(--gold);font-size:12px;letter-spacing:.1em}
.top{display:flex;justify-content:space-between;margin-top:30px;border-top:1px solid var(--line);padding-top:20px}
.block h4{margin:0 0 8px;font-size:12px;color:var(--muted);letter-spacing:.15em}
.big{font-size:18px;margin:0 0 6px}
.meta{text-align:left}
.kv{display:flex;justify-content:space-between;margin:6px 0;font-size:13px}
table{width:100%;border-collapse:collapse;margin-top:25px;font-size:13px}
thead th{background:var(--emerald);color:var(--gold);padding:12px;font-size:11px;letter-spacing:.12em}
tbody td{padding:12px;border-bottom:1px solid var(--line)}
.num{text-align:left}
.summary{margin-top:20px;display:flex;justify-content:flex-end}
.summary-card{width:300px}
.sum-row{display:flex;justify-content:space-between;margin:7px 0}
.total{font-size:20px;font-family:"Cormorant Garamond",serif;border-top:1px solid var(--line);padding-top:10px;margin-top:10px}
.cards{display:flex;gap:20px;margin-top:25px}
.card{flex:1;border:1px solid rgba(200,169,106,.4);padding:14px;border-radius:6px}
.row{display:flex;justify-content:space-between;margin:6px 0;font-size:13px}
.qr{margin-top:25px;text-align:center}
.qr img{width:90px}
.footer{text-align:center;margin-top:30px}
.thanks{font-family:"Cormorant Garamond",serif;font-size:24px;margin-bottom:8px}
.contact{font-size:12px;letter-spacing:.1em}
</style>
</head>
<body>
<div class="paper">
<div class="watermark">B</div>
<div class="wrap">
<div class="brand">
<h1 class="logo">BILYAR.</h1>
<div class="rule"></div>
<div class="subtitle">PAYMENT SLIP • إيصال الدفع</div>
<div class="status">PAID • مدفوع</div>
</div>
<div class="top">
<div class="block">
<h4>العميل • Customer</h4>
<p class="big">${escapeHtml(driver.name)}</p>
<div>
${escapeHtml(order.customerPhone)}<br>
${escapeHtml(order.customerEmail || "—")}
</div>
</div>
<div class="block meta">
<div class="kv"><span>Slip #</span><strong>${escapeHtml(slipNumber)}</strong></div>
<div class="kv"><span>Order #</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
<div class="kv"><span>التاريخ</span><strong>${escapeHtml(formatDate(order.createdAt))}</strong></div>
<div class="kv"><span>الوقت</span><strong>${formatTime(order.createdAt)}</strong></div>
</div>
</div>
<table>
<thead>
<tr>
<th>Item / المنتج</th>
<th>السعر</th>
<th>الكمية</th>
<th>المجموع</th>
</tr>
</thead>
<tbody>
${itemsHtml}
</tbody>
</table>
<div class="summary">
<div class="summary-card">
<div class="sum-row"><span>Subtotal</span><strong>${subtotal} KWD</strong></div>
<div class="sum-row"><span>Delivery</span><strong>${shipping} KWD</strong></div>
<div class="sum-row total"><span>Total</span><strong>${total} KWD</strong></div>
</div>
</div>
<div class="cards">
<div class="card">
<h4>Payment</h4>
<div class="row"><span>Method</span><strong>${escapeHtml(paymentMethod)}</strong></div>
<div class="row"><span>Transaction</span><strong>${escapeHtml(paymentId)}</strong></div>
</div>
<div class="card">
<h4>Delivery</h4>
<div class="row"><span>Status</span><strong>${escapeHtml(deliveryStatus)}</strong></div>
<div class="row"><span>ETA</span><strong>${escapeHtml(eta)}</strong></div>
</div>
</div>
<div class="qr">
<img src="${escapeHtml(qrUrl)}" alt="QR" />
<p style="font-size:11px;color:#6D6D6D">Scan to verify order</p>
</div>
<div class="footer">
<p class="thanks">Thank you for choosing Bilyar</p>
<div class="contact">
${escapeHtml(siteUrl.replace(/^https?:\/\//, ""))} • ${escapeHtml(settings?.storePhone || "+965 XXXXXXXX")} • ${escapeHtml(settings?.storeEmail || "info@bilyarofficial.com")}
</div>
</div>
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
