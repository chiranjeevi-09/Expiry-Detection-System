/**
 * Universal Product Fetcher from Open Facts APIs
 * Supports: Food, Non-Food, and Beauty products
 */

interface ProductInfo {
  name: string;
  weight: number | null;
  source: 'food' | 'non-food' | 'beauty' | 'local';
  brand?: string;
  categories?: string;
}

const OPEN_FACTS_SOURCES = [
  { name: 'food' as const, url: 'https://world.openfoodfacts.org/api/v0/product/' },
  { name: 'non-food' as const, url: 'https://world.openproductsfacts.org/api/v0/product/' },
  { name: 'beauty' as const, url: 'https://world.openbeautyfacts.org/api/v0/product/' },
];

/**
 * Parse weight/quantity string to extract numeric grams
 */
function parseWeight(quantity: string | undefined): number | null {
  if (!quantity) return null;
  
  // Match patterns like "100g", "100 g", "100ml", "100 ml", "1kg", "1 kg", "1l", "1 l"
  const match = quantity.match(/(\d+(?:\.\d+)?)\s*(g|kg|ml|l|oz|lb)/i);
  
  if (!match) return null;
  
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  
  switch (unit) {
    case 'g':
    case 'ml':
      return value;
    case 'kg':
    case 'l':
      return value * 1000;
    case 'oz':
      return Math.round(value * 28.35);
    case 'lb':
      return Math.round(value * 453.59);
    default:
      return null;
  }
}

/**
 * Fetch product information from Open Facts APIs
 */
export async function fetchProductFromOpenFacts(barcode: string): Promise<ProductInfo | null> {
  if (!barcode || barcode.length < 8) {
    return null;
  }

  for (const source of OPEN_FACTS_SOURCES) {
    try {
      const response = await fetch(`${source.url}${barcode}.json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        const productName = product.product_name || product.product_name_en;
        
        if (productName) {
          return {
            name: productName,
            weight: parseWeight(product.quantity),
            source: source.name,
            brand: product.brands,
            categories: product.categories,
          };
        }
      }
    } catch (error) {
      // Continue to next source on error
      console.log(`Failed to fetch from ${source.name}:`, error);
      continue;
    }
  }

  return null;
}
