import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { formatPrice } from "@/lib/formatPrice";
import { useLanguage } from "@/contexts/LanguageContext";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SidebarToggle } from "@/components/SidebarToggle";

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
        <div className="flex-1 flex">
          <CategorySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <SidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div className={`flex-1 flex items-center justify-center transition-all duration-300 ${
            sidebarOpen ? "ml-64 sm:ml-0" : "ml-0"
          }`}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex">
          <CategorySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <SidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
          <div className={`flex-1 flex items-center justify-center transition-all duration-300 ${
            sidebarOpen ? "ml-64 sm:ml-0" : "ml-0"
          }`}>
            <p className="text-muted-foreground">Categoría no encontrada</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex">
        <CategorySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <SidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className={`flex-1 overflow-auto transition-all duration-300 ${
          sidebarOpen ? "ml-64 sm:ml-0" : "ml-0"
        }`}>
          {/* Breadcrumb */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
            <div className="container mx-auto px-6 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground transition-colors">
                  Inicio
                </Link>
                <span>/</span>
                <span className="text-foreground">{category.name}</span>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <section className="py-6">
            <div className="container mx-auto px-6">
              {/* Category Title */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">{category.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {products.length} {products.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No hay productos en esta categoría.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      to={`/producto/${product.id}`}
                      className="group"
                    >
                      <Card className="overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300 h-full">
                        <div className="aspect-square overflow-hidden bg-muted/50">
                          <img
                            src={product.image_url || "/assets/no-image.png"}
                            alt={product.name || product.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={(e) => {
                              e.currentTarget.src = "/assets/no-image.png";
                            }}
                          />
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                            {product.name || product.title}
                          </h3>
                          {product.brand && (
                            <p className="text-xs text-muted-foreground mb-3">
                              {product.brand}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <span className="text-lg font-bold text-primary">
                              {formatPrice(product.price_cents)}
                            </span>
                            {product.stock > 0 ? (
                              <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px]">
                                En stock
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-destructive/10 text-destructive text-[10px]">
                                Agotado
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      
      <Footer />
    </div>
  );
};

export default CategoryProducts;
