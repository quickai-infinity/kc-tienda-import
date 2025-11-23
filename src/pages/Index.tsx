import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Settings } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
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
  const { isAdmin, loading: roleLoading } = useUserRole();
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
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      if (!session) {
        navigate('/login');
      }
      setLoading(false);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] px-4 relative">
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

      {/* Top-right action: Login button OR Settings icon */}
      {!isAuthenticated ? (
        <button
          onClick={() => navigate('/login')}
          className="absolute top-6 right-4 px-4 py-2 text-white text-sm font-medium hover:text-white/80 transition-colors z-10"
        >
          Log in
        </button>
      ) : isAdmin && (
        <button
          onClick={() => navigate('/settings')}
          className="absolute top-6 right-4 text-white hover:text-white/80 transition-colors z-10"
        >
          <Settings className="h-6 w-6" />
        </button>
      )}

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-12">
            Subir factura para comparar
          </h1>

          {/* Dropdown Selectors */}
          <div className="space-y-4 mb-8">
            <div className="space-y-2">
              <label className="text-white text-sm font-medium block text-left">
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
              <label className="text-white text-sm font-medium block text-left">
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
              className="w-full h-16 text-xl rounded-2xl bg-[#0A8754] hover:bg-[#0A8754]/90 text-white shadow-lg"
            >
              <Upload className="mr-3 h-6 w-6" />
              Seleccionar PDF
            </Button>

            <Button
              size="lg"
              onClick={handleCameraClick}
              className="w-full h-16 text-xl rounded-2xl bg-[#FFC300] hover:bg-[#FFC300]/90 text-gray-900 shadow-lg"
            >
              <Camera className="mr-3 h-6 w-6" />
              Tomar foto
            </Button>
          </div>

          <p className="text-white/80 text-lg mt-8">
            Comparación rápida entre empresas de España
          </p>

          <div className="mt-12 pt-8">
            <div className="flex flex-wrap justify-center items-center gap-6 opacity-70">
              <div className="text-white text-sm font-semibold">Endesa</div>
              <div className="text-white text-sm font-semibold">Iberdrola</div>
              <div className="text-white text-sm font-semibold">Repsol</div>
              <div className="text-white text-sm font-semibold">Naturgy</div>
              <div className="text-white text-sm font-semibold">TotalEnergies</div>
              <div className="text-white text-sm font-semibold">Lucera</div>
              <div className="text-white text-sm font-semibold">Holaluz</div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
