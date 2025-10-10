import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in">
                About KCTienda
              </h1>
              <p className="text-lg text-muted-foreground mb-8 animate-slide-up">
                Your trusted partner for quality products and exceptional service. 
                We're passionate about bringing you the best selection at competitive prices.
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
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="prose prose-lg max-w-none">
                <h2 className="text-2xl font-bold mb-4">Our Story</h2>
                <p className="text-muted-foreground mb-6">
                  Founded with a vision to make quality products accessible to everyone, 
                  KCTienda has grown into a trusted destination for tech enthusiasts and everyday shoppers alike.
                </p>
                
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground mb-6">
                  We believe in delivering excellence through carefully curated products, 
                  competitive pricing, and customer service that goes above and beyond.
                </p>

                <h2 className="text-2xl font-bold mb-4">Why Choose Us</h2>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Premium quality products from trusted brands</li>
                  <li>Competitive prices and regular promotions</li>
                  <li>Fast and reliable shipping</li>
                  <li>Exceptional customer support</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
