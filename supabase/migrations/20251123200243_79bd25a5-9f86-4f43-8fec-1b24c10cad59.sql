-- Crear políticas de storage para el bucket company-logos
-- Permitir a superadmins ver todos los logos
CREATE POLICY "Superadmins can view company logos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir a superadmins subir logos
CREATE POLICY "Superadmins can upload company logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir a superadmins actualizar logos
CREATE POLICY "Superadmins can update company logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir a superadmins eliminar logos
CREATE POLICY "Superadmins can delete company logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos' AND
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir a todos ver los logos públicamente (ya que el bucket es público)
CREATE POLICY "Anyone can view public company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');