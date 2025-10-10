-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop and recreate encryption functions
DROP FUNCTION IF EXISTS encrypt_sensitive(text, text);
DROP FUNCTION IF EXISTS decrypt_sensitive(text, text);

CREATE FUNCTION encrypt_sensitive(data text, key text DEFAULT 'default_encryption_key')
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

CREATE FUNCTION decrypt_sensitive(encrypted_data text, key text DEFAULT 'default_encryption_key')
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

-- Create audit log table if not exists
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

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view audit logs" ON admin_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON admin_audit_log;

-- Create policies
CREATE POLICY "Admins can view audit logs" ON admin_audit_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs" ON admin_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Create sync metrics table
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view sync metrics" ON sync_metrics;
DROP POLICY IF EXISTS "Admins can insert sync metrics" ON sync_metrics;

-- Create policies
CREATE POLICY "Admins can view sync metrics" ON sync_metrics
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert sync metrics" ON sync_metrics
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_elsi_logs_created_at ON elsi_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_state_operation ON sync_state(operation);
CREATE INDEX IF NOT EXISTS idx_sync_metrics_created_at ON sync_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);

-- Drop and recreate view
DROP VIEW IF EXISTS sync_statistics;
CREATE VIEW sync_statistics AS
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

-- Grant access
GRANT SELECT ON sync_statistics TO authenticated;

-- Drop and recreate cleanup function
DROP FUNCTION IF EXISTS cleanup_old_logs(integer);
CREATE FUNCTION cleanup_old_logs(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM elsi_logs 
  WHERE created_at < NOW() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;