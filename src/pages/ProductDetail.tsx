import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ShoppingCart, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/formatPrice";
import { toast } from "sonner";
import { Helmet } from "react-helmet";

interface Product {
  id: string;
  sku: string;
  name: string;
  title: string;
  description: string | null;
  price_cents: number;
  price_base: number;
  price_final: number;
  currency: string;
  image_url: string | null;
  category: string | null;
  brand: string | null;
  stock: number;
  active: boolean;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        navigate("/products");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .eq("active", true)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast.error("Producto no encontrado");
          navigate("/products");
          return;
        }

        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Error al cargar el producto");
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const handleAddToCart = () => {
    addToCart(product);
    toast.success("Producto añadido al carrito");
  };

  return (
    <>
      <Helmet>
        <title>{product.name || product.title} - KCtienda</title>
        <meta name="description" content={product.description || product.name || product.title} />
        <meta property="og:title" content={product.name || product.title} />
        <meta property="og:description" content={product.description || product.name || product.title} />
        <meta property="og:image" content={product.image_url || ""} />
        <meta property="og:type" content="product" />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link to="/products" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" />
            Volver a productos
          </Link>

          {/* Product Detail */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Image */}
            <div className="relative">
              <Card className="overflow-hidden shadow-md">
                <div className="aspect-square bg-muted">
                  <img
                    src={product.image_url || "/assets/no-image.png"}
                    alt={product.title}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      e.currentTarget.src = "/assets/no-image.png";
                    }}
                  />
                </div>
              </Card>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Category Badge */}
              {product.category && (
                <Link to={`/productos/${encodeURIComponent(product.category)}`}>
                  <Badge variant="secondary" className="mb-2">
                    {product.category}
                  </Badge>
                </Link>
              )}

              {/* Product Title */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name || product.title}</h1>
                {product.brand && (
                  <p className="text-lg font-semibold text-muted-foreground">{product.brand}</p>
                )}
              </div>

              {/* Price */}
              <div className="border-y py-4">
                <div className="text-4xl font-bold text-primary mb-1">
                  {formatPrice(product.price_final || product.price_cents, product.currency)}
                </div>
                <p className="text-sm italic text-muted-foreground">
                  (precio final con IVA incluido)
                </p>
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">
                  {product.stock > 0 ? (
                    <span className="text-green-600 font-medium">
                      En stock ({product.stock} unidades disponibles)
                    </span>
                  ) : (
                    <span className="text-destructive font-medium">Agotado</span>
                  )}
                </span>
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Descripción</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Product Details */}
              <Card>
                <CardContent className="p-4 space-y-2">
                  {product.sku && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SKU:</span>
                      <span className="font-medium">{product.sku}</span>
                    </div>
                  )}
                  {product.brand && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Marca:</span>
                      <span className="font-medium">{product.brand}</span>
                    </div>
                  )}
                  {product.category && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Categoría:</span>
                      <span className="font-medium">{product.category}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add to Cart Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                {product.stock === 0 ? "Agotado" : "Añadir al carrito"}
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default ProductDetail;
