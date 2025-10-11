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
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { open } = useSidebar();
  const location = useLocation();
  const collapsed = !open;

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
                <CollapsibleTrigger className="p-1 hover:bg-accent/50 rounded flex-shrink-0 transition-colors [&[data-state=open]>svg.plus]:hidden [&[data-state=closed]>svg.minus]:hidden">
                  <Plus className="h-3.5 w-3.5 plus text-muted-foreground" />
                  <Minus className="h-3.5 w-3.5 minus text-muted-foreground" />
                </CollapsibleTrigger>
              )}
              <SidebarMenuButton 
                asChild={category.product_count ? category.product_count > 0 : false}
                className={`flex-1 h-8 ${active ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" : "text-foreground/80 hover:text-foreground hover:bg-accent/30"}`}
              >
                {category.product_count && category.product_count > 0 ? (
                  <Link to={`/categoria/${category.slug}`} className="flex items-center justify-between w-full">
                    <span className="truncate text-[13px]">{category.name}</span>
                    {!collapsed && (
                      <Badge variant="secondary" className="ml-2 flex-shrink-0 text-[10px] px-1.5 py-0 h-5 bg-accent/50">
                        {category.product_count}
                      </Badge>
                    )}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate text-[13px] font-medium">{category.name}</span>
                  </div>
                )}
              </SidebarMenuButton>
            </div>
            <CollapsibleContent className="transition-all duration-200">
              <SidebarMenu className={`ml-4 mt-0.5 space-y-0.5 ${!collapsed ? 'border-l border-border/50 pl-2' : ''}`}>
                {category.children?.map(child => renderCategory(child, level + 1))}
              </SidebarMenu>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      );
    }

    return (
      <SidebarMenuItem key={category.id}>
        <SidebarMenuButton 
          asChild 
          className={`h-8 ${active ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" : "text-foreground/80 hover:text-foreground hover:bg-accent/30"}`}
        >
          <Link to={`/categoria/${category.slug}`} className="flex items-center justify-between w-full">
            <span className="truncate text-[13px]">{category.name}</span>
            {!collapsed && category.product_count && category.product_count > 0 && (
              <Badge variant="secondary" className="ml-2 flex-shrink-0 text-[10px] px-1.5 py-0 h-5 bg-accent/50">
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
    <Sidebar className="border-r border-border/50 shadow-lg">
      <ScrollArea className="h-full">
        <SidebarContent className="py-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-widest font-bold px-3 mb-3 text-muted-foreground/70">
              Productos
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {categories.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground/70">
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
      </ScrollArea>
    </Sidebar>
  );
}
