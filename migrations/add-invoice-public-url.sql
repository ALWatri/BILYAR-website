-- Add invoice_public_url column for obscure public PDF URLs (WhatsApp)
-- Run this only if using PostgreSQL and not using `npm run db:push`
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_public_url TEXT;
