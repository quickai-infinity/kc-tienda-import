-- Create function to get sync state with row-level locking for better rate limiting
CREATE OR REPLACE FUNCTION get_sync_state_with_lock(operation_name text)
RETURNS TABLE (
  operation text,
  last_run timestamp with time zone,
  in_progress boolean,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sync_state.operation,
    sync_state.last_run,
    sync_state.in_progress,
    sync_state.created_at
  FROM sync_state
  WHERE sync_state.operation = operation_name
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Update existing functions to set search_path (security best practice)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;