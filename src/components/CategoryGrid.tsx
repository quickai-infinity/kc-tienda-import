import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  product_count?: number;
}

export const CategoryGrid = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (categoriesError) throw categoriesError;

        if (!categoriesData || categoriesData.length === 0) {
          setCategories([]);
          setLoading(false);
          return;
        }

        // Fetch product counts for each category
        const categoriesWithCounts = await Promise.all(
          categoriesData.map(async (category) => {
            const { count, error } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('active', true)
              .eq('category_id', category.id);

            if (error) {
              console.error(`Error counting products for ${category.name}:`, error);
              return { ...category, product_count: 0 };
            }

            return { ...category, product_count: count || 0 };
          })
        );

        // Filter out categories with no products
        const categoriesWithProducts = categoriesWithCounts.filter(cat => cat.product_count && cat.product_count > 0);
        setCategories(categoriesWithProducts);
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error("Error al cargar las categorías");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">
          No hay categorías disponibles actualmente.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => (
        <Link key={category.id} to={`/categoria/${category.slug}`}>
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  {category.description && (
                    <CardDescription className="mt-2 line-clamp-2">
                      {category.description}
                    </CardDescription>
                  )}
                </div>
                <Package className="h-6 w-6 text-primary flex-shrink-0 ml-2" />
              </div>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">
                {category.product_count} {category.product_count === 1 ? 'producto' : 'productos'}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};
