import { Navbar } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductGrid";
import { Footer } from "@/components/Footer";

const Products = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Our Products</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Browse our complete collection of premium electronic components and industrial equipment
            </p>
          </div>
          <ProductGrid />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Products;
