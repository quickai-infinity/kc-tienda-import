-- Add name column as alias for title for ELSI catalog compatibility
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add price_final as alias for price_cents for clarity
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS price_final INTEGER;

-- Update existing records to sync name with title and price_final with price_cents
UPDATE public.products
SET name = title
WHERE name IS NULL;

UPDATE public.products
SET price_final = price_cents
WHERE price_final IS NULL;

COMMENT ON COLUMN public.products.name IS 'Product name (descripcion_principal from ELSI CSV)';
COMMENT ON COLUMN public.products.price_final IS 'Final price in cents after margin and VAT (same as price_cents for compatibility)';