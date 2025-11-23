-- Create empresas table
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  color_primario TEXT DEFAULT '#0A8754',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- RLS policies for empresas
CREATE POLICY "Anyone can view empresas"
  ON public.empresas
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage empresas"
  ON public.empresas
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial companies if they don't exist
INSERT INTO public.empresas (nombre, color_primario) VALUES
  ('Endesa', '#0A8754'),
  ('Iberdrola', '#0A8754'),
  ('Repsol', '#0A8754'),
  ('Naturgy', '#0A8754'),
  ('TotalEnergies', '#0A8754'),
  ('Holaluz', '#0A8754'),
  ('Lucera', '#0A8754')
ON CONFLICT (nombre) DO NOTHING;

-- Create tarifas_electricidad table
CREATE TABLE IF NOT EXISTS public.tarifas_electricidad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  potencia_p1 NUMERIC(10,5),
  potencia_p2 NUMERIC(10,5),
  energia_p1 NUMERIC(10,5),
  energia_p2 NUMERIC(10,5),
  energia_p3 NUMERIC(10,5),
  impuesto_electrico NUMERIC(10,5),
  iva NUMERIC(10,5),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(empresa_id)
);

-- Enable RLS on tarifas_electricidad
ALTER TABLE public.tarifas_electricidad ENABLE ROW LEVEL SECURITY;

-- RLS policies for tarifas_electricidad
CREATE POLICY "Anyone can view tarifas_electricidad"
  ON public.tarifas_electricidad
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tarifas_electricidad"
  ON public.tarifas_electricidad
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create tarifas_gas table
CREATE TABLE IF NOT EXISTS public.tarifas_gas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  termino_fijo NUMERIC(10,5),
  termino_variable NUMERIC(10,5),
  tarifa_atr TEXT,
  iva NUMERIC(10,5),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(empresa_id)
);

-- Enable RLS on tarifas_gas
ALTER TABLE public.tarifas_gas ENABLE ROW LEVEL SECURITY;

-- RLS policies for tarifas_gas
CREATE POLICY "Anyone can view tarifas_gas"
  ON public.tarifas_gas
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage tarifas_gas"
  ON public.tarifas_gas
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create servicios_adicionales table
CREATE TABLE IF NOT EXISTS public.servicios_adicionales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  precio_mensual NUMERIC(10,5),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on servicios_adicionales
ALTER TABLE public.servicios_adicionales ENABLE ROW LEVEL SECURITY;

-- RLS policies for servicios_adicionales
CREATE POLICY "Anyone can view servicios_adicionales"
  ON public.servicios_adicionales
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage servicios_adicionales"
  ON public.servicios_adicionales
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tarifas_electricidad_updated_at
  BEFORE UPDATE ON public.tarifas_electricidad
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarifas_gas_updated_at
  BEFORE UPDATE ON public.tarifas_gas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servicios_adicionales_updated_at
  BEFORE UPDATE ON public.servicios_adicionales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();