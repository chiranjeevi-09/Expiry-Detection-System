import { useState, useEffect } from 'react';
import { UtensilsCrossed, Package, Check, Loader2, CalendarClock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BarcodeInput } from '@/components/scanner/BarcodeInput';
import { ExpiryScanner } from '@/components/scanner/ExpiryScanner';
import { useProducts } from '@/hooks/useProducts';
import { ProductType } from '@/types/product';
import { toast } from 'sonner';
import { calculateAlertDate } from '@/utils/expiryCalculator';
import { format } from 'date-fns';
interface StoreProductProps {
  type: ProductType;
}
export default function StoreProduct({
  type
}: StoreProductProps) {
  const {
    addProduct,
    isAdding
  } = useProducts();
  const [barcode, setBarcode] = useState('');
  const [productName, setProductName] = useState('');
  const [variant, setVariant] = useState('');
  const [weight, setWeight] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [alertDate, setAlertDate] = useState<string | null>(null);
  const isFood = type === 'food';
  const Icon = isFood ? UtensilsCrossed : Package;

  // Handle product info from barcode scan
  const handleProductFound = (info: {
    name: string;
    weight: number;
  } | null) => {
    if (info) {
      setProductName(info.name);
      setWeight(info.weight?.toString() || '');
    }
  };

  // Calculate alert date when expiry date changes
  useEffect(() => {
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const alert = calculateAlertDate(expiry, type);
      setAlertDate(format(alert, 'yyyy-MM-dd'));
    } else {
      setAlertDate(null);
    }
  }, [expiryDate, type]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode || barcode.length !== 13) {
      toast.error('Barcode must be exactly 13 digits');
      return;
    }
    if (!productName || !weight || !quantity || !expiryDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    addProduct({
      barcode,
      name: productName,
      type,
      variant: variant || undefined,
      weight: parseInt(weight),
      quantity: parseInt(quantity),
      expiryDate
    });

    // Reset form
    setBarcode('');
    setProductName('');
    setVariant('');
    setWeight('');
    setQuantity('');
    setExpiryDate('');
    setAlertDate(null);
  };
  return <div className="space-y-6 max-w-2xl mx-auto">
    {/* Page Header */}
    <div className="flex items-center gap-3">
      <div className={`p-3 rounded-xl ${isFood ? 'gradient-success' : 'gradient-primary'}`}>
        <Icon className="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Store {isFood ? 'Food' : 'Non-Food'} Product
        </h1>
        <p className="text-muted-foreground">
          Add new {type} items to inventory
        </p>
      </div>
    </div>

    {/* Form */}
    <Card className="p-6 shadow-card">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Barcode */}
        <BarcodeInput value={barcode} onChange={setBarcode} onProductFound={handleProductFound} />

        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input id="name" type="text" value={productName} onChange={e => setProductName(e.target.value)} placeholder="Enter product name..." required />
        </div>

        {/* Variant (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="variant">Variant</Label>
          <Input id="variant" type="text" value={variant} onChange={e => setVariant(e.target.value)} placeholder="e.g., Chocolate, 500ml, Large..." />
        </div>

        {/* Weight & Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (grams) *</Label>
            <Input id="weight" type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g., 500" min="1" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="e.g., 10" min="1" required />
          </div>
        </div>

        {/* Expiry Date */}
        <ExpiryScanner value={expiryDate} onChange={setExpiryDate} />

        {/* Alert Date Display - Only shown when expiry date is set */}
        <div className="space-y-2">
          <Label className="text-foreground flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Alert Date
          </Label>
          <div className={`p-3 rounded-lg border ${alertDate ? 'bg-warning/10 border-warning/30' : 'bg-muted/50 border-border'}`}>
            {alertDate ? <div className="flex items-center justify-between">
              <span className="text-sm text-foreground font-medium">
                {format(new Date(alertDate), 'dd MMM yyyy')}
              </span>
              <span className="text-xs text-muted-foreground">
                Notification will trigger on this date
              </span>
            </div> : <span className="text-sm text-muted-foreground italic">
              Enter expiry date to calculate alert date
            </span>}
          </div>
        </div>

        {/* Algorithm Info */}


        {/* Submit */}
        <Button type="submit" disabled={isAdding} className="w-full gradient-primary text-primary-foreground">
          {isAdding ? <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Storing Product...
          </> : <>
            <Check className="h-4 w-4 mr-2" />
            Store Product
          </>}
        </Button>
      </form>
    </Card>
  </div>;
}