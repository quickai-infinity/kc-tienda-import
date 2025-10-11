-- Add featured column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.products.featured IS 'Whether product is featured on homepage';