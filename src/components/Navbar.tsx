import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Search, User, Menu, X, Moon, Sun, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import logo from "@/assets/logo.png";

export const Navbar = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme } = useTheme();
  const { totalItems } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (currentUser) {
        const { data: hasAdminRole } = await supabase.rpc("has_role", {
          _user_id: currentUser.id,
          _role: "admin",
        });
        setIsAdmin(hasAdminRole || false);
      } else {
        setIsAdmin(false);
      }
    };
    
    checkAuthStatus();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const { data: hasAdminRole } = await supabase.rpc("has_role", {
            _user_id: session.user.id,
            _role: "admin",
          });
          setIsAdmin(hasAdminRole || false);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed Out",
        description: "You've been successfully signed out.",
      });
      
      setUser(null);
      setIsAdmin(false);
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm">
        <p className="animate-fade-in">Free shipping on orders over $99 • New arrivals weekly</p>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 transition-transform hover:scale-105">
            <img src={logo} alt="KCTienda" className="h-10 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/shop" className="text-sm font-medium hover:text-accent transition-colors">
              Shop
            </Link>
            <Link to="/products" className="text-sm font-medium hover:text-accent transition-colors">
              Products
            </Link>
            <Link to="/about" className="text-sm font-medium hover:text-accent transition-colors">
              About
            </Link>
            <Link to="/blog" className="text-sm font-medium hover:text-accent transition-colors">
              Blog
            </Link>
            <Link to="/contact" className="text-sm font-medium hover:text-accent transition-colors">
              Contact
            </Link>
            {isAdmin && (
              <Link to="/admin" className="text-sm font-medium hover:text-accent transition-colors">
                Admin
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:flex">
              <Search className="h-5 w-5" />
            </Button>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden md:flex">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">My Account</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent text-accent-foreground text-xs flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t animate-slide-up">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link
                to="/shop"
                className="block py-2 text-sm font-medium hover:text-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Shop
              </Link>
              <Link
                to="/products"
                className="block py-2 text-sm font-medium hover:text-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Products
              </Link>
              <Link
                to="/about"
                className="block py-2 text-sm font-medium hover:text-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                to="/blog"
                className="block py-2 text-sm font-medium hover:text-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Blog
              </Link>
              <Link
                to="/contact"
                className="block py-2 text-sm font-medium hover:text-accent transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="block py-2 text-sm font-medium hover:text-accent transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  >
                    {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Search className="h-5 w-5" />
                  </Button>
                  {user ? (
                    <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
                      <User className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" onClick={() => navigate("/auth")}>
                      <User className="h-5 w-5" />
                    </Button>
                  )}
                </div>
                {user && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground px-4 truncate">
                      {user.email}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
