# Tap Payments Integration

BILYAR uses **Tap Payments** for Card and KNET payments in Kuwait.

## Overview

- **Docs**: [developers.tap.company](https://developers.tap.company/reference/api-endpoint)
- **Auth**: `Authorization: Bearer YOUR_SECRET_KEY`
- **Modes**: Test (`sk_test_xxx`) and Live (`sk_live_xxx`)
- **Flow**: Create Charge → redirect user to Tap payment page → callback with `tap_id` → verify charge status

## Environment

```bash
# Leave empty for demo mode (no real payment)
TAP_API_KEY=

# For testing (use test keys from Tap dashboard)
# TAP_API_KEY=sk_test_xxxxxxxxxxxxx

# For production (when you receive live key from Tap)
# TAP_API_KEY=sk_live_xxxxxxxxxxxxx
```

## Flow

1. **Checkout** – Customer selects "Card / KNET", places order.
2. **Initiate** – `POST /api/payment/tap/initiate` with `orderId` creates a charge via Tap API.
3. **Redirect** – User is sent to `transaction.url` (Tap's payment page).
4. **Callback** – After payment, Tap redirects to `/api/payment/tap/callback?orderId=...&tap_id=...`.
5. **Verify** – Server fetches charge status via `GET /v2/charges/{tap_id}` and updates order.
6. **Webhook** – Tap optionally POSTs to `/api/payment/tap/webhook` for async confirmation.

## Test Cards (Test Mode)

Use [Tap test cards](https://developers.tap.company/reference/testing-cards) when `TAP_API_KEY` is a test key (`sk_test_...`).

## Go Live

When you receive your **live API key** from Tap:

1. Set `TAP_API_KEY=sk_live_xxxxxxxxxxxxx` in your production environment.
2. No other changes needed – Tap uses the same API URL for test and live; the key determines the mode.
3. Run a test transaction to confirm the full flow.

## Webhook (Optional)

Tap can POST charge updates to `https://yourdomain.com/api/payment/tap/webhook`. If you configure this in the Tap dashboard, the webhook handler will also update order status on async payment confirmation.
