import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranding } from "@/contexts/BrandingContext";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

interface PendingUser {
  id: string;
  user_id: string;
  approved: boolean;
  created_at: string;
  email?: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const { companyBranding } = useBranding();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!roleLoading && !isSuperAdmin) {
        navigate("/");
        return;
      }
      if (!roleLoading && isSuperAdmin) {
        fetchUsers();
      }
    };
    checkAuth();
  }, [isSuperAdmin, roleLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, approved, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch emails from auth.users via admin query
      const usersWithEmails = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          return {
            ...profile,
            email: user?.email || "Sin email"
          };
        })
      );

      setUsers(usersWithEmails);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approved: true })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Usuario aprobado",
        description: "El usuario ahora puede usar la aplicación",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approved: false })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: "Usuario desaprobado",
        description: "El usuario ya no puede usar la aplicación",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Error",
        description: "No se pudo desaprobar el usuario",
        variant: "destructive",
      });
    }
  };

  if (roleLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          background: companyBranding?.background_color 
            ? `linear-gradient(135deg, ${companyBranding.background_color} 0%, ${companyBranding.background_color}DD 100%)`
            : 'linear-gradient(135deg, #003942 0%, #002F36 100%)'
        }}
      >
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pb-20 pt-24 px-4"
      style={{
        background: companyBranding?.background_color 
          ? `linear-gradient(135deg, ${companyBranding.background_color} 0%, ${companyBranding.background_color}DD 100%)`
          : 'linear-gradient(135deg, #003942 0%, #002F36 100%)'
      }}
    >
      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-6 left-4 text-white flex items-center gap-2 hover:opacity-80 transition-opacity z-50"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <ArrowLeft size={20} />
        <span>Atrás</span>
      </button>

      <div className="max-w-4xl mx-auto">
        <h1 
          className="text-3xl font-bold mb-8 text-center"
          style={{
            color: companyBranding?.text_color || '#FFFFFF'
          }}
        >
          Gestión de Usuarios
        </h1>

        {loading ? (
          <div 
            className="text-center"
            style={{
              color: companyBranding?.text_color || '#FFFFFF'
            }}
          >
            Cargando usuarios...
          </div>
        ) : users.length === 0 ? (
          <div 
            className="text-center"
            style={{
              color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)'
            }}
          >
            No hay usuarios registrados
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-lg"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <p 
                      className="font-semibold text-lg"
                      style={{
                        color: companyBranding?.text_color || '#FFFFFF'
                      }}
                    >
                      {user.email}
                    </p>
                    <p 
                      className="text-sm mt-1"
                      style={{
                        color: companyBranding?.text_color ? `${companyBranding.text_color}99` : 'rgba(255, 255, 255, 0.6)'
                      }}
                    >
                      Registrado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                    </p>
                    <p 
                      className="text-sm mt-1 font-medium"
                      style={{
                        color: user.approved 
                          ? '#10B981' 
                          : '#F59E0B'
                      }}
                    >
                      {user.approved ? '✓ Aprobado' : '⏳ Pendiente de aprobación'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {!user.approved ? (
                      <Button
                        onClick={() => handleApprove(user.user_id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2" size={18} />
                        Aprobar
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleReject(user.user_id)}
                        variant="destructive"
                      >
                        <XCircle className="mr-2" size={18} />
                        Desaprobar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
