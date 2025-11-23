import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandingConfig {
  id: string;
  app_name: string;
  logo_url: string | null;
  primary_color: string;
  show_only_my_company: boolean;
}

interface BrandingContextType {
  branding: BrandingConfig | null;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  loading: true,
  refreshBranding: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const { data, error } = await supabase
        .from("branding")
        .select("*")
        .single();

      if (error) {
        console.error("Error fetching branding:", error);
        // Set defaults if no branding found
        setBranding({
          id: "",
          app_name: "Compare Energia",
          logo_url: null,
          primary_color: "#0A8754",
          show_only_my_company: false,
        });
      } else {
        setBranding(data);
        // Apply primary color to CSS variables
        if (data.primary_color) {
          document.documentElement.style.setProperty('--brand-primary', data.primary_color);
        }
      }
    } catch (error) {
      console.error("Error fetching branding:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();

    // Subscribe to branding changes
    const channel = supabase
      .channel("branding-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branding",
        },
        () => {
          fetchBranding();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <BrandingContext.Provider
      value={{ branding, loading, refreshBranding: fetchBranding }}
    >
      {children}
    </BrandingContext.Provider>
  );
};
