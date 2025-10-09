import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ProductGrid } from "@/components/ProductGrid";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <ProductGrid />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
