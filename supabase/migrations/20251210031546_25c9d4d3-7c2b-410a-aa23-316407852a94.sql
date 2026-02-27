-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('food', 'non-food')),
  weight INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  manufacturing_date DATE,
  expiry_date DATE NOT NULL,
  alert_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notified', 'expired', 'removed')),
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create history table
CREATE TABLE public.history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  barcode TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('added', 'notified', 'removed', 'expired')),
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create product_database for storing known products info
CREATE TABLE public.product_database (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  weight INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (public access for supermarket staff)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_database ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for inventory system)
CREATE POLICY "Allow public read on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow public insert on products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on products" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow public read on history" ON public.history FOR SELECT USING (true);
CREATE POLICY "Allow public insert on history" ON public.history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on product_database" ON public.product_database FOR SELECT USING (true);
CREATE POLICY "Allow public insert on product_database" ON public.product_database FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on product_database" ON public.product_database FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for products table
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Insert some sample product database entries
INSERT INTO public.product_database (barcode, name, weight) VALUES
('8901234567890', 'Amul Butter', 500),
('8902345678901', 'Britannia Bread', 400),
('8903456789012', 'Parle-G Biscuits', 250),
('8904567890123', 'Tata Salt', 1000),
('8905678901234', 'Dettol Soap', 125);