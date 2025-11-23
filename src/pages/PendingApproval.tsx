import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingContext";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

const PendingApproval = () => {
  const navigate = useNavigate();
  const { companyBranding } = useBranding();

  useEffect(() => {
    // Check if user is approved periodically
    const checkApproval = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("approved")
        .eq("user_id", user.id)
        .single();

      if (profile?.approved) {
        navigate("/");
      }
    };

    checkApproval();
    const interval = setInterval(checkApproval, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: companyBranding?.background_color 
          ? `linear-gradient(135deg, ${companyBranding.background_color} 0%, ${companyBranding.background_color}DD 100%)`
          : 'linear-gradient(135deg, #003942 0%, #002F36 100%)'
      }}
    >
      <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="mb-6">
          <Clock 
            size={64} 
            className="mx-auto mb-4"
            style={{
              color: companyBranding?.primary_color || '#F59E0B'
            }}
          />
        </div>

        <h1 
          className="text-2xl font-bold mb-4"
          style={{
            color: companyBranding?.text_color || '#FFFFFF'
          }}
        >
          Cuenta Pendiente de Aprobación
        </h1>

        <p 
          className="mb-6 text-lg"
          style={{
            color: companyBranding?.text_color ? `${companyBranding.text_color}CC` : 'rgba(255, 255, 255, 0.8)'
          }}
        >
          Tu cuenta ha sido creada exitosamente, pero necesita ser aprobada por un administrador antes de que puedas usar la aplicación.
        </p>

        <p 
          className="mb-8 text-sm"
          style={{
            color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)'
          }}
        >
          Recibirás acceso tan pronto como un administrador apruebe tu cuenta. Por favor, espera o contacta al administrador.
        </p>

        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full"
          style={{
            borderColor: companyBranding?.text_color || '#FFFFFF',
            color: companyBranding?.text_color || '#FFFFFF'
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
};

export default PendingApproval;
