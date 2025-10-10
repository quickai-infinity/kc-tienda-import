-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  brand TEXT,
  tags TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active products
CREATE POLICY "Anyone can view active products"
  ON public.products
  FOR SELECT
  USING (active = true);

-- Insert demo products
INSERT INTO public.products (sku, title, description, price_cents, currency, image_url, stock, category, brand, tags, active) VALUES
  ('WEP-001', 'Wireless Earbuds Pro', 'Premium wireless earbuds with active noise cancellation and 24-hour battery life', 19999, 'eur', 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80', 50, 'Audio', 'KCTienda', ARRAY['audio', 'wireless', 'premium'], true),
  ('SWE-001', 'Smart Watch Elite', 'Advanced smartwatch with health tracking, GPS, and waterproof design', 34999, 'eur', 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&q=80', 30, 'Wearables', 'KCTienda', ARRAY['wearable', 'health', 'fitness'], true),
  ('MKB-001', 'Mechanical Keyboard', 'RGB mechanical gaming keyboard with customizable switches and macro keys', 14999, 'eur', 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80', 25, 'Accessories', 'KCTienda', ARRAY['gaming', 'keyboard', 'rgb'], true),
  ('WCH-001', 'Wireless Charger', 'Fast wireless charging pad compatible with all Qi-enabled devices', 4999, 'eur', 'https://images.unsplash.com/photo-1591290619762-5d6d4c9c8cbe?w=500&q=80', 100, 'Accessories', 'KCTienda', ARRAY['charging', 'wireless'], true),
  ('GMP-001', 'Gaming Mouse Pro', 'High-precision gaming mouse with 16000 DPI and customizable RGB lighting', 8999, 'eur', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80', 40, 'Gaming', 'KCTienda', ARRAY['gaming', 'mouse', 'rgb'], true),
  ('USB-001', 'USB-C Hub Station', '7-in-1 USB-C hub with HDMI, USB 3.0 ports, SD card reader and power delivery', 7999, 'eur', 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&q=80', 60, 'Accessories', 'KCTienda', ARRAY['usb', 'hub', 'connectivity'], true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for products table
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();