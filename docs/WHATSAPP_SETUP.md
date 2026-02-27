# WhatsApp via Twilio Setup

BILYAR uses **Twilio** as the WhatsApp Business Solution Provider (BSP). Twilio handles Meta/WhatsApp complexity and provides a simple API.

## 1. Create Twilio Account

1. Go to [twilio.com](https://www.twilio.com) and sign up
2. Verify your email and phone
3. In the [Console](https://console.twilio.com), note your **Account SID** and **Auth Token**

## 2. Enable WhatsApp

**Option A: Sandbox (for testing)**
- Go to [WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/whatsapp/learn)
- Join the sandbox by sending the code to the Twilio number
- Use `TWILIO_WHATSAPP_FROM=whatsapp:+14155238886` (sandbox number)

**Option B: Production**
- Request WhatsApp Business API access in Twilio Console
- Add your business phone number or use a Twilio number with WhatsApp
- Set `TWILIO_WHATSAPP_FROM=whatsapp:+965XXXXXXXX` or use a [Messaging Service](https://www.twilio.com/docs/messaging/services)

## 3. Create Content Templates

Templates must be approved by WhatsApp before use. Create them in Twilio:

1. Go to [Content Template Builder](https://console.twilio.com/us1/develop/sms/content-template-builder)
2. Create three templates:

### order_received (Utility)
- **Body:** `Hello {{1}}, your order {{2}} has been received. Your invoice is attached.`
- **Variables:** 1 = customer first name, 2 = order number
- **Category:** Utility

### order_shipped (Utility)
- **Body:** `Hello {{1}}, your order {{2}} is out for delivery!`
- **Variables:** 1 = first name, 2 = order number
- **Category:** Utility

### marketing_message (Marketing)
- **Body:** `{{1}}`
- **Variables:** 1 = your custom message
- **Category:** Marketing

3. Submit each for WhatsApp approval (usually minutes)
4. Copy the **Content SID** (starts with `HX`) for each template

## 4. Environment Variables

Add to Render or `.env`:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+96512345678
# Or for production with Messaging Service:
# TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

TWILIO_CONTENT_ORDER_RECEIVED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CONTENT_ORDER_SHIPPED=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_CONTENT_MARKETING=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

SITE_URL=https://your-app.onrender.com
```

## 5. Test

- Use the admin **WhatsApp** page to send a test marketing message
- Place a test order → order received + invoice PDF
- Set order status to **Shipped** → order shipped notification
