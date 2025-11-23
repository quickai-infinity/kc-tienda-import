import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, Camera, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentCompany, setCurrentCompany] = useState<string>("");
  const [compareCompany, setCompareCompany] = useState<string>("");

  const companies = [
    "Endesa",
    "Repsol",
    "Iberdrola",
    "Naturgy",
    "TotalEnergies",
    "Lucera",
    "Holaluz",
  ];

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
      setLoading(false);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#003942] to-[#002F36]">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] px-4 py-6 relative">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-4 flex items-center gap-2 text-white hover:text-white/80 transition-colors"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

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
            onClick={() => navigate('/processing')}
            className="w-full h-16 text-xl rounded-2xl bg-[#0A8754] hover:bg-[#0A8754]/90 text-white shadow-lg"
          >
            <Upload className="mr-3 h-6 w-6" />
            Seleccionar PDF
          </Button>

          <Button
            size="lg"
            onClick={() => navigate('/processing')}
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
    </div>
  );
};

export default Index;
