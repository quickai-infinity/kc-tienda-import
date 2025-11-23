import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Camera, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranding } from "@/contexts/BrandingContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, isCompanyAdmin } = useUserRole();
  const { branding, companyBranding } = useBranding();
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentCompany, setCurrentCompany] = useState<string>("");
  const [compareCompany, setCompareCompany] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const companies = [
    "Endesa",
    "Repsol",
    "Iberdrola",
    "Naturgy",
    "TotalEnergies",
    "Lucera",
    "Holaluz",
    "Orange",
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setLoading(false);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Check if user is authenticated before processing
    if (!isAuthenticated) {
      toast({
        title: "Autenticación requerida",
        description: "Debes iniciar sesión para subir facturas",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|heic)$/i)) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos PDF o imágenes (JPG, PNG)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "El archivo no debe superar los 20MB",
        variant: "destructive",
      });
      return;
    }

    // Navigate to processing with the file
    navigate('/processing', { state: { file, currentCompany, compareCompany } });
  };

  const handlePdfClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#003942] to-[#002F36]">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 relative" style={{ 
      background: companyBranding?.background_color 
        ? `linear-gradient(to bottom, ${companyBranding.background_color}, ${companyBranding.background_color})`
        : 'linear-gradient(to bottom, #003942, #002F36)'
    }}>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      {/* Top navigation */}
      <div className="absolute top-6 right-4 flex items-center gap-4 z-10">
        {!isAuthenticated ? (
          <>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}
            >
              Register
            </button>
          </>
        ) : (
          <>
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => navigate('/settings')}
                  className="transition-colors"
                  style={{
                    color: companyBranding?.text_color || '#FFFFFF'
                  }}
                >
                  <Settings className="h-6 w-6" />
                </button>
                <button
                  onClick={() => navigate('/admin/tariffs')}
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    color: companyBranding?.text_color || '#FFFFFF'
                  }}
                >
                  Tariffs
                </button>
              </>
            )}
            {isCompanyAdmin && (
              <button
                onClick={() => navigate('/admin/tariffs')}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  color: companyBranding?.text_color || '#FFFFFF'
                }}
              >
                My Tariffs
              </button>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/');
              }}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Logo centrado arriba del título */}
          {(companyBranding?.logo_url || branding?.logo_url) && (
            <div className="flex justify-center mb-8">
              <img 
                src={companyBranding?.logo_url || branding?.logo_url || ""} 
                alt={companyBranding?.company_name || branding?.app_name || "Logo"} 
                className="w-32 h-auto object-contain"
              />
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold mb-12" style={{
            color: companyBranding?.text_color || '#FFFFFF'
          }}>
            Subir factura para comparar
          </h1>

          {/* Dropdown Selectors */}
          <div className="space-y-4 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-medium block text-left" style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}>
                Empresa actual
              </label>
              <Select value={currentCompany} onValueChange={setCurrentCompany}>
                <SelectTrigger className="w-full h-14 bg-[#00404A] text-white border-none rounded-2xl shadow-lg text-lg">
                  <SelectValue placeholder="Selecciona tu empresa" />
                </SelectTrigger>
                <SelectContent className="bg-[#00404A] border-none rounded-2xl">
                  {companies.map((company) => (
                    <SelectItem
                      key={company}
                      value={company}
                      className="text-white text-lg focus:bg-[#003942] focus:text-white"
                    >
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium block text-left" style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}>
                Comparar con
              </label>
              <Select value={compareCompany} onValueChange={setCompareCompany}>
                <SelectTrigger className="w-full h-14 bg-[#00404A] text-white border-none rounded-2xl shadow-lg text-lg">
                  <SelectValue placeholder="Selecciona empresa a comparar" />
                </SelectTrigger>
                <SelectContent className="bg-[#00404A] border-none rounded-2xl">
                  {companies.map((company) => (
                    <SelectItem
                      key={company}
                      value={company}
                      className="text-white text-lg focus:bg-[#003942] focus:text-white"
                    >
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              size="lg"
              onClick={handlePdfClick}
              style={{ backgroundColor: 'var(--brand-primary)' }}
              className="w-full h-16 text-xl rounded-2xl text-white shadow-lg hover:opacity-90"
            >
              <Upload className="mr-3 h-6 w-6" />
              Seleccionar PDF
            </Button>

            <Button
              size="lg"
              onClick={handleCameraClick}
              style={{ backgroundColor: 'var(--brand-secondary)' }}
              className="w-full h-16 text-xl rounded-2xl text-gray-900 shadow-lg hover:opacity-90"
            >
              <Camera className="mr-3 h-6 w-6" />
              Tomar foto
            </Button>
          </div>

          <p className="text-lg mt-8" style={{
            color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
          }}>
            Comparación rápida entre empresas de España
          </p>

          <div className="mt-12 pt-8">
            <div className="flex flex-wrap justify-center items-center gap-6 opacity-70">
              {companies.map((company) => (
                <div key={company} className="text-sm font-semibold" style={{
                  color: companyBranding?.text_color || '#FFFFFF'
                }}>
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
