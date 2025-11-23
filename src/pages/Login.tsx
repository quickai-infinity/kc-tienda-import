import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/contexts/BrandingContext";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Correo electrónico inválido" })
    .max(255, { message: "El correo es demasiado largo" })
    .toLowerCase(),
  password: z
    .string()
    .min(1, { message: "La contraseña es requerida" })
    .max(128, { message: "La contraseña es demasiado larga" }),
});

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshBranding, companyBranding } = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input with zod
    const result = loginSchema.safeParse({
      email: email.trim(),
      password,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast({
        title: "Error de validación",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });

      if (error) throw error;

      // Refresh branding after login
      await refreshBranding();

      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido de vuelta",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error de autenticación",
        description: error.message || "Credenciales incorrectas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ 
      background: companyBranding?.background_color 
        ? `linear-gradient(to bottom, ${companyBranding.background_color}, ${companyBranding.background_color})`
        : 'linear-gradient(to bottom, #003942, #002F36)'
    }}>
      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-6 left-4 flex items-center gap-2 text-white transition-colors z-10"
      >
        <span className="text-lg">←</span>
        <span className="text-lg font-medium">Atrás</span>
      </button>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Iniciar sesión
            </h1>
            <p className="text-white/70 text-lg">
              Accede a tu cuenta
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[#00404A] text-white border-none rounded-xl h-12 pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-lg rounded-2xl bg-[#0A8754] hover:bg-[#0A8754]/90 text-white shadow-lg"
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>

            <div className="text-center space-y-3">
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-white/80 hover:text-white text-sm"
              >
                ¿No tienes cuenta? <span className="font-semibold">Crear cuenta</span>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => navigate("/reset-password")}
                  className="text-white/60 hover:text-white/80 text-sm"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Login;
