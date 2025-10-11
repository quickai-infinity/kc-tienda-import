import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SidebarToggle } from "@/components/SidebarToggle";

const Shop = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex">
        <CategorySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <SidebarToggle isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className={`flex-1 overflow-auto transition-all duration-300 ${
          sidebarOpen ? "ml-64 sm:ml-0" : "ml-0"
        }`}>
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
      
      <Footer />
    </div>
  );
};

export default Shop;
