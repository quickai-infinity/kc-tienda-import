-- Create branding table
CREATE TABLE public.branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name TEXT NOT NULL DEFAULT 'Compare Energia',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#0A8754',
  show_only_my_company BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on branding
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

-- RLS policies for branding
CREATE POLICY "Anyone can view branding"
  ON public.branding
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert branding"
  ON public.branding
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update branding"
  ON public.branding
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_branding_updated_at
  BEFORE UPDATE ON public.branding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default branding
INSERT INTO public.branding (app_name, primary_color)
VALUES ('Compare Energia', '#0A8754');