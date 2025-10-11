-- Add price_base column to store original CSV price before margin and VAT
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS price_base INTEGER DEFAULT 0;

COMMENT ON COLUMN public.products.price_base IS 'Original base price in cents from CSV before margin and VAT';
COMMENT ON COLUMN public.products.price_cents IS 'Final price in cents after 16% margin and 21% VAT';