import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ProductSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const ProductSearch = ({ 
  onSearch, 
  placeholder = "Buscar productos, marcas...",
  className = ""
}: ProductSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const handleClear = () => {
    setSearchQuery("");
    onSearch("");
  };

  const handleToggle = () => {
    if (isExpanded && searchQuery) {
      handleClear();
    }
    setIsExpanded(!isExpanded);
  };

  if (isMobile) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isExpanded ? (
          <div className="flex-1 flex items-center gap-2 animate-in slide-in-from-right duration-300">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 bg-background/50 border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-full"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="shrink-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="hover:bg-accent"
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 pr-10 bg-background/50 border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-full shadow-sm"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
