-- Eliminar todas las políticas existentes de storage para logos y company-logos
DROP POLICY IF EXISTS "Admins can delete company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view public company logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view public logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can delete company logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Superadmins can view logos" ON storage.objects;

-- Recrear políticas correctas para el bucket "logos" (usado en Settings)
CREATE POLICY "Superadmins can manage logos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'logos' AND 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  bucket_id = 'logos' AND 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Políticas públicas para ver logos
CREATE POLICY "Public can view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Recrear políticas correctas para el bucket "company-logos" (usado en BrandManager)
CREATE POLICY "Superadmins can manage company logos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'company-logos' AND 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  bucket_id = 'company-logos' AND 
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Políticas públicas para ver company logos
CREATE POLICY "Public can view company logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');