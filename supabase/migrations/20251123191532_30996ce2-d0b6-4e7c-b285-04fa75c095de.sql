-- Add new enum values (must be in separate migration)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'company_admin';