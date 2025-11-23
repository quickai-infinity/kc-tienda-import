-- Update existing 'admin' roles to 'superadmin'
UPDATE user_roles 
SET role = 'superadmin'::app_role 
WHERE role = 'admin'::app_role;

-- Create profiles table with company_id
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id uuid REFERENCES empresas(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'));

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, company_id)
  VALUES (NEW.id, NULL);
  
  -- Insert role as company_admin by default for new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'company_admin');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing RLS policies to use new roles
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

CREATE POLICY "Superadmins can insert roles"
ON user_roles FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can update roles"
ON user_roles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can delete roles"
ON user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'superadmin'));

-- Update tariff table policies for company_admin access
DROP POLICY IF EXISTS "Admins can manage empresas" ON empresas;
DROP POLICY IF EXISTS "Anyone can view empresas" ON empresas;

CREATE POLICY "Everyone can view empresas"
ON empresas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Superadmins can manage empresas"
ON empresas FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Update tarifas_electricidad policies
DROP POLICY IF EXISTS "Admins can manage tarifas_electricidad" ON tarifas_electricidad;

CREATE POLICY "Superadmins can manage all electricity tariffs"
ON tarifas_electricidad FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Company admins can manage own electricity tariffs"
ON tarifas_electricidad FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'company_admin') AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = tarifas_electricidad.empresa_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'company_admin') AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = tarifas_electricidad.empresa_id
  )
);

-- Update tarifas_gas policies
DROP POLICY IF EXISTS "Admins can manage tarifas_gas" ON tarifas_gas;

CREATE POLICY "Superadmins can manage all gas tariffs"
ON tarifas_gas FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Company admins can manage own gas tariffs"
ON tarifas_gas FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'company_admin') AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = tarifas_gas.empresa_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'company_admin') AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = tarifas_gas.empresa_id
  )
);

-- Update servicios_adicionales policies
DROP POLICY IF EXISTS "Admins can manage servicios_adicionales" ON servicios_adicionales;

CREATE POLICY "Superadmins can manage all additional services"
ON servicios_adicionales FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'))
WITH CHECK (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Company admins can manage own additional services"
ON servicios_adicionales FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'company_admin') AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = servicios_adicionales.empresa_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'company_admin') AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = servicios_adicionales.empresa_id
  )
);