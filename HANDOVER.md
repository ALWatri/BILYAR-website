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
- **Deema BNPL**: Buy Now Pay Later integration per [Deema’s guide](https://docs.deema.me/docs/getting-started-with-deema-bnpl-solution):
  - Sandbox: `DEEMA_BASE_URL=https://staging-api.deema.me`. Live: `https://api.deema.me`
  - Webhook at `/api/payment/deema/webhook` with configurable secret (`DEEMA_WEBHOOK_SECRET`) and optional header name (`DEEMA_WEBHOOK_HEADER`); returns 200 OK for delivery confirmation
  - Handles statuses: Captured, Expired, Cancelled. Callback redirects to success/failure page
  - See `docs/DEEMA_INTEGRATION.md` for setup, webhook, and go-live steps
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

### Settings Table (single row)
- id, storeName, storeEmail, storePhone, currency, freeShippingThreshold, defaultShippingCost

### Firebase / Firestore (optional)
When `FIREBASE_PROJECT_ID` is set, the app uses **Firestore** instead of PostgreSQL. Collections: `products`, `orders`, `order_items`, `settings` (doc `store`), `counters` (doc `next`). See `docs/FIREBASE_SETUP.md` for setup and `scripts/seed-firestore.ts` for seeding.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List all products (optional ?q= for search) |
| GET | /api/products/:id | Get single product |
| POST | /api/products | Create product (admin) |
| PATCH | /api/products/:id | Update product (admin) |
| DELETE | /api/products/:id | Delete product (admin) |
| GET | /api/orders | List all orders with items |
| GET | /api/orders/:id | Get single order with items |
| POST | /api/orders | Create new order |
| PATCH | /api/orders/:id/status | Update order status |
| GET | /api/customers | List customers (aggregated from orders) |
| GET | /api/settings | Get store settings (public) |
| PATCH | /api/settings | Update store settings |
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
| DATABASE_URL | PostgreSQL connection string (omit if using Firebase) | Optional |
| FIREBASE_PROJECT_ID | Firebase project ID (e.g. `bilyar`) to use Firestore | Optional |
| GOOGLE_APPLICATION_CREDENTIALS | Path to Firebase service account JSON file | If using Firestore |
| FIREBASE_SERVICE_ACCOUNT_JSON | Firebase service account JSON string (for hosted envs) | If using Firestore |
| DEEMA_API_KEY | Deema BNPL API key | From Merchant Portal (sandbox/live) |
| DEEMA_BASE_URL | Sandbox: staging-api.deema.me; Live: api.deema.me | Optional, default Sandbox |
| DEEMA_WEBHOOK_SECRET | Same value as in Merchant Portal → Webhook Headers | Recommended |
| MYFATOORAH_API_KEY | MyFatoorah payment API key | Not yet configured |

---

## How to Run

**Option A – PostgreSQL**
1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` (and payment keys if needed)
3. Push schema: `npm run db:push` or `npx drizzle-kit push`
4. Seed: `npx tsx scripts/seed.ts`
5. Start: `npm run dev` (port 5000) or `npm run build` then `npm start`

**Option B – Firebase Firestore**
1. Create a Firebase project (e.g. **bilyar**) and enable Firestore. See `docs/FIREBASE_SETUP.md`.
2. Set `FIREBASE_PROJECT_ID=bilyar` and either `GOOGLE_APPLICATION_CREDENTIALS` (path to key file) or `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON string).
3. Seed Firestore: `npx tsx scripts/seed-firestore.ts`
4. Start: `npm run dev` or `npm start` (no PostgreSQL needed).

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
- **Free Delivery Threshold**: 90 KWD (configurable in Admin Settings)

---

## Webhook Configuration (Deema)

Configure in [Deema Merchant Portal](https://docs.deema.me/docs/getting-started-with-deema-bnpl-solution) → Webhook:
- **Webhook URL**: `https://your-domain.com/api/payment/deema/webhook`
- **Headers**: Add a secret key/value (e.g. key `x-webhook-secret`, value your chosen secret). Set the same value in `.env` as `DEEMA_WEBHOOK_SECRET`. See `docs/DEEMA_INTEGRATION.md`.

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
  vite.ts               - Dev mode Vite middleware

shared/
  schema.ts            - Database schema (Drizzle) and Zod validation

client/public/images/  - Product images, logos (KNET, Deema), hero images
scripts/seed.ts        - Database seeding with sample products
```

---

## What's Not Yet Implemented (Future Enhancements)

1. **Real admin authentication** - Currently uses mock localStorage auth
2. **MyFatoorah production key** - Backend is ready, just needs the API key
3. **Order email notifications** - Send confirmation emails to customers
4. **Wishlist** - Save favorite products
5. **Inventory management** - Stock tracking per size
