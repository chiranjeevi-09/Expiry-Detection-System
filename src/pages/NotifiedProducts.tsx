import { Bell, AlertTriangle, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ProductCard } from '@/components/products/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotifiedProducts() {
  const { notifiedProducts, productsLoading, removeProduct } = useProducts();

  if (productsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="gradient-warning p-3 rounded-xl">
          <Bell className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notified Products</h1>
          <p className="text-muted-foreground">Products approaching expiry dates</p>
        </div>
      </div>

      {/* Alert Summary */}
      {notifiedProducts.length > 0 && (
        <Card className="p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm text-foreground">
              <strong>{notifiedProducts.length}</strong> product{notifiedProducts.length !== 1 ? 's' : ''} require attention before expiry
            </p>
          </div>
        </Card>
      )}

      {/* Products List */}
      {notifiedProducts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-success/10">
              <Package className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">All Clear!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                No products currently require attention
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notifiedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onRemove={() => removeProduct(product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}