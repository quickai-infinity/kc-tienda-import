-- Fix #1: Restrict elsi_catalog_temp to admin-only access
DROP POLICY IF EXISTS "Anyone can view catalog data" ON elsi_catalog_temp;

CREATE POLICY "Admins can view catalog data" ON elsi_catalog_temp
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Fix #2: Add user_roles management policies for admins
CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Fix #3: Create sync_state table for rate limiting
CREATE TABLE IF NOT EXISTS sync_state (
  operation text PRIMARY KEY,
  last_run timestamp with time zone,
  in_progress boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on sync_state
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

-- Only admins can view sync state
CREATE POLICY "Admins can view sync state" ON sync_state
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Only admins can update sync state
CREATE POLICY "Admins can update sync state" ON sync_state
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can insert sync state
CREATE POLICY "Admins can insert sync state" ON sync_state
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));