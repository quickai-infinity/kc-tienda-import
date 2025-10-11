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
import { Loader2, Package, Plus, Minus } from "lucide-react";
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
    const shouldDefaultOpen = category.children?.some(c => isActive(c.slug)) || false;

    if (hasChildren) {
      return (
        <Collapsible key={category.id} defaultOpen={shouldDefaultOpen}>
          <SidebarMenuItem>
            <div className="flex items-center w-full gap-1">
              {!collapsed && (
                <CollapsibleTrigger className="p-1 hover:bg-muted rounded flex-shrink-0 [&[data-state=open]>svg.plus]:hidden [&[data-state=closed]>svg.minus]:hidden">
                  <Plus className="h-3 w-3 plus" />
                  <Minus className="h-3 w-3 minus" />
                </CollapsibleTrigger>
              )}
              <SidebarMenuButton 
                asChild={category.product_count ? category.product_count > 0 : false}
                className={`flex-1 ${active ? "bg-muted font-medium" : ""}`}
              >
                {category.product_count && category.product_count > 0 ? (
                  <Link to={`/categoria/${category.slug}`} className="flex items-center justify-between w-full">
                    <span className="truncate text-sm">{category.name}</span>
                    {!collapsed && (
                      <Badge variant="secondary" className="ml-2 flex-shrink-0 text-xs">
                        {category.product_count}
                      </Badge>
                    )}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate text-sm">{category.name}</span>
                  </div>
                )}
              </SidebarMenuButton>
            </div>
            <CollapsibleContent className="transition-all duration-200">
              <SidebarMenu className={`ml-6 mt-1 space-y-1 ${!collapsed ? 'border-l border-border pl-3' : ''}`}>
                {category.children?.map(child => renderCategory(child, level + 1))}
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={category.id}>
        <SidebarMenuButton asChild className={`${active ? "bg-muted font-medium" : ""} hover:bg-muted/50`}>
          <Link to={`/categoria/${category.slug}`} className="flex items-center justify-between w-full">
            <span className="truncate text-sm">{category.name}</span>
            {!collapsed && category.product_count && category.product_count > 0 && (
              <Badge variant="secondary" className="ml-2 flex-shrink-0 text-xs">
                {category.product_count}
              </Badge>
            )}
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
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider font-semibold px-4 mb-2">
            Categorías
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
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
