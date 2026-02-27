export type ProductType = 'food' | 'non-food';

export type ProductStatus = 'active' | 'notified' | 'expired' | 'removed';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  type: ProductType;
  variant?: string;
  weight?: number;
  quantity: number;
  manufacturingDate?: string;
  expiryDate: string;
  alertDate: string;
  status: ProductStatus;
  addedAt: string;
}

export interface HistoryEntry {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  action: 'added' | 'notified' | 'removed' | 'expired';
  timestamp: string;
  details?: string;
}
