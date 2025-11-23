import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el correo de recuperación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#003942] to-[#002F36] relative"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)'
      }}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/login')}
        className="absolute left-4 flex items-center gap-2 text-white hover:text-white/80 transition-colors z-10"
        style={{
          top: 'max(calc(env(safe-area-inset-top, 0px) + 1.5rem), 1.5rem)'
        }}
      >
        <ArrowLeft className="h-6 w-6" />
        <span className="text-lg font-medium">Atrás</span>
      </button>

      <div className="flex-1 flex items-center justify-center px-4"
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 4rem), 4rem)'
        }}
      >
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Recuperar contraseña
            </h1>
            <p className="text-white/70 text-lg">
              Te enviaremos un enlace para restablecer tu contraseña
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-lg">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white text-sm font-medium">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#00404A] text-white border-none rounded-xl h-12"
                  placeholder="tu@correo.com"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-lg rounded-2xl bg-[#0A8754] hover:bg-[#0A8754]/90 text-white shadow-lg"
            >
              {loading ? "Enviando..." : "Enviar enlace de recuperación"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-white/80 hover:text-white text-sm"
              >
                Volver a <span className="font-semibold">Iniciar sesión</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResetPassword;
