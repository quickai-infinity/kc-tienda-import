-- Drop the overly permissive policy that allows all authenticated users
DROP POLICY IF EXISTS "Allow authenticated users full access to branding" ON public.branding;

-- Create restrictive policies that only allow superadmins to modify branding
CREATE POLICY "Only superadmins can insert branding"
ON public.branding
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Only superadmins can update branding"
ON public.branding
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'))
WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Only superadmins can delete branding"
ON public.branding
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'superadmin'));