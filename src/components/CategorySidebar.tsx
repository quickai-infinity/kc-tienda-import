import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  product_count?: number;
  children?: Category[];
}

export function CategorySidebar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  useEffect(() => {
    const fetchCategories = async () => {
      try {
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

        // Fetch product counts
        const categoriesWithCounts = await Promise.all(
          categoriesData.map(async (category) => {
            const { count } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('active', true)
              .eq('category_id', category.id);

            return { ...category, product_count: count || 0 };
          })
        );

        // Build tree structure
        const categoryMap = new Map<string, Category>();
        categoriesWithCounts.forEach(cat => {
          categoryMap.set(cat.id, { ...cat, children: [] });
        });

        const rootCategories: Category[] = [];
        categoriesWithCounts.forEach(cat => {
          const category = categoryMap.get(cat.id)!;
          if (cat.parent_id && categoryMap.has(cat.parent_id)) {
            categoryMap.get(cat.parent_id)!.children!.push(category);
          } else {
            rootCategories.push(category);
          }
        });

        // Filter categories with products
        const filterEmpty = (cats: Category[]): Category[] => {
          return cats
            .filter(cat => (cat.product_count || 0) > 0 || (cat.children && cat.children.length > 0))
            .map(cat => ({
              ...cat,
              children: cat.children ? filterEmpty(cat.children) : []
            }));
        };

        setCategories(filterEmpty(rootCategories));
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error("Error al cargar las categorías");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const isActive = (slug: string) => location.pathname === `/categoria/${slug}`;

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const active = isActive(category.slug);

    if (hasChildren) {
      return (
        <Collapsible key={category.id} defaultOpen={category.children?.some(c => isActive(c.slug))}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className={active ? "bg-muted" : ""}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Package className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="truncate">{category.name}</span>
                        {category.product_count && category.product_count > 0 && (
                          <Badge variant="secondary" className="ml-auto flex-shrink-0">
                            {category.product_count}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  {!collapsed && <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />}
                </div>
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu className="ml-4 border-l pl-2">
                {category.children?.map(child => renderCategory(child, level + 1))}
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={category.id}>
        <SidebarMenuButton asChild className={active ? "bg-muted" : ""}>
          <Link to={`/categoria/${category.slug}`} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Package className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{category.name}</span>
                  {category.product_count && category.product_count > 0 && (
                    <Badge variant="secondary" className="ml-auto flex-shrink-0">
                      {category.product_count}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  if (loading) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categorías</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No hay categorías disponibles
                  </p>
                </div>
              ) : (
                categories.map(category => renderCategory(category))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
