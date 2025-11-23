-- Add approved field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON public.profiles(approved);

-- Update RLS policies for facturas to require approved status
DROP POLICY IF EXISTS "Users can create their own facturas" ON public.facturas;
DROP POLICY IF EXISTS "Users can view their own facturas" ON public.facturas;
DROP POLICY IF EXISTS "Users can update their own facturas" ON public.facturas;
DROP POLICY IF EXISTS "Users can delete their own facturas" ON public.facturas;

CREATE POLICY "Approved users can create their own facturas" 
ON public.facturas 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND approved = true
  )
);

CREATE POLICY "Approved users can view their own facturas" 
ON public.facturas 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND approved = true
  )
);

CREATE POLICY "Approved users can update their own facturas" 
ON public.facturas 
FOR UPDATE 
USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND approved = true
  )
);

CREATE POLICY "Approved users can delete their own facturas" 
ON public.facturas 
FOR DELETE 
USING (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND approved = true
  )
);

-- Update RLS policies for comparaciones to require approved status
DROP POLICY IF EXISTS "Users can create comparaciones for their facturas" ON public.comparaciones;
DROP POLICY IF EXISTS "Users can view comparaciones for their facturas" ON public.comparaciones;

CREATE POLICY "Approved users can create comparaciones for their facturas" 
ON public.comparaciones 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.facturas 
    WHERE facturas.id = comparaciones.factura_id 
    AND facturas.user_id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND approved = true
  )
);

CREATE POLICY "Approved users can view comparaciones for their facturas" 
ON public.comparaciones 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.facturas 
    WHERE facturas.id = comparaciones.factura_id 
    AND facturas.user_id = auth.uid()
  ) AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND approved = true
  )
);

-- Approve the superadmin user automatically
UPDATE public.profiles 
SET approved = true 
WHERE user_id IN (
  SELECT user_id FROM public.user_roles 
  WHERE role = 'superadmin'
);