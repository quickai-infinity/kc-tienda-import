import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";

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

const BrandManager = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const [companies, setCompanies] = useState<CompanyBranding[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      navigate("/");
      return;
    }

    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from("company_branding")
        .select("*")
        .order("company_name");

      if (error) {
        toast({
          title: "Error",
          description: "No se pudieron cargar las empresas",
          variant: "destructive",
        });
      } else {
        setCompanies(data || []);
      }
    };

    fetchCompanies();
  }, [isSuperAdmin, roleLoading, navigate, toast]);

  useEffect(() => {
    if (selectedCompany) {
      const company = companies.find((c) => c.company_name === selectedCompany);
      if (company) {
        setBranding(company);
      }
    }
  }, [selectedCompany, companies]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !branding) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe superar 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Delete old logo if exists
      if (branding.logo_url) {
        const oldFileName = branding.logo_url.split("/").pop();
        if (oldFileName) {
          await supabase.storage
            .from("company-logos")
            .remove([oldFileName]);
        }
      }

      // Upload new logo with unique timestamp
      const fileExt = file.name.split(".").pop();
      const fileName = `${branding.company_name.toLowerCase()}-${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL with cache buster
      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      const logoUrlWithCacheBuster = `${publicUrl}?v=${Date.now()}`;

      // Update database
      const { error: updateError } = await supabase
        .from("company_branding")
        .update({ logo_url: logoUrlWithCacheBuster })
        .eq("id", branding.id);

      if (updateError) throw updateError;

      // Wait a bit then refresh company list
      await new Promise(resolve => setTimeout(resolve, 300));

      const { data: refreshedCompanies } = await supabase
        .from("company_branding")
        .select("*")
        .order("company_name");

      if (refreshedCompanies) {
        setCompanies(refreshedCompanies);
        const updatedBranding = refreshedCompanies.find(c => c.id === branding.id);
        if (updatedBranding) {
          setBranding(updatedBranding);
        }
      }

      toast({
        title: "Logo actualizado",
        description: "El logo se ha subido correctamente",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo subir el logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async () => {
    if (!branding) return;

    setSaving(true);

    try {
      const updateData = {
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        text_color: branding.text_color,
        background_color: branding.background_color,
        website_url: branding.website_url,
        last_updated: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("company_branding")
        .update(updateData)
        .eq("id", branding.id);

      if (error) throw error;

      // Wait for DB to process
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh the company list to get fresh data
      const { data: refreshedCompanies, error: fetchError } = await supabase
        .from("company_branding")
        .select("*")
        .order("company_name");

      if (fetchError) throw fetchError;

      if (refreshedCompanies) {
        setCompanies(refreshedCompanies);
        // Update current branding with fresh data from DB
        const updatedBranding = refreshedCompanies.find(c => c.id === branding.id);
        if (updatedBranding) {
          setBranding(updatedBranding);
        }
      }

      toast({
        title: "Guardado",
        description: "Los cambios se guardaron correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al guardar",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#003942] to-[#002F36]">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] px-4">
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-4 text-white hover:text-white/80 transition-colors flex items-center gap-2 z-10"
      >
        <ArrowLeft className="h-5 w-5" />
        Atrás
      </button>

      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <div className="max-w-2xl w-full space-y-6">
          <h1 className="text-4xl font-bold text-white text-center mb-8">
            Brand Manager
          </h1>

          <div className="space-y-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <div className="space-y-2">
              <Label className="text-white">Seleccionar empresa</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="bg-[#00404A] text-white border-none">
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent className="bg-[#00404A] border-none">
                  {companies.map((company) => (
                    <SelectItem
                      key={company.id}
                      value={company.company_name}
                      className="text-white focus:bg-[#003942] focus:text-white"
                    >
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {branding && (
              <>
                 <div className="space-y-2">
                  <Label className="text-white">Logo actual</Label>
                  {branding.logo_url && (
                    <img
                      src={`${branding.logo_url}?t=${Date.now()}`}
                      alt="Logo"
                      className="w-32 h-32 object-contain bg-white/20 rounded-lg p-2"
                      key={branding.logo_url}
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white"
                  >
                    {uploading ? "Subiendo..." : "Subir logo"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white">Color primario</Label>
                    <Input
                      type="color"
                      value={branding.primary_color || "#0A8754"}
                      onChange={(e) =>
                        setBranding({ ...branding, primary_color: e.target.value })
                      }
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Color secundario</Label>
                    <Input
                      type="color"
                      value={branding.secondary_color || "#FFC300"}
                      onChange={(e) =>
                        setBranding({ ...branding, secondary_color: e.target.value })
                      }
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Color acento</Label>
                    <Input
                      type="color"
                      value={branding.accent_color || "#00404A"}
                      onChange={(e) =>
                        setBranding({ ...branding, accent_color: e.target.value })
                      }
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Color de texto</Label>
                    <Input
                      type="color"
                      value={branding.text_color || "#FFFFFF"}
                      onChange={(e) =>
                        setBranding({ ...branding, text_color: e.target.value })
                      }
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Color de fondo</Label>
                    <Input
                      type="color"
                      value={branding.background_color || "#003942"}
                      onChange={(e) =>
                        setBranding({
                          ...branding,
                          background_color: e.target.value,
                        })
                      }
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Sitio web</Label>
                    <Input
                      type="url"
                      value={branding.website_url || ""}
                      onChange={(e) =>
                        setBranding({ ...branding, website_url: e.target.value })
                      }
                      placeholder="https://example.com"
                      className="bg-[#00404A] text-white border-none"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-[#0A8754] hover:bg-[#0A8754]/90 text-white"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BrandManager;
