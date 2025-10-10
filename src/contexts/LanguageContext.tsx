import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "es" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  es: {
    // Navbar
    "nav.shop": "Tienda",
    "nav.products": "Productos",
    "nav.about": "Acerca de",
    "nav.blog": "Blog",
    "nav.contact": "Contacto",
    "nav.faq": "FAQ",
    "nav.admin": "Admin",
    "nav.signOut": "Cerrar sesión",
    "nav.myAccount": "Mi cuenta",
    
    // Hero
    "hero.title": "Encuentra desde equipos de oficina hasta electrónica avanzada, accesorios y software profesional.",
    "hero.subtitle": "",
    "hero.shopNow": "Comprar ahora",
    "hero.exploreProducts": "Explorar productos",
    "hero.announcement": "Envíos gratis en pedidos superiores a 50 €. Nuevos productos cada semana.",
    
    // Footer
    "footer.quickLinks": "Enlaces rápidos",
    "footer.customerService": "Atención al cliente",
    "footer.contact": "Contacto",
    "footer.shippingInfo": "Información de envío",
    "footer.privacyPolicy": "Política de privacidad",
    "footer.termsOfService": "Términos de servicio",
    "footer.allRightsReserved": "Todos los derechos reservados",
    "footer.description": "Tu destino para tecnología y electrónica premium. Productos de calidad, servicio excepcional.",
    
    // Auth
    "auth.welcome": "Bienvenido a KCTienda",
    "auth.signInMessage": "Inicia sesión en tu cuenta o crea una nueva",
    "auth.login": "Iniciar sesión",
    "auth.register": "Registrarse",
    "auth.email": "Correo electrónico",
    "auth.password": "Contraseña",
    "auth.confirmPassword": "Confirmar contraseña",
    "auth.signIn": "Iniciar sesión",
    "auth.createAccount": "Crear cuenta",
    "auth.signingIn": "Iniciando sesión...",
    "auth.creatingAccount": "Creando cuenta...",
    "auth.loginDescription": "Ingresa tus credenciales para acceder a tu cuenta",
    "auth.registerDescription": "Regístrate para crear una cuenta nueva",
    "auth.passwordRequirements": "La contraseña debe tener al menos 6 caracteres",
    
    // Products
    "products.featuredProducts": "Productos destacados",
    "products.explore": "Explora nuestra selección curada de tecnología y accesorios premium",
    "products.inStock": "En stock",
    "products.outOfStock": "Agotado",
    "products.addToCart": "Añadir al carrito",
    "products.viewAll": "Ver todos los productos",
    "products.onlyLeft": "Solo",
    "products.left": "disponibles!",
    
    // Common
    "common.loading": "Cargando...",
    "common.backToHome": "Volver al inicio",
  },
  en: {
    // Navbar
    "nav.shop": "Shop",
    "nav.products": "Products",
    "nav.about": "About",
    "nav.blog": "Blog",
    "nav.contact": "Contact",
    "nav.faq": "FAQ",
    "nav.admin": "Admin",
    "nav.signOut": "Sign Out",
    "nav.myAccount": "My Account",
    
    // Hero
    "hero.title": "Find everything from office equipment to advanced electronics, accessories and professional software.",
    "hero.subtitle": "",
    "hero.shopNow": "Shop Now",
    "hero.exploreProducts": "Explore Products",
    "hero.announcement": "Free shipping on orders over €50. New arrivals weekly.",
    
    // Footer
    "footer.quickLinks": "Quick Links",
    "footer.customerService": "Customer Service",
    "footer.contact": "Contact",
    "footer.shippingInfo": "Shipping Info",
    "footer.privacyPolicy": "Privacy Policy",
    "footer.termsOfService": "Terms of Service",
    "footer.allRightsReserved": "All rights reserved",
    "footer.description": "Your destination for premium technology and electronics. Quality products, exceptional service.",
    
    // Auth
    "auth.welcome": "Welcome to KCTienda",
    "auth.signInMessage": "Sign in to your account or create a new one",
    "auth.login": "Login",
    "auth.register": "Register",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.confirmPassword": "Confirm Password",
    "auth.signIn": "Sign In",
    "auth.createAccount": "Create Account",
    "auth.signingIn": "Signing in...",
    "auth.creatingAccount": "Creating account...",
    "auth.loginDescription": "Enter your credentials to access your account",
    "auth.registerDescription": "Sign up for a new account to get started",
    "auth.passwordRequirements": "Password must be at least 6 characters",
    
    // Products
    "products.featuredProducts": "Featured Products",
    "products.explore": "Explore our curated selection of premium technology and accessories",
    "products.inStock": "In Stock",
    "products.outOfStock": "Out of Stock",
    "products.addToCart": "Add to Cart",
    "products.viewAll": "View All Products",
    "products.onlyLeft": "Only",
    "products.left": "left!",
    
    // Common
    "common.loading": "Loading...",
    "common.backToHome": "Back to Home",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang && (savedLang === "es" || savedLang === "en")) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.es] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
