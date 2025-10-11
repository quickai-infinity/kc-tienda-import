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
      
      <SidebarProvider>
        <div className="flex-1 flex w-full">
          <CategorySidebar />
          
          <main className="flex-1 overflow-auto">
            {/* Header with Sidebar Trigger */}
            <div className="sticky top-0 z-10 bg-background border-b">
              <div className="container mx-auto px-4 py-3 flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">Productos</h1>
              </div>
            </div>

            {/* Hero Section */}
            <section className="bg-background py-12 md:py-16">
              <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h2 className="text-2xl md:text-3xl font-bold mb-3">
                    Explora Nuestro Catálogo
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Selecciona una categoría del menú lateral para ver los productos disponibles.
                  </p>
                  <Link to="/">
                    <Button variant="outline" className="gap-2">
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
