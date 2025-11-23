-- Create company_branding table
CREATE TABLE public.company_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT UNIQUE NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  text_color TEXT,
  background_color TEXT,
  logo_url TEXT,
  website_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

-- Anyone can view company branding
CREATE POLICY "Anyone can view company branding"
ON public.company_branding
FOR SELECT
USING (true);

-- Admins can insert company branding
CREATE POLICY "Admins can insert company branding"
ON public.company_branding
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update company branding
CREATE POLICY "Admins can update company branding"
ON public.company_branding
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true);

-- RLS policies for company-logos bucket
CREATE POLICY "Anyone can view company logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-logos');

CREATE POLICY "Admins can upload company logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update company logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete company logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add active_company field to branding table
ALTER TABLE public.branding
ADD COLUMN active_company TEXT;

-- Insert seed data for companies
INSERT INTO public.company_branding (company_name) VALUES
  ('Repsol'),
  ('Endesa'),
  ('Iberdrola'),
  ('Naturgy'),
  ('TotalEnergies'),
  ('Holaluz'),
  ('Lucera');