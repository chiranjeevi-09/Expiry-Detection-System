import { useState } from 'react';
import { Search, Filter, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/products/ProductCard';
import { BarcodeInput } from '@/components/scanner/BarcodeInput';
import { useProducts } from '@/hooks/useProducts';
import { ProductType } from '@/types/product';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function SearchProduct() {
  const { products, productsLoading, searchProducts, removeProduct } = useProducts();
  const [barcode, setBarcode] = useState('');
  const [typeFilter, setTypeFilter] = useState<ProductType | 'all'>('all');
  const [searchResults, setSearchResults] = useState<ReturnType<typeof searchProducts>>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const [showBarcodeError, setShowBarcodeError] = useState(false);

  const handleSearch = () => {
    if (!barcode.trim()) {
      setShowBarcodeError(true);
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    
    setShowBarcodeError(false);
    const results = searchProducts(
      barcode.trim(),
      typeFilter === 'all' ? undefined : typeFilter
    );
    setSearchResults(results);
    setHasSearched(true);
  };

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'food', label: 'Food' },
    { value: 'non-food', label: 'Non-Food' },
  ] as const;

  if (productsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="gradient-primary p-3 rounded-xl">
          <Search className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search Product</h1>
          <p className="text-muted-foreground">Find products by barcode</p>
        </div>
      </div>

      {/* Search Form */}
      <Card className="p-6 shadow-card">
        <div className="space-y-4">
          <BarcodeInput
            value={barcode}
            onChange={(val) => {
              setBarcode(val);
              setShowBarcodeError(false);
            }}
            label="Search by Barcode"
          />
          {showBarcodeError && (
            <p className="text-sm text-destructive">Please enter a barcode to search</p>
          )}

          {/* Type Filter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filter by type</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTypeFilter(option.value)}
                  className={cn(
                    "transition-all",
                    typeFilter === option.value && "bg-primary text-primary-foreground border-primary"
                  )}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSearch}
            className="w-full gradient-primary text-primary-foreground"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Products
          </Button>
        </div>
      </Card>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''} Found
            </h2>
            <Badge variant="secondary">{searchResults.length} products</Badge>
          </div>
          
          {searchResults.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No products found matching your criteria
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onRemove={() => removeProduct(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}