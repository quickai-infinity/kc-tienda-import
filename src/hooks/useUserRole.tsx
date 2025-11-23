import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "superadmin" | "company_admin" | "user" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setCompanyId(null);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (error) {
          setRole("user");
        } else {
          setRole(data.role as UserRole);
        }

        // Fetch company_id from profiles
        const { data: profileData } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("user_id", user.id)
          .single();

        setCompanyId(profileData?.company_id || null);
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("user");
        setCompanyId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { 
    role, 
    loading, 
    companyId,
    isSuperAdmin: role === "superadmin",
    isCompanyAdmin: role === "company_admin",
    isUser: role === "user"
  };
};
