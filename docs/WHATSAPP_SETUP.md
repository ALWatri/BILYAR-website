# WhatsApp Business API Setup

This guide helps you configure WhatsApp Cloud API for BILYAR order notifications and marketing.

## 1. Create Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Sign in with your Facebook account
3. Create a Developer account if prompted

## 2. Create a WhatsApp App

1. Click **Create App** → **Business**
2. Fill in app name (e.g. "BILYAR") and contact email
3. Add **WhatsApp** product to your app
4. In WhatsApp → **API Setup**, you'll see:
   - **Phone number ID** (save this as `WHATSAPP_PHONE_NUMBER_ID`)
   - **Temporary access token** (for testing; replace with System User token for production)

## 3. Get Permanent Access Token

1. In Meta Business Suite: [business.facebook.com](https://business.facebook.com)
2. Go to **Business Settings** → **Users** → **System Users**
3. Create a System User, add it to your app
4. Generate token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions
5. Save as `WHATSAPP_ACCESS_TOKEN`

## 4. Create Message Templates

Templates must be created and approved in Meta Business Manager before use.

### order_received
- **Category:** Utility
- **Name:** `order_received`
- **Body:** `Hello {{1}}, your order {{2}} has been received. Your invoice is attached.`
- **Parameters:** 2 (customer first name, order number)

### order_shipped
- **Category:** Utility
- **Name:** `order_shipped`
- **Body:** `Hello {{1}}, your order {{2}} is out for delivery!`

### marketing_message
- **Category:** Marketing
- **Name:** `marketing_message`
- **Body:** `{{1}}`
- **Parameters:** 1 (your custom message)

Submit templates for approval (usually 24–48 hours).

## 5. Environment Variables

Add to Render (or your `.env`):

```
WHATSAPP_ACCESS_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=123456789
SITE_URL=https://your-app.onrender.com
```

`SITE_URL` is required for the invoice PDF link in order-received messages.

## 6. Test

- Use the admin **WhatsApp** page to send a test marketing message
- Place a test order and complete payment to trigger order received
- Set an order status to **Shipped** to trigger order shipped
