import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Download, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";

interface CompanyOption {
  id: string;
  name: string;
  pricePerMonth: string;
  isBest?: boolean;
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  
  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate]);
  
  const extractedData = location.state?.extractedData || {};
  const savingsPerMonth = "32,47";
  const savingsPerYear = "389,64";

  const companies: CompanyOption[] = [
    { id: "endesa", name: "Endesa", pricePerMonth: "30" },
    { id: "repsol", name: "Repsol", pricePerMonth: "30", isBest: true },
    { id: "iberdrola", name: "Iberdrola", pricePerMonth: "35" },
    { id: "totalenergies", name: "TotalEnergies", pricePerMonth: "35" },
  ];

  const handleDownloadPDF = () => {
    toast({
      title: "Próximamente",
      description: "Descarga de informe en PDF disponible próximamente.",
    });
  };

  const handleSendEmail = () => {
    setIsEmailModalOpen(false);
    setEmail("");
    toast({
      title: "Demo",
      description: "Resultados enviados (modo demo).",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] px-4 py-8 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-4 flex items-center gap-2 text-white hover:text-white/80 transition-colors z-10"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

      <div className="flex-1">
      <div className="max-w-md mx-auto space-y-8">
        {/* Extracted Data Summary */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Datos de tu factura
          </h1>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-3 shadow-lg">
          <div className="space-y-2 text-white">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Empresa actual:</span>
              <span className="font-semibold">{extractedData.empresa || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Tarifa actual:</span>
              <span className="font-semibold">{extractedData.tarifa || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Consumo mensual:</span>
              <span className="font-semibold">{extractedData.consumo_kwh || 'N/A'} kWh</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Precio mensual estimado:</span>
              <span className="font-semibold">{extractedData.precio_mensual || 'N/A'} €</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">CUPS:</span>
              <span className="font-semibold text-sm">{extractedData.cups || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Savings Header */}
        <div className="text-center space-y-4 pt-4">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Podrías ahorrar:
          </h2>
          
          <div className="space-y-2">
            <div className="text-5xl md:text-6xl font-bold text-[#0A8754]">
              {savingsPerMonth} €/mes
            </div>
            <div className="text-xl md:text-2xl text-white/80 font-medium">
              {savingsPerYear} €/año
            </div>
          </div>
        </div>

        {/* Company Comparison Cards */}
        <div className="space-y-3 mt-12">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:bg-white/15 shadow-lg"
              style={{
                borderLeft: company.isBest ? "4px solid #FFC300" : "4px solid transparent",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-white">
                  {company.name}
                </span>
                {company.isBest && (
                  <Badge className="bg-[#FFC300] text-gray-900 hover:bg-[#FFC300]/90 font-medium">
                    Mejor
                  </Badge>
                )}
              </div>
              
              <div className="text-xl font-bold text-white">
                {company.pricePerMonth} €/mes
              </div>
            </div>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center text-white/60 text-sm mt-8">
          Comparación basada en tu consumo actual
        </div>

        {/* Export Actions */}
        <div className="flex flex-col gap-3 mt-8">
          <Button
            onClick={handleDownloadPDF}
            className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white rounded-xl h-14 text-lg font-semibold shadow-lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Descargar informe en PDF
          </Button>
          
          <Button
            onClick={() => setIsEmailModalOpen(true)}
            className="bg-[#FFC300] hover:bg-[#FFC300]/90 text-gray-900 rounded-xl h-12 text-base font-semibold shadow-lg"
          >
            <Mail className="mr-2 h-5 w-5" />
            Enviar por email
          </Button>
        </div>

        {/* Ver Historial Button */}
        <div className="text-center mt-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Ver historial
          </Button>
        </div>
      </div>
      </div>

      {/* Email Modal */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Enviar resultados por email
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Correo electrónico del cliente
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg"
              />
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEmailModalOpen(false)}
              className="rounded-lg"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendEmail}
              className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white rounded-lg"
            >
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Results;
