-- Fix products table: users can only read their own products (admins can read all)
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
CREATE POLICY "Users can read own products" ON public.products
FOR SELECT USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Fix product_database: only admins can insert/update, all authenticated can read
DROP POLICY IF EXISTS "Authenticated users can insert product_database" ON public.product_database;
DROP POLICY IF EXISTS "Authenticated users can update product_database" ON public.product_database;

CREATE POLICY "Admins can insert product_database" ON public.product_database
FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product_database" ON public.product_database
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));