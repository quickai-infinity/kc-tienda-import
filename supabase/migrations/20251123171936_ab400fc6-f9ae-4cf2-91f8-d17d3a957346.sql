-- Create tarifas table for storing utility rates
CREATE TABLE public.tarifas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa TEXT NOT NULL,
  precio_kwh NUMERIC NOT NULL,
  potencia_fija NUMERIC NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create facturas table for storing invoice data
CREATE TABLE public.facturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  empresa_actual TEXT NOT NULL,
  empresa_destino TEXT,
  consumo_kwh NUMERIC NOT NULL,
  potencia_kw NUMERIC NOT NULL,
  precio_mensual_estimado NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comparaciones table for storing comparison results
CREATE TABLE public.comparaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factura_id UUID NOT NULL REFERENCES public.facturas(id) ON DELETE CASCADE,
  empresa TEXT NOT NULL,
  precio_estimado NUMERIC NOT NULL,
  ahorro_estimado NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparaciones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tarifas (publicly readable)
CREATE POLICY "Anyone can view tarifas"
ON public.tarifas
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tarifas"
ON public.tarifas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for facturas (users can only see their own)
CREATE POLICY "Users can view their own facturas"
ON public.facturas
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own facturas"
ON public.facturas
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facturas"
ON public.facturas
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facturas"
ON public.facturas
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for comparaciones (linked to facturas)
CREATE POLICY "Users can view comparaciones for their facturas"
ON public.comparaciones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.facturas
    WHERE facturas.id = comparaciones.factura_id
    AND facturas.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create comparaciones for their facturas"
ON public.comparaciones
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.facturas
    WHERE facturas.id = comparaciones.factura_id
    AND facturas.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_facturas_user_id ON public.facturas(user_id);
CREATE INDEX idx_comparaciones_factura_id ON public.comparaciones(factura_id);
CREATE INDEX idx_facturas_created_at ON public.facturas(created_at DESC);

-- Create trigger to update updated_at on tarifas
CREATE TRIGGER update_tarifas_updated_at
BEFORE UPDATE ON public.tarifas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();