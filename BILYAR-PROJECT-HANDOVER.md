# BILYAR - Luxury Women's Fashion E-Commerce Website
## Project Handover Document

---

## Project Overview

BILYAR is a premium luxury women's fashion e-commerce website built for the Kuwaiti market. The brand identity centers on emerald green (#003B2A) and gold (#BDA55D) with an ivory background, targeting high-end couture customers. The website supports full bilingual operation in English and Arabic with RTL layout switching.

---

## What Has Been Built

### 1. Customer-Facing Storefront

- **Homepage**: Hero section with brand messaging, featured new arrivals carousel, category highlights, and brand story section
- **Shop Page**: Full product catalog with category filtering (Outerwear, Sets, Dresses, Tops), grid layout with product cards showing images, names, prices, and "New" badges
- **Product Details Page**: Large product image, bilingual name/description, size selection (XS-XXL), custom bespoke measurement inputs (shirt: 5 fields, trouser: 6 fields based on product type), quantity selector, and add-to-cart functionality
- **Cart Drawer**: Slide-out cart panel accessible from navbar, showing items with size/quantity, subtotal, shipping cost (free over 90 KWD), and checkout button
- **Checkout Page**: Shipping form (Full Name, Phone, Address, Area, Country), payment method selection with official logos (Visa, Mastercard, KNET Kuwait, Deema BNPL), order summary sidebar
- **Order Success/Failed Pages**: Post-payment confirmation pages with order details
- **Static Pages**: About Us page with brand heritage story, Contact Us page

### 2. Payment Integration

- **MyFatoorah**: Card/KNET payment gateway integration (backend ready, needs production API key)
- **Deema BNPL**: Buy Now Pay Later installment payment integration with:
  - Sandbox API configured (endpoint: `https://staging-api.deema.me/api/merchant/v1/purchase`)
  - Webhook handler at `/api/payment/deema/webhook` with secret verification (`x-webhook-secret: bilyar-deema-webhook-2026`)
  - Handles payment statuses: Captured, Expired, Cancelled
  - Callback redirects for success/failure
- **Demo Mode**: When API keys are not configured, payments run in demo mode (creates order and redirects to success)

### 3. Admin Dashboard

- **Login**: Mock authentication (admin@bilyar.com / admin) stored in localStorage
- **Dashboard**: Overview stats - total revenue, order count, pending orders, unique customer count
- **Orders Management**: View all orders with full details, line items, custom measurements, customer notes. Update order status (Pending, Processing, Shipped, Delivered, Cancelled)
- **Products Management**: View all products in table format with images, bilingual names, categories, prices, availability status
- **Customers Management**: Customer profiles derived from order data, showing total spent, order count, last order date, loyalty badges (Loyal/Regular/New based on spending and order history), click-to-view order history
- **Settings**: Store configuration (name, currency, contact), payment gateway connection status (shows real-time whether MyFatoorah/Deema API keys are configured), shipping settings (free delivery threshold)

### 4. Bilingual Support (English/Arabic)

- Full translation system covering all pages, labels, and messages
- RTL layout switching for Arabic (direction, text alignment, icon mirroring)
- Language toggle in navbar, preference saved to localStorage
- Arabic fonts (Amiri) loaded from Google Fonts
- Admin panel is also fully bilingual

### 5. Custom Bespoke Measurements

Products can be flagged as having shirt and/or trouser measurements:
- **Shirt measurements** (5 fields): Shoulder Width, Chest, Sleeve Length, Shirt Length, Neck
- **Trouser measurements** (6 fields): Waist, Hips, Inseam, Thigh, Trouser Length, Knee Width
- All measurements in inches with decimal support
- Stored as JSONB in the database, visible in admin order details

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite bundler |
| Routing | Wouter (client-side) |
| State | TanStack React Query (server), React Context (cart) |
| UI | shadcn/ui + Radix UI + Tailwind CSS v4 |
| Animations | Framer Motion |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL (via Drizzle ORM) |
| Validation | Zod + drizzle-zod |
| Fonts | Playfair Display, Inter, Amiri (Google Fonts) |

---

## Database Schema

### Products Table
- id, name, nameAr, description, descriptionAr, price, category, categoryAr, images (text array), isNew (boolean), hasShirt (boolean), hasTrouser (boolean)

### Orders Table
- id, orderNumber (auto-generated ORD-XXXXXXXX), customerName, customerEmail, customerPhone, customerAddress, customerCity, customerCountry, status, paymentMethod, paymentId, paymentStatus, total, shippingCost, createdAt

### Order Items Table
- id, orderId (FK), productId, productName, quantity, price, image, size, measurements (JSONB), notes

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List all products |
| GET | /api/products/:id | Get single product |
| GET | /api/orders | List all orders with items |
| GET | /api/orders/:id | Get single order with items |
| POST | /api/orders | Create new order |
| PATCH | /api/orders/:id/status | Update order status |
| GET | /api/customers | List customers (aggregated from orders) |
| GET | /api/payment/status | Check payment gateway connection status |
| POST | /api/payment/myfatoorah/initiate | Initiate MyFatoorah payment |
| GET | /api/payment/myfatoorah/callback | MyFatoorah callback handler |
| POST | /api/payment/deema/initiate | Initiate Deema BNPL payment |
| GET | /api/payment/deema/callback | Deema callback handler |
| POST | /api/payment/deema/webhook | Deema webhook for payment updates |

---

## Environment Variables / Secrets Required

| Variable | Purpose | Status |
|----------|---------|--------|
| DATABASE_URL | PostgreSQL connection string | Configured |
| DEEMA_API_KEY | Deema BNPL API key | Configured (sandbox) |
| DEEMA_WIDGET_KEY | Deema widget key | Configured |
| MYFATOORAH_API_KEY | MyFatoorah payment API key | Not yet configured |

---

## How to Run

1. Install dependencies: `npm install`
2. Ensure PostgreSQL is available and `DATABASE_URL` is set
3. Push database schema: `npx drizzle-kit push`
4. Seed products: `npx tsx scripts/seed.ts`
5. Start dev server: `npm run dev` (serves on port 5000)
6. Build for production: `npx tsx script/build.ts`

---

## Design System

- **Primary Color**: Emerald Green (#003B2A)
- **Accent Color**: Gold (#BDA55D)
- **Background**: Ivory (#FAFAF5)
- **Border Radius**: 0rem (sharp, architectural aesthetic)
- **Heading Font**: Playfair Display (serif)
- **Body Font**: Inter (sans-serif)
- **Arabic Font**: Amiri
- **Currency**: KWD (Kuwaiti Dinar)
- **Free Delivery Threshold**: 90 KWD

---

## Webhook Configuration (Deema)

Already configured in Deema sandbox merchant dashboard:
- **Webhook Name**: BILYAR Orders
- **Webhook URL**: https://bilyar-style.replit.app/api/payment/deema/webhook
- **Secret header key**: x-webhook-secret
- **Secret header value**: bilyar-deema-webhook-2026

---

## File Structure

```
client/src/
  components/ui/       - shadcn/ui base components
  components/layout/   - Navbar, Footer
  components/cart/     - CartDrawer
  pages/               - Home, Shop, ProductDetails, Checkout, OrderSuccess, OrderFailed, StaticPages
  pages/admin/         - Login, Dashboard, Orders, Products, Customers, Settings, AdminLayout
  lib/                 - translations, cart context, query client, utilities
  hooks/               - Custom React hooks

server/
  index.ts             - Server entry point
  routes.ts            - All API routes and payment integration
  storage.ts           - Database access layer (Drizzle ORM)
  static.ts            - Production static file serving
  vite.ts              - Dev mode Vite middleware

shared/
  schema.ts            - Database schema (Drizzle) and Zod validation

client/public/images/  - Product images, logos (KNET, Deema), hero images
scripts/seed.ts        - Database seeding with sample products
```

---

## What's Not Yet Implemented (Future Enhancements)

1. **Real admin authentication** - Currently uses mock localStorage auth
2. **MyFatoorah production key** - Backend is ready, just needs the API key
3. **Product CRUD in admin** - Add/Edit/Delete products from admin panel (UI placeholders exist)
4. **Settings persistence** - Admin settings save to backend (currently UI-only)
5. **Order email notifications** - Send confirmation emails to customers
6. **Search functionality** - Product search in the shop
7. **Wishlist** - Save favorite products
8. **Inventory management** - Stock tracking per size
