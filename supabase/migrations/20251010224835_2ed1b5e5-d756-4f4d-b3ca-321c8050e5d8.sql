-- Fix SECURITY DEFINER view issue
-- Recreate sync_statistics view with SECURITY INVOKER to prevent RLS bypass

DROP VIEW IF EXISTS sync_statistics;

CREATE VIEW sync_statistics 
WITH (security_invoker=true) AS
SELECT 
  operation,
  COUNT(*) as total_runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_runs,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_runs,
  AVG(duration_seconds) as avg_duration_seconds,
  MAX(completed_at) as last_run,
  SUM(records_processed) as total_records_processed
FROM sync_metrics
WHERE completed_at IS NOT NULL
GROUP BY operation;

-- Grant access to authenticated users (RLS on sync_metrics will still apply)
GRANT SELECT ON sync_statistics TO authenticated;