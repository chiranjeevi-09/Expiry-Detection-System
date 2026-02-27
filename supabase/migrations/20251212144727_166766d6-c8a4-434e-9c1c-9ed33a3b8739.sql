-- Fix profiles table: only allow users to view their own profile
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Fix history table: users can only insert their own history records
DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.history;
CREATE POLICY "Users can insert own history" ON public.history
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix history table: users can only read their own history
DROP POLICY IF EXISTS "Authenticated users can read history" ON public.history;
CREATE POLICY "Users can read own history" ON public.history
FOR SELECT USING (auth.uid() = user_id);

-- Fix product_database: restrict INSERT and UPDATE to authenticated users only
DROP POLICY IF EXISTS "Allow public insert on product_database" ON public.product_database;
DROP POLICY IF EXISTS "Allow public read on product_database" ON public.product_database;
DROP POLICY IF EXISTS "Allow public update on product_database" ON public.product_database;

CREATE POLICY "Authenticated users can read product_database" ON public.product_database
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert product_database" ON public.product_database
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update product_database" ON public.product_database
FOR UPDATE USING (auth.uid() IS NOT NULL);