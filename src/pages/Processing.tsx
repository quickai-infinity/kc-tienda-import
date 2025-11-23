import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Circle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/Footer";

interface ProcessingItem {
  id: string;
  label: string;
  completed: boolean;
}

interface ExtractedData {
  consumo_kwh: number;
  tarifa: string;
  cups: string;
  empresa: string;
  precio_mensual: number;
  potencia_kw?: number;
}

const Processing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [items, setItems] = useState<ProcessingItem[]>([
    { id: "consumo", label: "Consumo mensual", completed: false },
    { id: "tarifa", label: "Tarifa actual", completed: false },
    { id: "cups", label: "CUPS", completed: false },
  ]);

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

  useEffect(() => {
    const file = location.state?.file;
    
    if (!file) {
      toast({
        title: "Error",
        description: "No se ha proporcionado ningún archivo",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    const processFile = async () => {
      try {
        console.log("Processing file:", file.name);

        // Update items progressively
        const updateItem = (id: string) => {
          setItems(prev => prev.map(item => 
            item.id === id ? { ...item, completed: true } : item
          ));
        };

        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Call edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-invoice-data`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error al procesar el archivo');
        }

        const result = await response.json();
        console.log("Extraction result:", result);

        if (!result.success) {
          throw new Error('No se pudieron extraer los datos');
        }

        const extractedData: ExtractedData = result.data;

        // Update UI progressively
        setTimeout(() => updateItem("consumo"), 1000);
        setTimeout(() => updateItem("tarifa"), 2000);
        setTimeout(() => updateItem("cups"), 3000);

        // Save to database
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error: dbError } = await supabase
          .from('facturas')
          .insert({
            user_id: user.id,
            empresa_actual: extractedData.empresa,
            empresa_destino: location.state?.compareCompany,
            consumo_kwh: extractedData.consumo_kwh,
            potencia_kw: extractedData.potencia_kw || 4.6,
            precio_mensual_estimado: extractedData.precio_mensual,
          });

        if (dbError) {
          console.error("Error saving to database:", dbError);
        }

        // Navigate to results with extracted data
        setTimeout(() => {
          navigate('/results', { 
            state: { 
              extractedData,
              currentCompany: location.state?.currentCompany,
              compareCompany: location.state?.compareCompany,
            } 
          });
        }, 4000);

      } catch (error) {
        console.error("Processing error:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Error al procesar la factura",
          variant: "destructive",
        });
        setTimeout(() => navigate('/'), 2000);
      }
    };

    processFile();
  }, [navigate, location.state, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] px-4 py-6 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-4 flex items-center gap-2 text-white hover:text-white/80 transition-colors z-10"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-md w-full space-y-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Extrayendo información con IA…
          </h1>

          {/* Loader Animation */}
          <div className="flex justify-center mb-12">
            <div className="w-16 h-16 border-4 border-[#0A8754] border-t-transparent rounded-full animate-spin"></div>
          </div>

          {/* Processing Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-4 transition-all shadow-lg"
              >
                {item.completed ? (
                  <CheckCircle2 className="h-6 w-6 text-[#0A8754]" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-400" />
                )}
                <span className={`text-lg font-medium ${item.completed ? 'text-white' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Processing;
