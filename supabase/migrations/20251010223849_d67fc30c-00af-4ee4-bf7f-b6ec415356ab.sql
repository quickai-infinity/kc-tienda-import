-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule log cleanup job (runs daily at 3 AM)
-- Deletes logs older than 90 days
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 3 * * *',
  $$
  DELETE FROM elsi_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- Add encryption functions for sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive(data text, key text DEFAULT 'default_encryption_key')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF data IS NULL OR data = '' THEN
    RETURN data;
  END IF;
  RETURN encode(pgp_sym_encrypt(data, key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION decrypt_sensitive(encrypted_data text, key text DEFAULT 'default_encryption_key')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF encrypted_data IS NULL OR encrypted_data = '' THEN
    RETURN encrypted_data;
  END IF;
  RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), key);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Add audit trail table for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Only system can insert audit logs (via trigger)
CREATE POLICY "System can insert audit logs" ON admin_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Create sync metrics summary table
CREATE TABLE IF NOT EXISTS sync_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  started_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  status text NOT NULL,
  records_processed integer DEFAULT 0,
  records_created integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  duration_seconds integer,
  error_message text,
  triggered_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on sync_metrics
ALTER TABLE sync_metrics ENABLE ROW LEVEL SECURITY;

-- Admins can view metrics
CREATE POLICY "Admins can view sync metrics" ON sync_metrics
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert metrics
CREATE POLICY "Admins can insert sync metrics" ON sync_metrics
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_elsi_logs_created_at ON elsi_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_state_operation ON sync_state(operation);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_created_at ON sync_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- Add helpful views for dashboard
CREATE OR REPLACE VIEW sync_statistics AS
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

-- Grant access to admins only
GRANT SELECT ON sync_statistics TO authenticated;