import { Navbar } from "@/components/Navbar";
import { ProductGrid } from "@/components/ProductGrid";
import { Footer } from "@/components/Footer";
import { Helmet } from "react-helmet";

const Products = () => {
  return (
    <>
      <Helmet>
        <title>Productos - KCtienda</title>
        <meta name="description" content="Explora nuestra completa colección de componentes electrónicos y equipamiento industrial premium" />
      </Helmet>
      <div className="min-h-screen">
        <Navbar />
        <main>
          <div className="container mx-auto px-4 py-12">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Nuestros Productos</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Explora nuestra completa colección de componentes electrónicos y equipamiento industrial premium
              </p>
            </div>
            <ProductGrid />
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Products;
