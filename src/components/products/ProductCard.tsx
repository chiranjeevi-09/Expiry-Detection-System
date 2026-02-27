import { Package, Calendar, AlertTriangle, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types/product';
import { formatDate, getDaysUntilExpiry, getExpiryStatus } from '@/utils/expiryCalculator';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onRemove?: (id: string) => void;
  showRemoveButton?: boolean;
}

export function ProductCard({ product, onRemove, showRemoveButton = true }: ProductCardProps) {
  const daysUntilExpiry = getDaysUntilExpiry(product.expiryDate);
  const status = getExpiryStatus(product.expiryDate, product.alertDate);

  const statusColors = {
    safe: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    critical: 'bg-destructive/10 text-destructive border-destructive/20',
    expired: 'bg-muted text-muted-foreground border-muted',
  };

  const statusLabels = {
    safe: 'Safe',
    warning: 'Warning',
    critical: 'Critical',
    expired: 'Expired',
  };

  return (
    <Card className="p-4 shadow-card hover:shadow-glow transition-all duration-300 border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div className={cn(
              "p-2 rounded-lg",
              product.type === 'food' ? 'bg-success/10' : 'bg-primary/10'
            )}>
              <Package className={cn(
                "h-4 w-4",
                product.type === 'food' ? 'text-success' : 'text-primary'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {product.name}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {product.barcode}
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-sm mt-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Expiry: {formatDate(product.expiryDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Alert: {formatDate(product.alertDate)}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize">
              {product.type}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Qty: {product.quantity}
            </Badge>
            <Badge className={cn("text-xs", statusColors[status])}>
              {statusLabels[status]} • {daysUntilExpiry > 0 ? `${daysUntilExpiry}d` : 'Expired'}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        {showRemoveButton && onRemove && status !== 'expired' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(product.id)}
            className="text-destructive hover:bg-destructive/10 shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
