-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create table for ELSI catalog data
CREATE TABLE IF NOT EXISTS public.elsi_catalog_temp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL,
  brand TEXT,
  stock INTEGER DEFAULT 0,
  price NUMERIC(10, 2) DEFAULT 0,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on part_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_elsi_catalog_part_number ON public.elsi_catalog_temp(part_number);

-- Create table for logging
CREATE TABLE IF NOT EXISTS public.elsi_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  records_processed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_elsi_catalog_updated_at ON public.elsi_catalog_temp;

-- Create trigger for updated_at
CREATE TRIGGER update_elsi_catalog_updated_at
  BEFORE UPDATE ON public.elsi_catalog_temp
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on tables
ALTER TABLE public.elsi_catalog_temp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elsi_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view catalog data" ON public.elsi_catalog_temp;
DROP POLICY IF EXISTS "Anyone can view logs" ON public.elsi_logs;

-- Create policies to allow reading catalog data
CREATE POLICY "Anyone can view catalog data"
  ON public.elsi_catalog_temp
  FOR SELECT
  USING (true);

-- Create policies for logs (view only, insertions handled by service role)
CREATE POLICY "Anyone can view logs"
  ON public.elsi_logs
  FOR SELECT
  USING (true);

-- Unschedule existing cron job if it exists
SELECT cron.unschedule('fetch-elsi-catalog-daily');

-- Schedule the function to run daily at 1:00 AM UTC (2:00 AM Madrid winter time)
SELECT cron.schedule(
  'fetch-elsi-catalog-daily',
  '0 1 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://uwvhieodebkjwuedtcut.supabase.co/functions/v1/fetchElsiCatalog',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dmhpZW9kZWJrand1ZWR0Y3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDQzMzYsImV4cCI6MjA3NTYyMDMzNn0.HDLRS0tavUCTVuePTiDYRxMg6phXT6bvddF1WJBOG0Y"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);