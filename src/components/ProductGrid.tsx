import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ShoppingCart, Star } from "lucide-react";

const products = [
  {
    id: 1,
    name: "Wireless Earbuds Pro",
    price: 199.99,
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80",
    rating: 4.8,
    category: "Audio",
  },
  {
    id: 2,
    name: "Smart Watch Elite",
    price: 349.99,
    image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&q=80",
    rating: 4.9,
    category: "Wearables",
  },
  {
    id: 3,
    name: "Mechanical Keyboard",
    price: 149.99,
    image: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=500&q=80",
    rating: 4.7,
    category: "Accessories",
  },
  {
    id: 4,
    name: "Wireless Charger",
    price: 49.99,
    image: "https://images.unsplash.com/photo-1591290619762-5d6d4c9c8cbe?w=500&q=80",
    rating: 4.6,
    category: "Accessories",
  },
  {
    id: 5,
    name: "Gaming Mouse Pro",
    price: 89.99,
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80",
    rating: 4.8,
    category: "Gaming",
  },
  {
    id: 6,
    name: "USB-C Hub Station",
    price: 79.99,
    image: "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&q=80",
    rating: 4.5,
    category: "Accessories",
  },
];

export const ProductGrid = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12 animate-slide-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our curated selection of premium technology and accessories
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.map((product, index) => (
            <Card
              key={product.id}
              className="group overflow-hidden border-border hover:shadow-lg transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-0">
                {/* Product Image */}
                <div className="relative overflow-hidden aspect-square bg-muted">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4">
                    <span className="bg-accent text-accent-foreground text-xs px-3 py-1 rounded-full">
                      New
                    </span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
                  <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-accent text-accent" />
                      <span className="text-sm ml-1">{product.rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">(128 reviews)</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">${product.price}</p>
                </div>
              </CardContent>

              <CardFooter className="p-4 pt-0">
                <Button className="w-full bg-accent hover:bg-accent/90 group">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center">
          <Button size="lg" variant="outline">
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
};
