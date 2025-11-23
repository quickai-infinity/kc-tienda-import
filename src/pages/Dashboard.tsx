import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingContext";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import { calculateMonthlyElectricityPrice, calculateMonthlyGasPrice, formatCurrency } from "@/utils/tariffCalculations";

interface ComparativaCard {
  id: string;
  empresaDestino: string;
  ahorroMensual: string;
  ahorroAnual: string;
  fecha: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { companyBranding } = useBranding();
  const [comparativas, setComparativas] = useState<ComparativaCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Check authentication and load data
  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Fetch user's facturas
      const { data: facturas, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error loading facturas:", error);
        setLoading(false);
        return;
      }

      if (!facturas || facturas.length === 0) {
        setLoading(false);
        return;
      }

      // Process each factura to calculate savings
      const comparativasData: ComparativaCard[] = [];

      for (const factura of facturas) {
        if (!factura.empresa_destino) continue;

        const consumoKwh = parseFloat(factura.consumo_kwh.toString());
        const precioActual = factura.precio_mensual_estimado 
          ? parseFloat(factura.precio_mensual_estimado.toString()) 
          : null;

        // Get empresa_destino details
        const { data: empresaDestino } = await supabase
          .from("empresas")
          .select("id, nombre")
          .eq("nombre", factura.empresa_destino)
          .single();

        if (!empresaDestino) continue;

        // Calculate price for empresa_destino
        // Try electricity tariff first
        const { data: tarifaElec } = await supabase
          .from("tarifas_electricidad")
          .select("*")
          .eq("empresa_id", empresaDestino.id)
          .single();

        let precioDestino: number | null = null;

        if (tarifaElec) {
          precioDestino = calculateMonthlyElectricityPrice(consumoKwh, tarifaElec);
        } else {
          // Try gas tariff
          const { data: tarifaGas } = await supabase
            .from("tarifas_gas")
            .select("*")
            .eq("empresa_id", empresaDestino.id)
            .single();

          if (tarifaGas) {
            precioDestino = calculateMonthlyGasPrice(consumoKwh, tarifaGas);
          }
        }

        // Calculate savings if we have both prices
        if (precioActual && precioDestino) {
          const ahorroMensual = precioActual - precioDestino;
          const ahorroAnual = ahorroMensual * 12;

          if (ahorroMensual > 0) {
            comparativasData.push({
              id: factura.id,
              empresaDestino: factura.empresa_destino,
              ahorroMensual: formatCurrency(ahorroMensual),
              ahorroAnual: formatCurrency(ahorroAnual),
              fecha: new Date(factura.created_at).toLocaleDateString('es-ES'),
            });
          }
        }
      }

      setComparativas(comparativasData);
      setLoading(false);
    };

    loadData();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col relative" style={{ 
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

      {/* Export PDF Button */}
      <div className="absolute top-6 right-4 z-10">
        <Button
          variant="outline"
          className="bg-white/10 text-white border-white/20 hover:bg-white/20"
        >
          <FileText className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 py-20">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-8" style={{
            color: companyBranding?.text_color || '#FFFFFF'
          }}>
            Comparativas atendidas
          </h1>

          {loading ? (
            <div className="text-center" style={{
              color: companyBranding?.text_color || '#FFFFFF'
            }}>
              Cargando comparativas...
            </div>
          ) : comparativas.length === 0 ? (
            <div className="text-center" style={{
              color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)'
            }}>
              No hay comparativas realizadas aún
            </div>
          ) : (
            <div className="space-y-4">
              {comparativas.map((comparativa) => (
                <div
                  key={comparativa.id}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 space-y-2 hover:bg-white/15 transition-all shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold" style={{
                      color: companyBranding?.text_color || '#FFFFFF'
                    }}>
                      {comparativa.empresaDestino}
                    </span>
                    <span className="text-sm" style={{
                      color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)'
                    }}>
                      {comparativa.fecha}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{
                      color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)'
                    }}>
                      Ahorro mensual:
                    </span>
                    <span className="text-lg font-bold text-[#0A8754]">
                      {comparativa.ahorroMensual} €/mes
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{
                      color: companyBranding?.text_color ? `${companyBranding.text_color}B3` : 'rgba(255, 255, 255, 0.7)'
                    }}>
                      Ahorro anual:
                    </span>
                    <span className="text-lg font-bold text-[#0A8754]">
                      {comparativa.ahorroAnual} €/año
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
