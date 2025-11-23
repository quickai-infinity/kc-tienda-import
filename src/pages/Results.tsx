import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Download, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/contexts/BrandingContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { calculateMonthlyElectricityPrice, calculateMonthlyGasPrice, formatCurrency } from "@/utils/tariffCalculations";

interface CompanyOption {
  id: string;
  name: string;
  pricePerMonth: number | null;
  hasTariff: boolean;
}

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { companyBranding } = useBranding();
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
  const currentCompany = location.state?.currentCompany;
  const compareCompany = location.state?.compareCompany;
  const tariffType = location.state?.tariffType || "electricity";
  
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [savingsPerMonth, setSavingsPerMonth] = useState<string>("0,00");
  const [savingsPerYear, setSavingsPerYear] = useState<string>("0,00");
  const [loading, setLoading] = useState(true);

  // Load tariffs and calculate prices
  useEffect(() => {
    const loadTariffsAndCalculate = async () => {
      const consumoKwh = parseFloat(extractedData.consumo_kwh) || 0;
      const precioActual = parseFloat(extractedData.precio_mensual) || null;

      if (!consumoKwh) {
        setLoading(false);
        return;
      }

      const companiesToLoad = [currentCompany, compareCompany].filter(Boolean);
      const calculatedCompanies: CompanyOption[] = [];

      for (const companyName of companiesToLoad) {
        // Get empresa
        const { data: empresa } = await supabase
          .from("empresas")
          .select("id")
          .eq("nombre", companyName)
          .single();

        if (!empresa) {
          calculatedCompanies.push({
            id: companyName || "",
            name: companyName || "",
            pricePerMonth: null,
            hasTariff: false,
          });
          continue;
        }

        // Get tariff based on tariff type
        let calculatedPrice: number | null = null;

        if (tariffType === "electricity") {
          const { data: tarifaElec } = await supabase
            .from("tarifas_electricidad")
            .select("*")
            .eq("empresa_id", empresa.id)
            .single();

          if (!tarifaElec) {
            calculatedCompanies.push({
              id: empresa.id,
              name: companyName || "",
              pricePerMonth: null,
              hasTariff: false,
            });
            continue;
          }

          calculatedPrice = calculateMonthlyElectricityPrice(consumoKwh, tarifaElec);
        } else {
          const { data: tarifaGas } = await supabase
            .from("tarifas_gas")
            .select("*")
            .eq("empresa_id", empresa.id)
            .single();

          if (!tarifaGas) {
            calculatedCompanies.push({
              id: empresa.id,
              name: companyName || "",
              pricePerMonth: null,
              hasTariff: false,
            });
            continue;
          }

          calculatedPrice = calculateMonthlyGasPrice(consumoKwh, tarifaGas);
        }

        calculatedCompanies.push({
          id: empresa.id,
          name: companyName || "",
          pricePerMonth: calculatedPrice,
          hasTariff: true,
        });
      }

      setCompanies(calculatedCompanies);

      // Calculate savings
      const currentPrice = calculatedCompanies[0]?.pricePerMonth || precioActual;
      const comparePrice = calculatedCompanies[1]?.pricePerMonth;

      if (currentPrice && comparePrice) {
        const monthlyDiff = currentPrice - comparePrice;
        setSavingsPerMonth(formatCurrency(Math.abs(monthlyDiff)));
        setSavingsPerYear(formatCurrency(Math.abs(monthlyDiff * 12)));
      }

      setLoading(false);
    };

    loadTariffsAndCalculate();
  }, [extractedData, currentCompany, compareCompany, tariffType]);

  const handleDownloadPDF = () => {
    toast({
      title: "Función en desarrollo",
      description: "La generación de PDF estará disponible próximamente.",
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
    <div className="min-h-screen flex flex-col px-4 py-8 relative" style={{ 
      background: companyBranding?.background_color 
        ? `linear-gradient(to bottom, ${companyBranding.background_color}, ${companyBranding.background_color})`
        : 'linear-gradient(to bottom, #003942, #002F36)'
    }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-4 flex items-center gap-2 transition-colors z-10"
        style={{
          color: companyBranding?.text_color || '#FFFFFF'
        }}
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

      <div className="flex-1">
      <div className="max-w-md mx-auto space-y-8">
        {/* Extracted Data Summary */}
        <div className="text-center space-y-4 pt-8">
          <h1 className="text-2xl md:text-3xl font-bold" style={{
            color: companyBranding?.text_color || '#FFFFFF'
          }}>
            Datos de tu factura
          </h1>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-3 shadow-lg">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Empresa actual:</span>
              <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.empresa || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Tarifa actual:</span>
              <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.tarifa || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Consumo mensual:</span>
              <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.consumo_kwh || 'N/A'} kWh</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Precio mensual estimado:</span>
              <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.precio_mensual || 'N/A'} €</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>CUPS:</span>
              <span className="font-semibold text-sm" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.cups || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Savings Header */}
        <div className="text-center space-y-4 pt-4">
          <h2 className="text-xl md:text-2xl font-bold" style={{
            color: companyBranding?.text_color || '#FFFFFF'
          }}>
            Podrías ahorrar:
          </h2>
          
          <div className="space-y-2">
            <div className="text-5xl md:text-6xl font-bold text-[#0A8754]">
              {savingsPerMonth} €/mes
            </div>
            <div className="text-xl md:text-2xl font-medium" style={{
              color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
            }}>
              {savingsPerYear} €/año
            </div>
          </div>
        </div>

        {/* Company Comparison Cards */}
        <div className="space-y-3 mt-12">
          {loading ? (
            <div className="text-center text-white">Calculando precios...</div>
          ) : companies.length > 0 ? (
            companies.map((company) => (
              <div
                key={company.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center justify-between transition-all duration-300 hover:bg-white/15 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold" style={{
                    color: companyBranding?.text_color || '#FFFFFF'
                  }}>
                    {company.name}
                  </span>
                </div>
                
                <div className="text-xl font-bold" style={{
                  color: companyBranding?.text_color || '#FFFFFF'
                }}>
                  {company.hasTariff && company.pricePerMonth !== null 
                    ? `${formatCurrency(company.pricePerMonth)} €/mes`
                    : <span className="text-sm text-white/60">Sin datos de tarifa</span>
                  }
                </div>
              </div>
            ))
          ) : (
            <div className="text-center" style={{
              color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)'
            }}>
              No se seleccionaron empresas para comparar
            </div>
          )}
        </div>

        {/* Additional Info */}
        <div className="text-center text-sm mt-8" style={{
          color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)'
        }}>
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
