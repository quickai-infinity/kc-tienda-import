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
import { 
  calculateMonthlyGasPrice, 
  formatCurrency, 
  calculateElectricityComparison, 
  convertToOCRFormat,
  CalculationDetail 
} from "@/utils/tariffCalculations";

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
  const [comparisonMessage, setComparisonMessage] = useState<string | null>(null);
  const [comparisonMessageType, setComparisonMessageType] = useState<'positive' | 'neutral' | 'negative'>('positive');
  
  // NEW: Calculation detail state
  const [calculationDetail, setCalculationDetail] = useState<CalculationDetail | null>(null);
  const [missingAdminFields, setMissingAdminFields] = useState<string[]>([]);
  const [totalActual, setTotalActual] = useState<number>(0);
  const [totalComparacion, setTotalComparacion] = useState<number>(0);
  
  // Explainability data
  const detectedFields = location.state?.detectedFields || [];
  const fallbacksApplied = location.state?.fallbacksApplied || [];

  // Load tariffs and calculate prices
  useEffect(() => {
    const loadTariffsAndCalculate = async () => {
      const displayCompany = currentCompany;
      
      // Convert extracted data to OCR format for comparison
      const ocrData = convertToOCRFormat(extractedData);

      console.log('📊 OCR data for comparison:', ocrData);

      // Load all companies
      const { data: todasEmpresas } = await supabase
        .from("empresas")
        .select("id, nombre");

      console.log('All companies:', todasEmpresas);

      const calculatedCompanies: CompanyOption[] = [];

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
              // Use new non-blocking comparison
              const comparison = calculateElectricityComparison(ocrData, tarifaElec, empresa.nombre);
              calculatedPrice = comparison.totalComparacion;
            }
          } else {
            const { data: tarifaGas } = await supabase
              .from("tarifas_gas")
              .select("*")
              .eq("empresa_id", empresa.id)
              .single();

            if (tarifaGas) {
              const totalConsumo = (ocrData.consumo_p1_kwh || 0) + (ocrData.consumo_p2_kwh || 0) + (ocrData.consumo_p3_kwh || 0);
              calculatedPrice = calculateMonthlyGasPrice(totalConsumo, tarifaGas);
            }
          }

          calculatedCompanies.push({
            id: empresa.id,
            name: empresa.nombre,
            pricePerMonth: calculatedPrice,
            hasTariff: calculatedPrice !== null,
          });
        }
      }

      console.log('All calculated companies:', calculatedCompanies);

      // Show current company in the list
      const currentCompanyData = calculatedCompanies.find(c => 
        c.name.toUpperCase() === displayCompany.toUpperCase()
      );

      if (currentCompanyData) {
        setCompanies([currentCompanyData]);
      } else {
        setCompanies([{
          id: displayCompany,
          name: displayCompany,
          pricePerMonth: null,
          hasTariff: false,
        }]);
      }

      // For electricity: use new comparison logic
      if (tariffType === "electricity") {
        // Find the company to compare against (the selected company from dropdown)
        const targetCompany = calculatedCompanies.find(c => 
          c.name.toUpperCase() === displayCompany.toUpperCase()
        );

        if (targetCompany) {
          // Get admin tariff for comparison
          const { data: adminTarifa } = await supabase
            .from("tarifas_electricidad")
            .select("*")
            .eq("empresa_id", targetCompany.id)
            .single();

          if (adminTarifa) {
            // Use NEW non-blocking comparison function
            const comparison = calculateElectricityComparison(ocrData, adminTarifa, targetCompany.name);
            
            console.log('📊 Electricity comparison result:', comparison);

            // Store calculation details
            setCalculationDetail(comparison.detalle);
            setMissingAdminFields(comparison.missingAdminFields);
            setTotalActual(comparison.totalActual);
            setTotalComparacion(comparison.totalComparacion);

            const diferencia = comparison.diferencia;

            // CHECK: Is the invoice company the same as the selected company?
            const empresaFactura = extractedData.empresa?.toLowerCase().trim();
            const empresaSeleccionada = targetCompany.name?.toLowerCase().trim();
            
            if (empresaFactura && empresaSeleccionada && empresaFactura === empresaSeleccionada) {
              // Same company - no comparison applies
              setSavingsPerMonth("--");
              setSavingsPerYear("--");
              setComparisonMessage(`Tu factura actual ya pertenece a ${targetCompany.name}. No aplica comparación.`);
              setComparisonMessageType('neutral');
            } else if (diferencia >= 0.01) {
              // Positive savings
              setSavingsPerMonth(formatCurrency(diferencia));
              setSavingsPerYear(formatCurrency(diferencia * 12));
              setComparisonMessage(`Con ${targetCompany.name} ahorrarías ${formatCurrency(diferencia)} €/mes.`);
              setComparisonMessageType('positive');
            } else if (diferencia <= -0.01) {
              // New tariff is more expensive
              const extraCost = Math.abs(diferencia);
              setSavingsPerMonth(`+${formatCurrency(extraCost)}`);
              setSavingsPerYear(`+${formatCurrency(extraCost * 12)}`);
              setComparisonMessage(`Con ${targetCompany.name} pagarías ${formatCurrency(extraCost)} €/mes más.`);
              setComparisonMessageType('negative');
            } else {
              // No significant difference
              setSavingsPerMonth("0,00");
              setSavingsPerYear("0,00");
              setComparisonMessage("No hay diferencia significativa entre las tarifas.");
              setComparisonMessageType('neutral');
            }
          } else {
            // No tariff configured - but still try to show something
            setSavingsPerMonth("--");
            setSavingsPerYear("--");
            setComparisonMessage(`No hay tarifa configurada para ${targetCompany.name}. Configure los precios en el panel de administración.`);
            setComparisonMessageType('neutral');
          }
        } else {
          setSavingsPerMonth("--");
          setSavingsPerYear("--");
          setComparisonMessage("Empresa no encontrada en el sistema.");
          setComparisonMessageType('neutral');
        }
      } else {
        // Gas comparison: find cheapest
        const companiesWithPrices = calculatedCompanies.filter(c => c.pricePerMonth !== null);
        const precioActual = parseFloat(extractedData.precio_mensual) || null;
        
        if (companiesWithPrices.length > 0 && precioActual !== null) {
          const cheapestCompany = companiesWithPrices.reduce((prev, current) => 
            (current.pricePerMonth! < prev.pricePerMonth!) ? current : prev
          );

          const monthlyDiff = precioActual - (cheapestCompany.pricePerMonth || 0);

          // CHECK: Is the invoice company the same as the cheapest company?
          const empresaFacturaGas = extractedData.empresa?.toLowerCase().trim();
          const empresaSeleccionadaGas = cheapestCompany.name?.toLowerCase().trim();

          if (empresaFacturaGas && empresaSeleccionadaGas && empresaFacturaGas === empresaSeleccionadaGas) {
            // Same company - no comparison applies
            setSavingsPerMonth("--");
            setSavingsPerYear("--");
            setComparisonMessage(`Tu factura actual ya pertenece a ${cheapestCompany.name}. No aplica comparación.`);
            setComparisonMessageType('neutral');
          } else if (monthlyDiff > 0.01) {
            setSavingsPerMonth(formatCurrency(monthlyDiff));
            setSavingsPerYear(formatCurrency(monthlyDiff * 12));
            setComparisonMessage(`Con ${cheapestCompany.name} ahorrarías ${formatCurrency(monthlyDiff)} €/mes.`);
            setComparisonMessageType('positive');
          } else if (monthlyDiff < -0.01) {
            const extraCost = Math.abs(monthlyDiff);
            setSavingsPerMonth(`+${formatCurrency(extraCost)}`);
            setSavingsPerYear(`+${formatCurrency(extraCost * 12)}`);
            setComparisonMessage(`Con ${cheapestCompany.name} pagarías ${formatCurrency(extraCost)} €/mes más.`);
            setComparisonMessageType('negative');
          } else {
            setSavingsPerMonth("0,00");
            setSavingsPerYear("0,00");
            setComparisonMessage("No hay diferencia significativa entre las tarifas.");
            setComparisonMessageType('neutral');
          }
        } else {
          setSavingsPerMonth("--");
          setSavingsPerYear("--");
          setComparisonMessage("No hay datos suficientes para comparar.");
          setComparisonMessageType('neutral');
        }
      }

      setLoading(false);
    };

    loadTariffsAndCalculate();
  }, [extractedData, currentCompany, tariffType]);

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
      doc.text("Resultado de la Comparación", 20, 138);
      
      doc.setFontSize(14);
      doc.text(`${savingsPerMonth} €/mes`, 20, 150);
      doc.text(`${savingsPerYear} €/año`, 20, 160);
      
      if (comparisonMessage) {
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(comparisonMessage, 20, 172, { maxWidth: pageWidth - 40 });
      }
      
      // Company comparison section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Comparación de Empresas", 20, 190);
      
      let yPosition = 200;
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

        {/* Electricity Extracted Data Preview - Only for electricity invoices */}
        {tariffType === "electricity" && extractedData && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 space-y-3 shadow-lg border border-white/10">
            <h3 className="text-lg font-semibold mb-3" style={{
              color: companyBranding?.text_color || '#FFFFFF'
            }}>
              Datos extraídos de la factura
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>Días del periodo:</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {extractedData.potencia_days ?? '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>Potencia contratada (kW):</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {extractedData.potencia_kw ?? '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>Precio potencia (€/kW día):</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {extractedData.potencia_price ?? '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>Consumo P1 (kWh):</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {extractedData.consumo_p1 ?? '--'}
                </span>
              </div>
              {extractedData.consumo_p2 !== undefined && extractedData.consumo_p2 !== null && (
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>Consumo P2 (kWh):</span>
                  <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                    {extractedData.consumo_p2}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>Precio Energía P1 (€/kWh):</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {extractedData.energia_p1_price ?? '--'}
                </span>
              </div>
              {extractedData.energia_p2_price !== undefined && extractedData.energia_p2_price !== null && (
                <div className="flex justify-between items-center">
                  <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>Precio Energía P2 (€/kWh):</span>
                  <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                    {extractedData.energia_p2_price}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>Impuesto eléctrico (%):</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {extractedData.impuesto_electrico ?? '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)' }}>IVA (%):</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {extractedData.iva ?? '--'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="font-medium" style={{ color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)' }}>Total factura original:</span>
                <span className="font-semibold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {extractedData.precio_mensual ? `${extractedData.precio_mensual} €` : '--'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Result Header */}
        <div className="text-center space-y-4 pt-4">
          <h2 className="text-xl md:text-2xl font-bold" style={{
            color: companyBranding?.text_color || '#FFFFFF'
          }}>
            Resultado de la comparación
          </h2>
          
          {/* Comparison Message - ALWAYS SHOWN */}
          {comparisonMessage && (
            <div className={`p-4 rounded-xl ${
              comparisonMessageType === 'positive' 
                ? 'bg-green-500/20 border border-green-400/30'
                : comparisonMessageType === 'negative' 
                  ? 'bg-red-500/20 border border-red-400/30' 
                  : 'bg-yellow-500/20 border border-yellow-400/30'
            }`}>
              <p className={`text-lg font-semibold ${
                comparisonMessageType === 'positive' 
                  ? 'text-green-300'
                  : comparisonMessageType === 'negative' 
                    ? 'text-red-300' 
                    : 'text-yellow-300'
              }`}>
                {comparisonMessage}
              </p>
            </div>
          )}
          
          {/* Savings Display */}
          <div className="space-y-2">
            <div className={`text-5xl md:text-6xl font-bold ${
              comparisonMessageType === 'positive' 
                ? 'text-[#0A8754]' 
                : comparisonMessageType === 'negative'
                  ? 'text-red-400'
                  : 'text-yellow-400'
            }`}>
              {savingsPerMonth} €/mes
            </div>
            <div className="text-xl md:text-2xl font-medium" style={{
              color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
            }}>
              {savingsPerYear} €/año
            </div>
          </div>
        </div>

        {/* NEW: Calculation Detail Section (Debugging & Transparency) */}
        {tariffType === "electricity" && calculationDetail && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 space-y-4 shadow-lg border border-white/10">
            <h3 className="text-lg font-semibold" style={{
              color: companyBranding?.text_color || '#FFFFFF'
            }}>
              Detalle del cálculo
            </h3>
            
            {/* Cost comparison */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Tu factura actual</p>
                <p className="text-xl font-bold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {formatCurrency(totalActual)} €
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs mb-1" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Con {currentCompany}</p>
                <p className="text-xl font-bold" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {formatCurrency(totalComparacion)} €
                </p>
              </div>
            </div>
            
            {/* Breakdown */}
            <div className="space-y-2 text-sm border-t border-white/10 pt-3">
              <p className="font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                Desglose del cálculo ({currentCompany}):
              </p>
              <div className="flex justify-between items-center">
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Potencia:</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {formatCurrency(calculationDetail.potencia)} €
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Energía P1:</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {formatCurrency(calculationDetail.energia_p1)} €
                </span>
              </div>
              {calculationDetail.energia_p2 > 0 && (
                <div className="flex justify-between items-center">
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Energía P2:</span>
                  <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                    {formatCurrency(calculationDetail.energia_p2)} €
                  </span>
                </div>
              )}
              {calculationDetail.energia_p3 > 0 && (
                <div className="flex justify-between items-center">
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Energía P3:</span>
                  <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                    {formatCurrency(calculationDetail.energia_p3)} €
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>Impuesto eléctrico:</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {formatCurrency(calculationDetail.impuesto)} €
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>IVA:</span>
                <span className="font-medium" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {formatCurrency(calculationDetail.iva)} €
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/10">
                <span className="font-semibold" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Total:</span>
                <span className="font-bold text-lg" style={{ color: companyBranding?.text_color || '#FFFFFF' }}>
                  {formatCurrency(calculationDetail.total)} €
                </span>
              </div>
            </div>
            
            {/* Missing admin fields warning */}
            {missingAdminFields.length > 0 && (
              <div className="bg-yellow-500/10 rounded-lg p-3 mt-3">
                <p className="text-xs text-yellow-300">
                  ⚠️ Campos de tarifa no configurados: {missingAdminFields.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Explainability Section */}
        {(detectedFields.length > 0 || fallbacksApplied.length > 0) && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 space-y-4 shadow-lg border border-white/10">
            <h3 className="text-lg font-semibold" style={{
              color: companyBranding?.text_color || '#FFFFFF'
            }}>
              Resumen del cálculo
            </h3>
            
            {detectedFields.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{
                  color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)'
                }}>
                  Datos detectados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {detectedFields.map((field: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs">
                      {field.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {fallbacksApplied.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2" style={{
                  color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)'
                }}>
                  Datos estimados (fallback):
                </p>
                <ul className="space-y-1">
                  {fallbacksApplied.map((fallback: string, index: number) => (
                    <li key={index} className="text-xs text-yellow-300/90 flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      {fallback}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

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
