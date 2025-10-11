import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ isOpen, onToggle }: SidebarToggleProps) {
  if (isOpen) return null;
  
  return (
    <Button
      onClick={onToggle}
      variant="outline"
      size="sm"
      className="fixed top-[72px] left-4 z-50 gap-2 bg-background/95 backdrop-blur-sm shadow-lg hover:bg-accent/50 transition-all"
    >
      <Menu className="h-4 w-4" />
      <span className="text-sm">Categorías</span>
    </Button>
  );
}
