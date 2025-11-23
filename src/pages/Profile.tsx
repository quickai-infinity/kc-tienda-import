import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role, loading: roleLoading } = useUserRole();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      setEmail(session.user.email || "");
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo cerrar sesión",
        variant: "destructive",
      });
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#003942] to-[#002F36]">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] relative">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-4 flex items-center gap-2 text-white hover:text-white/80 transition-colors z-10"
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

      <div className="flex-1 px-4 py-20">
        <div className="max-w-md mx-auto space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-8">
            Mi perfil
          </h1>

          {/* Email */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="space-y-2">
              <p className="text-white/70 text-sm font-medium">Correo electrónico</p>
              <p className="text-white text-lg">{email}</p>
            </div>
          </div>

          {/* Role */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="space-y-2">
              <p className="text-white/70 text-sm font-medium">Rol</p>
              <p className="text-white text-lg capitalize">{role || "user"}</p>
            </div>
          </div>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            className="w-full h-14 text-lg rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
