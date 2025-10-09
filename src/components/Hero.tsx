import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-tech.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden hero-gradient">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Premium Technology"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/60" />
      </div>

      {/* Content */}
      <div className="container relative z-10 mx-auto px-4 py-20">
        <div className="max-w-3xl animate-slide-up">
          <p className="text-primary-foreground/90 text-sm md:text-base font-medium mb-4 tracking-wide uppercase">
            Introducing the Future
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
            High-Performance &{" "}
            <span className="block">Elegant Design</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl">
            Discover cutting-edge technology and premium electronics that combine power with sophistication. Experience innovation at its finest.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground group">
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-primary-foreground/10 backdrop-blur-sm border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20"
            >
              Explore Products
            </Button>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute bottom-10 right-10 hidden lg:block">
        <div className="animate-float">
          <div className="w-20 h-20 rounded-full bg-accent/20 backdrop-blur-sm border border-accent/40" />
        </div>
      </div>
    </section>
  );
};
