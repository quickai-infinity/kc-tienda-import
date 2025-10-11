import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CategoryGrid } from "@/components/CategoryGrid";

const Shop = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl md:text-5xl font-bold mb-4 animate-fade-in">
                Categorías de Productos
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-6 animate-slide-up">
                Explora nuestra selección de productos organizados por categorías. 
                Encuentra exactamente lo que necesitas.
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

        {/* Categories Grid */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <CategoryGrid />
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Shop;
