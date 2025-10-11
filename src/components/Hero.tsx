import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import logo from "@/assets/logo.png";
import heroImage from "@/assets/hero-tech.jpg";

export const Hero = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { origin: window.location.origin }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "No se pudo iniciar el proceso de pago. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background/95" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          {/* Translucent Logo */}
          <div className="mb-8 flex justify-center">
            <img 
              src={logo} 
              alt="KC Tienda Logo" 
              className="h-32 w-auto opacity-60 animate-scale-in"
            />
          </div>

          {/* Main Title */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-10 max-w-3xl mx-auto leading-relaxed bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-slide-up">
            {t("hero.title")}
          </h1>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Button 
              size="lg" 
              className="group bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? "Procesando..." : t("hero.shopNow")}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Link to="/products">
              <Button size="lg" variant="outline" className="group">
                {t("hero.exploreProducts")}
                <Sparkles className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
    </section>
  );
};
