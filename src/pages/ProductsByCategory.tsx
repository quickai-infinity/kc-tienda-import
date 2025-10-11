import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "sonner";
import { Helmet } from "react-helmet";

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

const ProductsByCategory = () => {
  const { category } = useParams<{ category: string }>();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const decodedCategory = category ? decodeURIComponent(category) : "";

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .eq("category", decodedCategory)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Error al cargar los productos");
      } finally {
        setLoading(false);
      }
    };

    if (decodedCategory) {
      fetchProducts();
    }
  }, [decodedCategory]);

  return (
    <>
      <Helmet>
        <title>{decodedCategory} - KCtienda</title>
        <meta name="description" content={`Explora nuestra colección de productos en ${decodedCategory}`} />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Todos los productos
            </Link>
            <h1 className="text-4xl font-bold">{decodedCategory}</h1>
            <p className="text-muted-foreground mt-2">
              {loading ? "Cargando..." : `${products.length} productos encontrados`}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* No Products */}
          {!loading && products.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">
                No hay productos disponibles en esta categoría.
              </h3>
              <p className="text-muted-foreground mb-6">
                Intenta buscar en otras categorías o vuelve más tarde.
              </p>
              <Link to="/products">
                <Button variant="outline">Ver todos los productos</Button>
              </Link>
            </div>
          )}

          {/* Products Grid */}
          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} to={`/producto/${product.id}`}>
                  <Card className="group overflow-hidden border-border hover:shadow-lg transition-all duration-300 h-full cursor-pointer">
                    <CardContent className="p-0">
                      {/* Product Image */}
                      <div className="relative overflow-hidden aspect-square bg-muted">
                        <img
                          src={
                            product.image_url ||
                            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80"
                          }
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80";
                          }}
                        />
                        <div className="absolute top-4 right-4">
                          <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                            {product.stock > 0 ? "En stock" : "Agotado"}
                          </Badge>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-1 line-clamp-2">
                          {product.title}
                        </h3>
                        {product.brand && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {product.brand}
                          </p>
                        )}
                        <div className="text-2xl font-bold text-primary mb-1">
                          {formatPrice(product.price_cents, product.currency)}
                        </div>
                        <p className="text-xs italic text-muted-foreground">
                          (precio final con IVA incluido)
                        </p>
                      </div>
                    </CardContent>

                    <CardFooter className="p-4 pt-0">
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          addToCart(product);
                          toast.success("Producto añadido al carrito");
                        }}
                        disabled={product.stock === 0}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {product.stock === 0 ? "Agotado" : "Añadir al carrito"}
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ProductsByCategory;
