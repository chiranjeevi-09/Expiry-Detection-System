import { ProductType } from '@/types/product';
import { differenceInDays, addDays, format, isAfter, startOfDay } from 'date-fns';

export function calculateAlertDate(expiryDate: Date, productType: ProductType): Date {
  const today = startOfDay(new Date());
  const expiry = startOfDay(expiryDate);
  const daysUntilExpiry = differenceInDays(expiry, today);

  if (productType === 'food') {
    if (daysUntilExpiry <= 7) {
      return addDays(expiry, -3);
    } else if (daysUntilExpiry <= 30) {
      return addDays(expiry, -6);
    } else {
      return addDays(expiry, -20);
    }
  } else {
    // Non-food products
    if (daysUntilExpiry <= 150) {
      const notifyBefore = Math.floor(daysUntilExpiry * 0.3);
      return addDays(expiry, -notifyBefore);
    } else {
      return addDays(expiry, -60);
    }
  }
}

export function validateExpiryDate(dateString: string): boolean {
  // Common date formats regex
  const datePatterns = [
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{4}$/, // MM/YYYY
    /^\d{4}\/\d{2}$/, // YYYY/MM
  ];

  const isValidFormat = datePatterns.some(pattern => pattern.test(dateString));
  if (!isValidFormat) return false;

  const parsedDate = new Date(dateString);
  if (isNaN(parsedDate.getTime())) return false;

  const tomorrow = addDays(startOfDay(new Date()), 1);
  return isAfter(parsedDate, tomorrow) || parsedDate.getTime() === tomorrow.getTime();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy');
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const today = startOfDay(new Date());
  const expiry = startOfDay(new Date(expiryDate));
  return differenceInDays(expiry, today);
}

export function getExpiryStatus(expiryDate: string, alertDate: string): 'safe' | 'warning' | 'critical' | 'expired' {
  const today = startOfDay(new Date());
  const expiry = startOfDay(new Date(expiryDate));
  const alert = startOfDay(new Date(alertDate));

  if (today >= expiry) return 'expired';
  if (today >= alert) return 'critical';
  
  const daysUntilAlert = differenceInDays(alert, today);
  if (daysUntilAlert <= 3) return 'warning';
  
  return 'safe';
}
