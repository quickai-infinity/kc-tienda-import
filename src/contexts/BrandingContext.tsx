import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandingConfig {
  id: string;
  app_name: string;
  logo_url: string | null;
  primary_color: string;
  show_only_my_company: boolean;
  active_company: string | null;
}

interface CompanyBranding {
  id: string;
  company_name: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  text_color: string | null;
  background_color: string | null;
  logo_url: string | null;
  website_url: string | null;
}

interface BrandingContextType {
  branding: BrandingConfig | null;
  companyBranding: CompanyBranding | null;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  companyBranding: null,
  loading: true,
  refreshBranding: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const BrandingProvider = ({ children }: { children: ReactNode }) => {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [companyBranding, setCompanyBranding] = useState<CompanyBranding | null>(null);
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
          active_company: null,
        });
      } else {
        setBranding(data);
        
        // Load company branding if active_company is set
        if (data.active_company) {
          const { data: companyData, error: companyError } = await supabase
            .from("company_branding")
            .select("*")
            .eq("company_name", data.active_company)
            .single();

          if (!companyError && companyData) {
            setCompanyBranding(companyData);
            applyCompanyBranding(companyData);
          }
        } else {
          // Apply primary color from branding table if no company selected
          if (data.primary_color) {
            document.documentElement.style.setProperty('--brand-primary', data.primary_color);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching branding:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyCompanyBranding = (company: CompanyBranding) => {
    const root = document.documentElement;
    
    if (company.primary_color) {
      root.style.setProperty('--brand-primary', company.primary_color);
    }
    if (company.secondary_color) {
      root.style.setProperty('--brand-secondary', company.secondary_color);
    }
    if (company.accent_color) {
      root.style.setProperty('--brand-accent', company.accent_color);
    }
    if (company.text_color) {
      root.style.setProperty('--brand-text', company.text_color);
    }
    if (company.background_color) {
      root.style.setProperty('--brand-background', company.background_color);
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
      value={{ branding, companyBranding, loading, refreshBranding: fetchBranding }}
    >
      {children}
    </BrandingContext.Provider>
  );
};
