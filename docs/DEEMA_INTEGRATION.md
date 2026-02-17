# Deema BNPL Integration (BILYAR)

This document aligns BILYAR’s Deema integration with the [official Deema BNPL Integration Guide](https://docs.deema.me/docs/getting-started-with-deema-bnpl-solution).

---

## 1. Overview

Deema **Buy Now, Pay Later (BNPL)** lets customers pay in installments while the merchant is paid upfront. Integration uses:

- **Sandbox** for testing, then **Live** for real transactions.
- **Webhooks** so Deema can notify your server when payment status changes.
- **Checkout flow**: customer chooses Deema → your server creates order and initiates payment → customer is redirected to Deema → after payment they return to your success or failure page.

---

## 2. Environment (Sandbox vs Live)

Use separate config for Sandbox and Live.

| Variable | Sandbox | Live |
|----------|---------|------|
| `DEEMA_BASE_URL` | `https://sandbox-api.deema.me` or `https://staging-api.deema.me` | `https://api.deema.me` |
| `DEEMA_API_KEY` | From Merchant Portal (Sandbox) | From Deema after go-live |
| `DEEMA_WEBHOOK_SECRET` | Same value as in Portal → Webhook Headers | Same value as in Live Portal |

The server uses **Basic** auth with the API key (per Deema docs). Sandbox base URL defaults to `sandbox-api.deema.me`; if your portal uses `staging-api.deema.me`, set `DEEMA_BASE_URL=https://staging-api.deema.me`.

In `.env`:

```bash
# Sandbox (default)
DEEMA_API_KEY=your_sandbox_api_key
DEEMA_BASE_URL=https://sandbox-api.deema.me
DEEMA_WEBHOOK_SECRET=your_secret_from_portal

# Live (after go-live)
# DEEMA_BASE_URL=https://api.deema.me
# DEEMA_API_KEY=your_live_api_key
# DEEMA_WEBHOOK_SECRET=your_live_webhook_secret
```

### Sandbox amount limits

**In Sandbox, the order total must be between 100 and 200 KWD.** Deema rejects amounts outside this range with “purchase amount is not within the merchant's credit limit range”. Use a cart total of 100–200 KWD when testing (e.g. add products so the total is at least 100 KWD and at most 200 KWD).

In **Production**, the minimum is 10 KWD (no upper limit from Deema).

---

## 3. Webhook Configuration

Webhooks let Deema notify your system when an order’s payment status changes (e.g. Captured, Expired, Cancelled).

### In Deema Merchant Portal

1. Log in to the [Merchant Portal](https://docs.deema.me/docs/getting-started-with-deema-bnpl-solution).
2. Open **Webhook** in the sidebar.
3. Click **Create New Webhook +**.
4. Set:
   - **Webhook Name**: e.g. `BILYAR Orders`
   - **Webhook URL**: `https://your-domain.com/api/payment/deema/webhook`
   - **Headers**: add a secret (e.g. key `x-webhook-secret`, value a long random string).

5. Save.

### In BILYAR (.env)

Set the **same** header value you configured in the Portal:

```bash
DEEMA_WEBHOOK_SECRET=the_exact_value_from_portal
# Optional if you use a different header name:
# DEEMA_WEBHOOK_HEADER=x-webhook-secret
```

### Behaviour

- The endpoint returns **200 OK** with `{ "received": true }` so Deema considers the notification delivered.
- Your server updates order payment status and order status (e.g. Captured → Processing, Expired/Cancelled → Cancelled) from the webhook payload.

---

## 4. Checkout Flow (Widget / Redirect)

Per the [Deema guide](https://docs.deema.me/docs/getting-started-with-deema-bnpl-solution):

1. Customer chooses **Deema** at checkout.
2. Your system creates the order and calls **Initiate** (our `POST /api/payment/deema/initiate`).
3. Customer is redirected to Deema’s page (`paymentUrl` from the API).
4. After payment, Deema redirects the customer to your **success** or **failure** URL (callback).
5. Deema sends a **webhook** to your server to sync status.

BILYAR implements this with a **redirect flow**: checkout shows the Deema option, and on submit the backend calls Deema’s purchase API and returns `paymentUrl`; the frontend then redirects the customer to that URL. No embedded widget is required for this flow.

---

## 5. Go Live Checklist

Before requesting Live activation from Deema, complete:

| Requirement | BILYAR |
|-------------|--------|
| **Successful Sandbox test** | Run at least one full payment in Sandbox (create order → pay with Deema → land on success page). |
| **Webhook working** | In Portal, confirm webhook is configured. Place a test order and check server logs for “Deema webhook received” and order status updates. |
| **Checkout visible** | Deema option is shown on the checkout page and works in Sandbox. |
| **System updates order status** | From Admin → Orders, confirm status and payment status update after payment and after webhook. |
| **Portal access** | You can log in and see test orders in the Merchant Portal. |

---

## 6. Go Live Steps

1. **Switch config to Live**  
   Set `DEEMA_BASE_URL=https://api.deema.me` and use the Live API key and webhook secret from Deema.

2. **Contact Deema**  
   Request Live activation and get your Live credentials.

3. **Update webhook for Live**  
   In the Live Merchant Portal, create (or update) the webhook with your production URL and the same header secret you set in `DEEMA_WEBHOOK_SECRET`.

4. **One Live test**  
   Run one small Live transaction and confirm:
   - Customer is redirected to Deema and back to your success/failure page.
   - Your webhook receives the event and your order status updates.

5. **Start accepting Live payments**  
   After the test passes, you can accept real Deema payments.

---

## 7. API Endpoints (BILYAR)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payment/deema/initiate` | Create order, then call with `orderId`; returns `paymentUrl` for redirect. |
| GET | `/api/payment/deema/callback` | Deema redirects here with `?orderId=...&status=success|failed`; we redirect user to `/order/success` or `/order/failed`. |
| POST | `/api/payment/deema/webhook` | Deema sends status updates here; we validate `DEEMA_WEBHOOK_SECRET` and return 200. |

---

## 8. References

- [Deema BNPL Integration Guide](https://docs.deema.me/docs/getting-started-with-deema-bnpl-solution)
- [Deema Widget Integration](https://docs.deema.me/docs/getting-started-with-deema-bnpl-solution) (optional for advanced use)
- Merchant Portal: use the link provided by Deema after registration
