import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Download, Mail } from "lucide-react";
import jsPDF from "jspdf";

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
  // Get from localStorage as fallback for PWA on Android (state can be lost)
  // PRIORIDAD: empresa seleccionada en dropdown > empresa extraída por OCR
  const selectedCompany = localStorage.getItem('selectedCompany') || "";
  const currentCompany = selectedCompany || extractedData.empresa || "";
  const tariffType = (location.state?.tariffType || localStorage.getItem('tariffType') || "electricity") as "electricity" | "gas";
  
  console.log('Results page - Received:', { 
    selectedCompany,
    currentCompany, 
    tariffType,
    extractedEmpresa: extractedData.empresa 
  });
  
  // Clean up localStorage after reading
  useEffect(() => {
    return () => {
      localStorage.removeItem('selectedCompany');
      localStorage.removeItem('tariffType');
    };
  }, []);
  
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

      // Empresa mostrada: la seleccionada por el usuario o la del OCR
      const displayCompany = currentCompany;
      
      console.log('Loading all companies for comparison:', { displayCompany, precioActual, consumoKwh });
      
      // Cargar TODAS las empresas para comparar
      const { data: todasEmpresas } = await supabase
        .from("empresas")
        .select("id, nombre");

      console.log('All companies:', todasEmpresas);

      const calculatedCompanies: CompanyOption[] = [];
      let currentCompanyPrice: number | null = precioActual;

      // Calcular precio para TODAS las empresas
      if (todasEmpresas) {
        for (const empresa of todasEmpresas) {
          let calculatedPrice: number | null = null;

          if (tariffType === "electricity") {
            const { data: tarifaElec } = await supabase
              .from("tarifas_electricidad")
              .select("*")
              .eq("empresa_id", empresa.id)
              .single();

            if (tarifaElec) {
              calculatedPrice = calculateMonthlyElectricityPrice(consumoKwh, tarifaElec);
            }
          } else {
            const { data: tarifaGas } = await supabase
              .from("tarifas_gas")
              .select("*")
              .eq("empresa_id", empresa.id)
              .single();

            if (tarifaGas) {
              calculatedPrice = calculateMonthlyGasPrice(consumoKwh, tarifaGas);
            }
          }

          calculatedCompanies.push({
            id: empresa.id,
            name: empresa.nombre,
            pricePerMonth: calculatedPrice,
            hasTariff: calculatedPrice !== null,
          });

          // Si es la empresa actual, guardar su precio
          if (empresa.nombre.toUpperCase() === displayCompany.toUpperCase()) {
            currentCompanyPrice = calculatedPrice || precioActual;
          }
        }
      }

      console.log('All calculated companies:', calculatedCompanies);
      console.log('Current company price:', currentCompanyPrice);

      // Mostrar solo la empresa actual en la lista
      const currentCompanyData = calculatedCompanies.find(c => 
        c.name.toUpperCase() === displayCompany.toUpperCase()
      );

      if (currentCompanyData) {
        setCompanies([currentCompanyData]);
      } else {
        setCompanies([{
          id: displayCompany,
          name: displayCompany,
          pricePerMonth: precioActual,
          hasTariff: false,
        }]);
      }

      // Calcular ahorro: encontrar la empresa MÁS BARATA
      const companiesWithPrices = calculatedCompanies.filter(c => c.pricePerMonth !== null);
      
      if (companiesWithPrices.length > 0 && currentCompanyPrice !== null) {
        const cheapestCompany = companiesWithPrices.reduce((prev, current) => 
          (current.pricePerMonth! < prev.pricePerMonth!) ? current : prev
        );

        console.log('Cheapest company:', cheapestCompany);

        const monthlyDiff = currentCompanyPrice - (cheapestCompany.pricePerMonth || 0);
        
        console.log('Savings calculation:', {
          currentCompanyPrice,
          cheapestPrice: cheapestCompany.pricePerMonth,
          monthlyDiff
        });

        // Solo mostrar ahorros positivos (cuando cambiar sería más barato)
        if (monthlyDiff > 0) {
          setSavingsPerMonth(formatCurrency(monthlyDiff));
          setSavingsPerYear(formatCurrency(monthlyDiff * 12));
        } else {
          setSavingsPerMonth("0,00");
          setSavingsPerYear("0,00");
        }
      } else {
        setSavingsPerMonth("0,00");
        setSavingsPerYear("0,00");
      }

      setLoading(false);
    };

    loadTariffsAndCalculate();
  }, [extractedData.consumo_kwh, extractedData.precio_mensual, currentCompany, tariffType]);

  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 57, 66); // Petroleum blue
      doc.text("Informe de Comparación de Tarifas", pageWidth / 2, 20, { align: "center" });
      
      // Company branding with logo
      if (companyBranding?.logo_url) {
        try {
          // Load logo image
          const response = await fetch(companyBranding.logo_url);
          const blob = await response.blob();
          const reader = new FileReader();
          
          await new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const base64data = reader.result as string;
              // Add logo centered (30x30 mm, positioned at center)
              const logoWidth = 30;
              const logoHeight = 15;
              const logoX = (pageWidth - logoWidth) / 2;
              doc.addImage(base64data, 'PNG', logoX, 30, logoWidth, logoHeight);
              resolve(null);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error("Error loading logo for PDF:", error);
          // Fallback to text if logo fails
          if (companyBranding?.company_name) {
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generado por ${companyBranding.company_name}`, pageWidth / 2, 35, { align: "center" });
          }
        }
      } else if (companyBranding?.company_name) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado por ${companyBranding.company_name}`, pageWidth / 2, 35, { align: "center" });
      }
      
      // Date
      doc.setFontSize(10);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 55);
      
      // Extracted data section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Datos de tu factura", 20, 70);
      
      doc.setFontSize(11);
      doc.text(`Empresa de tu factura: ${currentCompany || 'N/A'}`, 20, 80);
      
      if (tariffType === "gas") {
        doc.text(`Tarifa ATR: ${extractedData.tarifa_atr || 'N/A'}`, 20, 88);
        doc.text(`Consumo: ${extractedData.consumo_m3 || 'N/A'} m³ (${extractedData.consumo_kwh || 'N/A'} kWh)`, 20, 96);
        doc.text(`Término fijo: ${extractedData.termino_fijo || 'N/A'} €/mes`, 20, 104);
        doc.text(`Término variable: ${extractedData.termino_variable || 'N/A'} €/kWh`, 20, 112);
        doc.text(`Precio mensual: ${extractedData.precio_mensual || 'N/A'} €`, 20, 120);
      } else {
        doc.text(`Tarifa actual: ${extractedData.tarifa || 'N/A'}`, 20, 96);
        doc.text(`Consumo mensual: ${extractedData.consumo_kwh || 'N/A'} kWh`, 20, 104);
        doc.text(`Precio mensual estimado: ${extractedData.precio_mensual || 'N/A'} €`, 20, 112);
        doc.text(`CUPS: ${extractedData.cups || 'N/A'}`, 20, 120);
      }
      
      // Savings section
      doc.setFontSize(16);
      doc.setTextColor(10, 135, 84); // Green
      doc.text("Ahorro Estimado", 20, 138);
      
      doc.setFontSize(14);
      doc.text(`${savingsPerMonth} €/mes`, 20, 150);
      doc.text(`${savingsPerYear} €/año`, 20, 160);
      
      // Company comparison section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Comparación de Empresas", 20, 178);
      
      let yPosition = 188;
      companies.forEach((company, index) => {
        doc.setFontSize(11);
        const priceText = company.hasTariff && company.pricePerMonth !== null 
          ? `${formatCurrency(company.pricePerMonth)} €/mes`
          : 'Sin datos de tarifa';
        
        doc.text(`${company.name}: ${priceText}`, 25, yPosition + (index * 10));
      });
      
      // Footer
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("© 2025 KC Informatika — Todos los derechos reservados.", pageWidth / 2, 280, { align: "center" });
      
      // Save PDF
      const fileName = `comparacion_tarifas_${new Date().getTime()}.pdf`;
      doc.save(fileName);
      
      toast({
        title: "PDF generado",
        description: "El informe se ha descargado correctamente.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
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
              <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Empresa de tu factura:</span>
              <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{currentCompany || 'N/A'}</span>
            </div>
            
            {tariffType === "gas" ? (
              <>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Tarifa ATR:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.tarifa_atr || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Consumo m³:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.consumo_m3 || 'N/A'} m³</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Consumo kWh:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.consumo_kwh || 'N/A'} kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Término fijo:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.termino_fijo || 'N/A'} €/mes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Término variable:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.termino_variable || 'N/A'} €/kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Precio mensual:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.precio_mensual || 'N/A'} €</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Tarifa actual:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.tarifa || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Consumo mensual:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.consumo_kwh || 'N/A'} kWh</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Precio mensual:</span>
                  <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.precio_mensual || 'N/A'} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>CUPS:</span>
                  <span className="font-semibold text-sm" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>{extractedData.cups || 'N/A'}</span>
                </div>
              </>
            )}
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

        {/* Comparativas Button */}
        <div className="text-center mt-6">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            Comparativas atendidas
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
