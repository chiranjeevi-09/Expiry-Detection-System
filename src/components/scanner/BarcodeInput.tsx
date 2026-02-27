import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BarcodeScanner } from './BarcodeScanner';
import { useProducts } from '@/hooks/useProducts';
import { toast } from 'sonner';

interface BarcodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onProductFound?: (info: { name: string; weight: number } | null) => void;
  label?: string;
}

export function BarcodeInput({ value, onChange, onProductFound, label = "Barcode" }: BarcodeInputProps) {
  const [isScanning, setIsScanning] = useState(false);
  const { getProductInfo } = useProducts();

  const lastNotifiedRef = useRef<string>('');

  const fetchProductInfo = useCallback(async (barcode: string) => {
    if (barcode.length === 13 && barcode !== lastNotifiedRef.current) {
      lastNotifiedRef.current = barcode;
      const info = await getProductInfo(barcode);
      if (info) {
        onProductFound?.(info);
        toast.success(`Product found: ${info.name}`);
      } else {
        onProductFound?.(null);
      }
    }
  }, [getProductInfo, onProductFound]);

  const handleScan = (barcode: string) => {
    onChange(barcode);
  };

  const handleClear = () => {
    onChange('');
    lastNotifiedRef.current = '';
    onProductFound?.(null);
  };

  // Also fetch when value changes (manual input or scan)
  useEffect(() => {
    if (value.length === 13) {
      fetchProductInfo(value);
    } else if (value === '') {
      lastNotifiedRef.current = '';
    }
  }, [value, fetchProductInfo]);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="barcode" className="text-foreground">
          {label}
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="barcode"
              type="text"
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                onChange(val);
              }}
              placeholder="Enter 13-digit barcode..."
              maxLength={13}
              className={`font-mono pr-10 transition-colors ${value.length === 13 ? 'border-success ring-success/20' : ''}`}
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant={isScanning ? "default" : "outline"}
            size="icon"
            onClick={() => setIsScanning(!isScanning)}
            className={`shrink-0 transition-all ${isScanning ? 'gradient-primary text-white border-transparent ring-2 ring-primary/20' : ''}`}
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>

        {isScanning && (
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setIsScanning(false)}
          />
        )}

        <p className="text-xs text-muted-foreground">
          Enter 13-digit numeric barcode or tap camera to scan inline
        </p>
      </div>
    </>
  );
}
