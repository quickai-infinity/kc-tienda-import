import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Shop = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
                Shop Our Collection
              </h1>
              <p className="text-lg text-muted-foreground mb-8 animate-slide-up">
                Discover our curated selection of premium products. From cutting-edge technology 
                to everyday essentials, we have everything you need.
              </p>
              <Link to="/">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Placeholder Content */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 border rounded-lg bg-card">
                  <h3 className="font-semibold text-lg mb-2">Electronics</h3>
                  <p className="text-sm text-muted-foreground">Latest tech and gadgets</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                  <h3 className="font-semibold text-lg mb-2">Accessories</h3>
                  <p className="text-sm text-muted-foreground">Premium add-ons</p>
                </div>
                <div className="p-6 border rounded-lg bg-card">
                  <h3 className="font-semibold text-lg mb-2">Gaming</h3>
                  <p className="text-sm text-muted-foreground">Gaming gear and peripherals</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Shop;
