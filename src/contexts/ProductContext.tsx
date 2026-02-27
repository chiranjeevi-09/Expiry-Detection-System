import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Product, HistoryEntry, ProductType } from '@/types/product';
import { mockProducts, mockHistory, productDatabase } from '@/data/mockData';
import { calculateAlertDate, getDaysUntilExpiry } from '@/utils/expiryCalculator';
import { format, startOfDay } from 'date-fns';

interface ProductContextType {
  products: Product[];
  history: HistoryEntry[];
  notifiedProducts: Product[];
  addProduct: (product: Omit<Product, 'id' | 'alertDate' | 'status' | 'addedAt'>) => void;
  removeProduct: (id: string) => void;
  searchProducts: (barcode: string, type?: ProductType) => Product[];
  getProductInfo: (barcode: string) => { name: string; weight: number } | null;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [history, setHistory] = useState<HistoryEntry[]>(mockHistory);

  // Auto-cleanup expired products
  useEffect(() => {
    const today = startOfDay(new Date());
    setProducts(prev => 
      prev.map(product => {
        const expiryDate = new Date(product.expiryDate);
        if (expiryDate < today && product.status !== 'expired') {
          // Add to history
          const historyEntry: HistoryEntry = {
            id: Date.now().toString(),
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            action: 'expired',
            timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
            details: 'Product expired and removed from active inventory',
          };
          setHistory(h => [historyEntry, ...h]);
          return { ...product, status: 'expired' as const };
        }
        return product;
      })
    );
  }, []);

  const notifiedProducts = products.filter(p => {
    if (p.status === 'expired' || p.status === 'removed') return false;
    const alertDate = new Date(p.alertDate);
    const today = startOfDay(new Date());
    return alertDate <= today && new Date(p.expiryDate) > today;
  });

  const addProduct = useCallback((productData: Omit<Product, 'id' | 'alertDate' | 'status' | 'addedAt'>) => {
    const expiryDate = new Date(productData.expiryDate);
    const alertDate = calculateAlertDate(expiryDate, productData.type);
    
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString(),
      alertDate: format(alertDate, 'yyyy-MM-dd'),
      status: 'active',
      addedAt: format(new Date(), 'yyyy-MM-dd'),
    };

    setProducts(prev => [...prev, newProduct]);

    const historyEntry: HistoryEntry = {
      id: Date.now().toString(),
      productId: newProduct.id,
      productName: newProduct.name,
      barcode: newProduct.barcode,
      action: 'added',
      timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
      details: `Added ${newProduct.quantity} units to inventory`,
    };
    setHistory(prev => [historyEntry, ...prev]);
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts(prev => 
      prev.map(p => p.id === id ? { ...p, status: 'removed' as const } : p)
    );

    const product = products.find(p => p.id === id);
    if (product) {
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        productId: id,
        productName: product.name,
        barcode: product.barcode,
        action: 'removed',
        timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        details: 'Product removed from inventory',
      };
      setHistory(prev => [historyEntry, ...prev]);
    }
  }, [products]);

  const searchProducts = useCallback((barcode: string, type?: ProductType) => {
    return products.filter(p => {
      const matchesBarcode = p.barcode.includes(barcode);
      const matchesType = !type || p.type === type;
      return matchesBarcode && matchesType;
    });
  }, [products]);

  const getProductInfo = useCallback((barcode: string) => {
    return productDatabase[barcode] || null;
  }, []);

  return (
    <ProductContext.Provider value={{
      products,
      history,
      notifiedProducts,
      addProduct,
      removeProduct,
      searchProducts,
      getProductInfo,
    }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
