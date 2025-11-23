-- Update company_branding policies to allow superadmins
DROP POLICY IF EXISTS "Admins can insert company branding" ON company_branding;
DROP POLICY IF EXISTS "Admins can update company branding" ON company_branding;

-- Create new policies that allow both admin and superadmin roles
CREATE POLICY "Admins and superadmins can insert company branding"
ON company_branding
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Admins and superadmins can update company branding"
ON company_branding
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Admins and superadmins can delete company branding"
ON company_branding
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'superadmin'::app_role)
);