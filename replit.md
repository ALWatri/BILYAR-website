# BILYAR - Luxury Women's Fashion E-Commerce

## Overview

BILYAR is a premium luxury women's fashion e-commerce website. It features a bilingual (English/Arabic with RTL support) storefront where customers can browse collections, view product details, manage a shopping cart, and place orders. The site also includes an admin panel for managing orders and products. The brand identity centers on emerald green (#003B2A) and gold (#BDA55D) with an ivory background, using Playfair Display for headings and Inter for body text to convey a high-end couture aesthetic.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state; local component state via React hooks
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS v4
- **Styling**: Tailwind CSS with CSS variables for theming, custom luxury color palette, zero border radius by default for sharp/modern look
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Internationalization**: Custom translation system in `client/src/lib/translations.ts` supporting English and Arabic with RTL layout switching via localStorage
- **Fonts**: Playfair Display (serif headings), Inter (sans-serif body), Amiri (Arabic text) loaded from Google Fonts

### Directory Structure
```
client/          - Frontend React application
  src/
    components/  - Reusable UI components
      ui/        - shadcn/ui base components
      layout/    - Navbar, Footer
      cart/      - CartDrawer
    pages/       - Route-level page components (Home, Shop, ProductDetails, StaticPages, admin/)
    hooks/       - Custom React hooks
    lib/         - Utilities, query client, translations, data types
server/          - Express backend
  index.ts       - Server entry point
  routes.ts      - API route definitions
  storage.ts     - Database access layer
  static.ts      - Production static file serving
  vite.ts        - Dev mode Vite middleware setup
shared/          - Shared code between client and server
  schema.ts      - Drizzle ORM schema and Zod validation schemas
scripts/         - Database seeding script
migrations/      - Drizzle-generated migration files
```

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via tsx in development
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Build**: esbuild for server bundling, Vite for client bundling (orchestrated by `script/build.ts`)
- **Dev Mode**: Vite dev server runs as Express middleware with HMR
- **Production**: Static files served from `dist/public`, server runs from `dist/index.cjs`

### API Routes
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get single product
- `GET /api/orders` - List all orders with items
- `GET /api/orders/:id` - Get single order with items
- `POST /api/orders` - Create new order with customer info, line items, and payment method
- `PATCH /api/orders/:id/status` - Update order status
- `POST /api/payment/myfatoorah/initiate` - Initiate MyFatoorah card/KNET payment (demo mode without API key)
- `GET /api/payment/myfatoorah/callback` - MyFatoorah payment callback handler
- `POST /api/payment/deema/initiate` - Initiate Deema BNPL installment payment (demo mode without API key)
- `GET /api/payment/deema/callback` - Deema payment callback handler
- `POST /api/payment/deema/webhook` - Deema webhook for payment status updates

### Data Storage
- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema** (in `shared/schema.ts`):
  - `products` - Product catalog with bilingual fields (name/nameAr, description/descriptionAr, category/categoryAr), pricing, images array, and boolean flags for shirt/trouser availability
  - `orders` - Customer orders with shipping info, status tracking, payment method/status, and totals
  - `order_items` - Line items linked to orders with size, measurements (JSONB), and notes
- **Migrations**: Managed via `drizzle-kit push` (schema push approach, not file-based migrations)
- **Seeding**: `scripts/seed.ts` populates products with sample luxury fashion items

### Key Design Decisions
1. **Shared schema**: The Drizzle schema lives in `shared/` so both client and server can import types, ensuring type safety across the stack. Frontend imports types via `@shared/schema` alias.
2. **Full-stack data flow**: Products are stored in PostgreSQL and fetched via `/api/products`. Orders are created via `/api/orders` and managed in the admin panel.
3. **No authentication system yet**: Admin routes exist but have no auth middleware; a login page exists at `/admin/login` with mock auth (admin@bilyar.com / admin) stored in localStorage.
4. **Cart is client-side only**: Cart state is managed via React Context (CartProvider) with localStorage persistence. Items include product, quantity, size, measurements, and notes.
5. **Bilingual support**: Language toggling stores preference in localStorage and updates document direction (LTR/RTL) - not URL-based. Admin panel is also fully bilingual.
6. **Zero border radius**: The design uses `--radius: 0rem` for a sharp, architectural luxury aesthetic.
7. **Custom measurements**: Products have hasShirt/hasTrouser flags to conditionally show measurement input sections (shirt: 5 fields, trouser: 6 fields) in inches with decimal support.
8. **Currency**: All prices displayed in KWD. Free delivery over 90 KWD.
9. **Database storage**: Uses Drizzle ORM with `drizzle-kit push` for schema sync. Storage interface in `server/storage.ts` uses DatabaseStorage class with pg Pool.

## External Dependencies

### Database
- **PostgreSQL** - Required, connected via `DATABASE_URL` environment variable. Used with `pg` (node-postgres) driver and Drizzle ORM.

### Key NPM Packages
- `express` v5 - HTTP server
- `drizzle-orm` + `drizzle-kit` - Database ORM and migration tooling
- `@tanstack/react-query` - Client-side data fetching/caching
- `wouter` - Client-side routing
- `framer-motion` - Animations
- `zod` + `drizzle-zod` - Runtime validation
- `react-day-picker` - Calendar component
- `embla-carousel-react` - Carousel/slider
- `recharts` - Charts (for admin dashboard)
- `vaul` - Drawer component
- `react-hook-form` + `@hookform/resolvers` - Form handling

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` - Dev error overlay
- `@replit/vite-plugin-cartographer` - Dev tooling (conditional, dev only)
- `@replit/vite-plugin-dev-banner` - Dev banner (conditional, dev only)
- Custom `vite-plugin-meta-images` - Updates OpenGraph meta tags with Replit deployment URL

### Fonts (External CDN)
- Google Fonts: Playfair Display, Inter, Amiri