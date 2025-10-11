import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { Loader2, ShoppingCart, ChevronRight, Home } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/formatPrice";
import { useLanguage } from "@/contexts/LanguageContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CategorySidebar } from "@/components/CategorySidebar";

interface Product {
  id: string;
  name: string;
  title: string;
  price_cents: number;
  stock: number;
  image_url: string | null;
  brand: string | null;
  category: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

const CategoryProducts = () => {
  const { slug } = useParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchCategoryAndProducts = async () => {
      if (!slug) return;

      setLoading(true);

      try {
        // Fetch category by slug
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', slug)
          .single();

        if (categoryError) throw categoryError;
        if (!categoryData) {
          toast.error("Categoría no encontrada");
          setLoading(false);
          return;
        }

        setCategory(categoryData);

        // Fetch products in this category
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .eq('category_id', categoryData.id)
          .order('name');

        if (productsError) throw productsError;

        setProducts(productsData || []);
      } catch (error) {
        console.error('Error fetching category products:', error);
        toast.error("Error al cargar los productos");
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndProducts();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <SidebarProvider>
          <div className="flex-1 flex w-full">
            <CategorySidebar />
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </SidebarProvider>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <SidebarProvider>
          <div className="flex-1 flex w-full">
            <CategorySidebar />
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Categoría no encontrada</p>
            </div>
          </div>
        </SidebarProvider>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <SidebarProvider>
        <div className="flex-1 flex w-full">
          <CategorySidebar />
          
          <main className="flex-1 overflow-auto">
            {/* Header with Sidebar Trigger */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="container mx-auto px-4 py-3 flex items-center gap-2">
                <SidebarTrigger />
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Link to="/" className="hover:text-primary flex items-center gap-1 transition-colors">
                    <Home className="h-4 w-4" />
                    Inicio
                  </Link>
                  <ChevronRight className="h-4 w-4" />
                  <Link to="/shop" className="hover:text-primary transition-colors">
                    Categorías
                  </Link>
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-foreground font-medium">{category.name}</span>
                </nav>
              </div>
            </div>

            <div className="container mx-auto px-4 py-6">
              {/* Category Header */}
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">{category.name}</h1>
                {category.description && !category.description.includes("importada automáticamente") && (
                  <p className="text-muted-foreground">{category.description}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {products.length} {products.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>

              {/* Products Grid */}
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No hay productos en esta categoría actualmente.</p>
                  <Link to="/shop">
                    <Button variant="outline" className="mt-4">
                      Ver todas las categorías
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="flex flex-col">
                      <Link to={`/producto/${product.id}`}>
                        <div className="aspect-square overflow-hidden bg-muted">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <img
                                src="/assets/no-image.png"
                                alt="Sin imagen"
                                className="w-32 h-32 opacity-50"
                              />
                            </div>
                          )}
                        </div>
                      </Link>
                      
                      <CardHeader>
                        <CardTitle className="line-clamp-2 text-base">{product.name}</CardTitle>
                        {product.brand && (
                          <CardDescription className="text-xs">{product.brand}</CardDescription>
                        )}
                      </CardHeader>
                      
                      <CardContent className="flex-1">
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(product.price_cents)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          (precio final con IVA incluido)
                        </p>
                        {product.stock > 0 ? (
                          <Badge variant="outline" className="mt-2">
                            {t('inStock')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="mt-2">
                            {t('outOfStock')}
                          </Badge>
                        )}
                      </CardContent>
                      
                      <CardFooter>
                        <Button
                          className="w-full"
                          disabled={product.stock <= 0}
                          onClick={() => {
                          addToCart({
                            id: product.id,
                            title: product.title,
                            price_cents: product.price_cents,
                            currency: 'eur',
                            image_url: product.image_url,
                            stock: product.stock,
                          });
                            toast.success(t('addedToCart'));
                          }}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {product.stock > 0 ? t('addToCart') : t('outOfStock')}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
      
      <Footer />
    </div>
  );
};

export default CategoryProducts;
