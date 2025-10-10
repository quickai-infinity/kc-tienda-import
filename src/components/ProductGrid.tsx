import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ShoppingCart, Star, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  sku: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  category: string | null;
  brand: string | null;
  stock: number;
  active: boolean;
}

export const ProductGrid = () => {
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(12);

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }
  
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("products.featuredProducts")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("products.explore")}
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products available at the moment.</p>
          </div>
        ) : (
          <>
            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {products.map((product, index) => (
                <Card
                  key={product.id}
                  className="group overflow-hidden border-border hover:shadow-lg transition-all duration-300 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-0">
                    {/* Product Image */}
                    <div className="relative overflow-hidden aspect-square bg-muted">
                      <img
                        src={product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80"}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-4 right-4">
                        <span className="bg-accent text-accent-foreground text-xs px-3 py-1 rounded-full">
                          {product.stock > 0 ? t("products.inStock") : t("products.outOfStock")}
                        </span>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      {product.category && <p className="text-xs text-muted-foreground mb-1">{product.category}</p>}
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.title}</h3>
                      {product.brand && (
                        <p className="text-sm text-muted-foreground mb-2">{product.brand}</p>
                      )}
                      <p className="text-2xl font-bold text-primary">
                        {product.currency === 'eur' ? '€' : '$'}
                        {(product.price_cents / 100).toFixed(2)}
                      </p>
                      {product.stock > 0 && product.stock <= 10 && (
                        <p className="text-xs text-orange-600 mt-1">
                          {t("products.onlyLeft")} {product.stock} {t("products.left")}
                        </p>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button 
                      className="w-full bg-accent hover:bg-accent/90 group"
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {product.stock === 0 ? t("products.outOfStock") : t("products.addToCart")}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* View All Button */}
            <div className="text-center">
              <Button size="lg" variant="outline">
                {t("products.viewAll")}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
