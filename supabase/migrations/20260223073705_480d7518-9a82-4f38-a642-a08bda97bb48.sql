
-- Add mobile_number to profiles table
ALTER TABLE public.profiles ADD COLUMN mobile_number text DEFAULT NULL;

-- Add variant to products table (optional field)
ALTER TABLE public.products ADD COLUMN variant text DEFAULT NULL;
