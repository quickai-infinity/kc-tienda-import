import { useNavigate } from "react-router-dom";
import { ArrowLeft, Smartphone, Share, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/contexts/BrandingContext";
import Footer from "@/components/Footer";

const Install = () => {
  const navigate = useNavigate();
  const { companyBranding } = useBranding();

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

      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <Smartphone className="h-20 w-20 mx-auto" style={{
              color: companyBranding?.text_color || '#FFFFFF'
            }} />
            <h1 className="text-3xl md:text-4xl font-bold" style={{
              color: companyBranding?.text_color || '#FFFFFF'
            }}>
              Instalar la App
            </h1>
            <p className="text-lg" style={{
              color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
            }}>
              Instala nuestra app en tu teléfono para un acceso rápido y funcionalidad sin conexión
            </p>
          </div>

          {/* Installation Instructions */}
          <div className="space-y-6 mt-8">
            {/* iPhone Instructions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-lg">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}>
                <Share className="h-5 w-5" />
                En iPhone (Safari)
              </h2>
              <ol className="space-y-3 list-decimal list-inside" style={{
                color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
              }}>
                <li>Toca el botón de <strong>Compartir</strong> (cuadrado con flecha hacia arriba)</li>
                <li>Desplázate hacia abajo y selecciona <strong>"Añadir a pantalla de inicio"</strong></li>
                <li>Toca <strong>"Añadir"</strong> en la esquina superior derecha</li>
                <li>La app aparecerá en tu pantalla de inicio</li>
              </ol>
            </div>

            {/* Android Instructions */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-lg">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{
                color: companyBranding?.text_color || '#FFFFFF'
              }}>
                <Download className="h-5 w-5" />
                En Android (Chrome)
              </h2>
              <ol className="space-y-3 list-decimal list-inside" style={{
                color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
              }}>
                <li>Toca el menú (tres puntos en la esquina superior derecha)</li>
                <li>Selecciona <strong>"Instalar aplicación"</strong> o <strong>"Añadir a pantalla de inicio"</strong></li>
                <li>Confirma tocando <strong>"Instalar"</strong></li>
                <li>La app aparecerá en tu pantalla de inicio</li>
              </ol>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-3 shadow-lg mt-6">
            <h3 className="text-lg font-bold" style={{
              color: companyBranding?.text_color || '#FFFFFF'
            }}>
              Características de la App:
            </h3>
            <ul className="space-y-2" style={{
              color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
            }}>
              <li>✓ Acceso con cámara para escanear facturas</li>
              <li>✓ Carga de archivos PDF</li>
              <li>✓ Funciona sin conexión</li>
              <li>✓ Actualizaciones automáticas</li>
              <li>✓ Carga rápida y rendimiento optimizado</li>
            </ul>
          </div>

          <div className="text-center mt-8">
            <Button
              onClick={() => navigate('/')}
              className="bg-[#0A8754] hover:bg-[#0A8754]/90 text-white rounded-xl h-12 px-8 text-base font-semibold shadow-lg"
            >
              Comenzar a usar la app
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Install;
