import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, HistoryEntry, ProductType } from '@/types/product';
import { calculateAlertDate } from '@/utils/expiryCalculator';
import { fetchProductFromOpenFacts } from '@/utils/openFactsApi';
import { format, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function useProducts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(p => ({
        id: p.id,
        barcode: p.barcode,
        name: p.name,
        type: p.type as ProductType,
        variant: (p as any).variant || undefined,
        weight: p.weight || undefined,
        quantity: p.quantity,
        manufacturingDate: p.manufacturing_date || undefined,
        expiryDate: p.expiry_date,
        alertDate: p.alert_date,
        status: p.status as Product['status'],
        addedAt: p.added_at,
      })) as Product[];
    },
  });

  // Fetch history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(h => ({
        id: h.id,
        productId: h.product_id || '',
        productName: h.product_name,
        barcode: h.barcode,
        action: h.action as HistoryEntry['action'],
        timestamp: h.created_at,
        details: h.details || undefined,
      })) as HistoryEntry[];
    },
  });

  // Get notified products (active products past their alert date but before expiry)
  const notifiedProducts = products.filter(p => {
    if (p.status === 'expired' || p.status === 'removed') return false;
    // Compare using date strings (YYYY-MM-DD) to avoid timezone issues
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return p.alertDate <= todayStr && p.expiryDate > todayStr;
  });

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (productData: Omit<Product, 'id' | 'alertDate' | 'status' | 'addedAt'>) => {
      if (!user) throw new Error('Must be authenticated to add products');

      const expiryDate = new Date(productData.expiryDate);
      const alertDate = calculateAlertDate(expiryDate, productData.type);

      const insertData: any = {
        barcode: productData.barcode,
        name: productData.name,
        type: productData.type,
        weight: productData.weight || null,
        quantity: productData.quantity,
        manufacturing_date: productData.manufacturingDate || null,
        expiry_date: productData.expiryDate,
        alert_date: format(alertDate, 'yyyy-MM-dd'),
        status: 'active',
        user_id: user.id,
      };
      if ((productData as any).variant) {
        insertData.variant = (productData as any).variant;
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(insertData)
        .select()
        .single();

      if (productError) throw productError;

      // Add history entry
      await supabase.from('history').insert({
        product_id: product.id,
        product_name: productData.name,
        barcode: productData.barcode,
        action: 'added',
        details: `Added ${productData.quantity} units to inventory`,
        user_id: user.id,
      });

      return product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      toast.success('Product stored successfully!');
    },
    onError: (error) => {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    },
  });

  // Remove product mutation
  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');

      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'removed' })
        .eq('id', productId);

      if (updateError) throw updateError;

      // Add history entry
      await supabase.from('history').insert({
        product_id: productId,
        product_name: product.name,
        barcode: product.barcode,
        action: 'removed',
        details: 'Product removed from inventory',
        user_id: user?.id || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      toast.success('Product removed');
    },
    onError: (error) => {
      console.error('Error removing product:', error);
      toast.error('Failed to remove product');
    },
  });

  // Get product info from local database first, then try Open Facts APIs
  const getProductInfo = useCallback(async (barcode: string): Promise<{ name: string; weight: number } | null> => {
    // First try local database
    const { data, error } = await supabase
      .from('product_database')
      .select('*')
      .eq('barcode', barcode)
      .maybeSingle();

    if (!error && data) {
      return { name: data.name, weight: data.weight || 0 };
    }

    // Fallback to Open Facts APIs
    const openFactsProduct = await fetchProductFromOpenFacts(barcode);
    if (openFactsProduct) {
      return {
        name: openFactsProduct.name,
        weight: openFactsProduct.weight || 0
      };
    }

    return null;
  }, []);

  // Search products
  const searchProducts = useCallback((barcode: string, type?: ProductType) => {
    return products.filter(p => {
      const matchesBarcode = p.barcode.includes(barcode);
      const matchesType = !type || p.type === type;
      return matchesBarcode && matchesType;
    });
  }, [products]);

  return {
    products,
    history,
    notifiedProducts,
    productsLoading,
    historyLoading,
    addProduct: addProductMutation.mutate,
    removeProduct: removeProductMutation.mutate,
    getProductInfo,
    searchProducts,
    isAdding: addProductMutation.isPending,
  };
}
