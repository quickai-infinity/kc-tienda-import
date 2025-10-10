-- Schedule updateProductsFromElsi to run daily at 2:00 AM UTC (3:00 AM Madrid winter time)
-- This runs 1 hour after fetchElsiCatalog
SELECT cron.schedule(
  'update-products-from-elsi-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://uwvhieodebkjwuedtcut.supabase.co/functions/v1/updateProductsFromElsi',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dmhpZW9kZWJrand1ZWR0Y3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNDQzMzYsImV4cCI6MjA3NTYyMDMzNn0.HDLRS0tavUCTVuePTiDYRxMg6phXT6bvddF1WJBOG0Y"}'::jsonb,
      body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);