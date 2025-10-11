import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  product_count?: number;
}

interface CategoryGroup {
  id: string;
  name: string;
  categories: Category[];
  keywords: string[];
}

// Predefined category groups matching ELSI structure
const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: "tpv", name: "Punto De Venta", categories: [], keywords: ["tpv", "punto de venta", "pos"] },
  { id: "impresoras", name: "Impresoras", categories: [], keywords: ["impresora", "ticket", "etiqueta"] },
  { id: "movilidad", name: "Movilidad", categories: [], keywords: ["movilidad", "pda", "móvil", "movil", "tablet"] },
  { id: "scanners", name: "Scanners", categories: [], keywords: ["scanner", "escáner", "escanear"] },
  { id: "panel-pcs", name: "Panel PCs", categories: [], keywords: ["panel pc"] },
  { id: "box-pc", name: "Box PC", categories: [], keywords: ["box pc", "mini pc"] },
  { id: "monitores", name: "Monitores", categories: [], keywords: ["monitor", "pantalla", "display"] },
  { id: "software", name: "Software", categories: [], keywords: ["software", "programa", "aplicación"] },
  { id: "identificacion", name: "Identificación / Biometría", categories: [], keywords: ["identificación", "identificacion", "biometría", "biometria", "huella"] },
  { id: "otros", name: "Más Productos", categories: [], keywords: [] }, // Catch-all
];

export function CategorySidebar() {
  const [groupedCategories, setGroupedCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const location = useLocation();

  // Group categories by predefined groups
  const groupCategories = (categories: Category[]): CategoryGroup[] => {
    const groups = CATEGORY_GROUPS.map(g => ({ ...g, categories: [] as Category[] }));
    
    categories.forEach(category => {
      const categoryName = category.name.toLowerCase();
      let matched = false;
      
      // Try to match with each group's keywords
      for (const group of groups) {
        if (group.id === "otros") continue; // Skip catch-all for now
        
        if (group.keywords.some(keyword => categoryName.includes(keyword))) {
          group.categories.push(category);
          matched = true;
          break;
        }
      }
      
      // If no match, add to "Más Productos"
      if (!matched) {
        const otrosGroup = groups.find(g => g.id === "otros");
        if (otrosGroup) {
          otrosGroup.categories.push(category);
        }
      }
    });
    
    // Filter out empty groups
    return groups.filter(g => g.categories.length > 0);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (categoriesError) throw categoriesError;

        if (!categoriesData || categoriesData.length === 0) {
          setGroupedCategories([]);
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

        // Filter categories with products
        const categoriesWithProducts = categoriesWithCounts.filter(cat => (cat.product_count || 0) > 0);
        
        // Group categories
        const grouped = groupCategories(categoriesWithProducts);
        setGroupedCategories(grouped);
        
        // Auto-open group with active category
        const activeGroup = grouped.find(group => 
          group.categories.some(cat => location.pathname === `/categoria/${cat.slug}`)
        );
        if (activeGroup) {
          setOpenGroupId(activeGroup.id);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error("Error al cargar las categorías");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [location.pathname]);

  const isActive = (slug: string) => location.pathname === `/categoria/${slug}`;
  
  const toggleGroup = (groupId: string) => {
    setOpenGroupId(openGroupId === groupId ? null : groupId);
  };

  if (loading) {
    return (
      <aside className="fixed left-0 top-[64px] bottom-0 w-64 lg:w-64 md:w-64 sm:w-full bg-background border-r border-border/50 shadow-xl overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-[64px] bottom-0 w-64 lg:w-64 md:w-64 sm:w-full bg-background border-r border-border/50 shadow-xl z-40 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="py-4">
          {/* Fixed Header */}
          <div className="px-4 mb-4 border-b border-border/30 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              Productos
            </h2>
          </div>
          
          {/* Category Groups */}
          <div className="space-y-0">
            {groupedCategories.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className="text-xs text-muted-foreground">
                  No hay categorías disponibles
                </p>
              </div>
            ) : (
              groupedCategories.map((group) => {
                const isOpen = openGroupId === group.id;
                const hasActiveCategory = group.categories.some(cat => isActive(cat.slug));
                
                return (
                  <div key={group.id} className="border-b border-border/20 last:border-0">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all ${
                        hasActiveCategory 
                          ? "text-primary font-medium bg-primary/5" 
                          : "text-foreground/80 hover:text-foreground hover:bg-accent/30"
                      }`}
                    >
                      <span className="text-left">{group.name}</span>
                      <span className="ml-auto flex-shrink-0">
                        {isOpen ? (
                          <Minus className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </button>
                    
                    {/* Subcategories */}
                    {isOpen && (
                      <div className="bg-background/30 py-1">
                        {group.categories.map((category) => {
                          const active = isActive(category.slug);
                          return (
                            <Link
                              key={category.id}
                              to={`/categoria/${category.slug}`}
                              className={`block px-8 py-2.5 text-[13px] transition-all ${
                                active
                                  ? "text-primary font-medium bg-primary/10 border-l-3 border-primary"
                                  : "text-foreground/70 hover:text-foreground hover:bg-accent/20"
                              }`}
                            >
                              <span className="line-clamp-1">{category.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
