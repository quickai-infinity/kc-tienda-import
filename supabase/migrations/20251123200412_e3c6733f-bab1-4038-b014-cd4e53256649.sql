-- Crear políticas de storage para el bucket logos (usado en Settings)
-- Permitir a superadmins ver todos los logos
CREATE POLICY "Superadmins can view logos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'logos' AND
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir a superadmins subir logos
CREATE POLICY "Superadmins can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir a superadmins actualizar logos
CREATE POLICY "Superadmins can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos' AND
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir a superadmins eliminar logos
CREATE POLICY "Superadmins can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' AND
  has_role(auth.uid(), 'superadmin'::app_role)
);

-- Permitir a todos ver los logos públicamente (ya que el bucket es público)
CREATE POLICY "Anyone can view public logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');