import { Link } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { CategorySidebar } from "@/components/CategorySidebar";

const Shop = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <SidebarProvider defaultOpen={true}>
        <div className="flex-1 flex w-full">
          <CategorySidebar />
          
          <main className="flex-1 overflow-auto">
            {/* Header with Sidebar Trigger */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
              <div className="container mx-auto px-6 py-3 flex items-center gap-4">
                <SidebarTrigger className="lg:hidden" />
                <h1 className="text-base font-semibold text-foreground/90">Catálogo de Productos</h1>
              </div>
            </div>

            {/* Hero Section */}
            <section className="py-16 md:py-24">
              <div className="container mx-auto px-6">
                <div className="max-w-2xl mx-auto text-center">
                  <Package className="h-14 w-14 mx-auto mb-5 text-primary/80" />
                  <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Explora Nuestro Catálogo
                  </h2>
                  <p className="text-muted-foreground text-base mb-8">
                    Selecciona una categoría del menú lateral para ver los productos disponibles.
                  </p>
                  <Link to="/">
                    <Button variant="outline" className="gap-2 h-10">
                      <ArrowLeft className="h-4 w-4" />
                      Volver al Inicio
                    </Button>
                  </Link>
                </div>
              </div>
            </section>
          </main>
        </div>
      </SidebarProvider>
      
      <Footer />
    </div>
  );
};

export default Shop;
