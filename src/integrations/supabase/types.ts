export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      branding: {
        Row: {
          active_company: string | null
          app_name: string
          id: string
          logo_url: string | null
          primary_color: string
          show_only_my_company: boolean | null
          updated_at: string | null
        }
        Insert: {
          active_company?: string | null
          app_name?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          show_only_my_company?: boolean | null
          updated_at?: string | null
        }
        Update: {
          active_company?: string | null
          app_name?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          show_only_my_company?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branding: {
        Row: {
          accent_color: string | null
          background_color: string | null
          company_name: string
          id: string
          last_updated: string | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          text_color: string | null
          website_url: string | null
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          company_name: string
          id?: string
          last_updated?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          text_color?: string | null
          website_url?: string | null
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          company_name?: string
          id?: string
          last_updated?: string | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          text_color?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      comparaciones: {
        Row: {
          ahorro_estimado: number | null
          created_at: string
          empresa: string
          factura_id: string
          id: string
          precio_estimado: number
        }
        Insert: {
          ahorro_estimado?: number | null
          created_at?: string
          empresa: string
          factura_id: string
          id?: string
          precio_estimado: number
        }
        Update: {
          ahorro_estimado?: number | null
          created_at?: string
          empresa?: string
          factura_id?: string
          id?: string
          precio_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "comparaciones_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
        ]
      }
      elsi_catalog_temp: {
        Row: {
          brand: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          part_number: string
          price: number | null
          stock: number | null
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          part_number: string
          price?: number | null
          stock?: number | null
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          part_number?: string
          price?: number | null
          stock?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      elsi_logs: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          operation: string
          records_processed: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          operation: string
          records_processed?: number | null
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          operation?: string
          records_processed?: number | null
          status?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          color_primario: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          nombre: string
        }
        Insert: {
          color_primario?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nombre: string
        }
        Update: {
          color_primario?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nombre?: string
        }
        Relationships: []
      }
      facturas: {
        Row: {
          consumo_kwh: number
          created_at: string
          empresa_actual: string
          empresa_destino: string | null
          id: string
          potencia_kw: number
          precio_mensual_estimado: number | null
          user_id: string
        }
        Insert: {
          consumo_kwh: number
          created_at?: string
          empresa_actual: string
          empresa_destino?: string | null
          id?: string
          potencia_kw: number
          precio_mensual_estimado?: number | null
          user_id: string
        }
        Update: {
          consumo_kwh?: number
          created_at?: string
          empresa_actual?: string
          empresa_destino?: string | null
          id?: string
          potencia_kw?: number
          precio_mensual_estimado?: number | null
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          brand: string | null
          category: string | null
          category_id: string | null
          created_at: string | null
          currency: string
          description: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          name: string | null
          price_base: number | null
          price_cents: number
          price_final: number | null
          sku: string
          stock: number
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          name?: string | null
          price_base?: number | null
          price_cents: number
          price_final?: number | null
          sku: string
          stock?: number
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          currency?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          name?: string | null
          price_base?: number | null
          price_cents?: number
          price_final?: number | null
          sku?: string
          stock?: number
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved?: boolean
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved?: boolean
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      servicios_adicionales: {
        Row: {
          empresa_id: string
          id: string
          nombre: string
          precio_mensual: number | null
          updated_at: string | null
        }
        Insert: {
          empresa_id: string
          id?: string
          nombre: string
          precio_mensual?: number | null
          updated_at?: string | null
        }
        Update: {
          empresa_id?: string
          id?: string
          nombre?: string
          precio_mensual?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_adicionales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_metrics: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          operation: string
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          operation: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at: string
          status: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          operation?: string
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          created_at: string | null
          in_progress: boolean | null
          last_run: string | null
          operation: string
        }
        Insert: {
          created_at?: string | null
          in_progress?: boolean | null
          last_run?: string | null
          operation: string
        }
        Update: {
          created_at?: string | null
          in_progress?: boolean | null
          last_run?: string | null
          operation?: string
        }
        Relationships: []
      }
      tarifas: {
        Row: {
          empresa: string
          id: string
          potencia_fija: number
          precio_kwh: number
          updated_at: string
        }
        Insert: {
          empresa: string
          id?: string
          potencia_fija: number
          precio_kwh: number
          updated_at?: string
        }
        Update: {
          empresa?: string
          id?: string
          potencia_fija?: number
          precio_kwh?: number
          updated_at?: string
        }
        Relationships: []
      }
      tarifas_electricidad: {
        Row: {
          empresa_id: string
          energia_p1: number | null
          energia_p2: number | null
          energia_p3: number | null
          id: string
          impuesto_electrico: number | null
          iva: number | null
          potencia_p1: number | null
          potencia_p2: number | null
          updated_at: string | null
        }
        Insert: {
          empresa_id: string
          energia_p1?: number | null
          energia_p2?: number | null
          energia_p3?: number | null
          id?: string
          impuesto_electrico?: number | null
          iva?: number | null
          potencia_p1?: number | null
          potencia_p2?: number | null
          updated_at?: string | null
        }
        Update: {
          empresa_id?: string
          energia_p1?: number | null
          energia_p2?: number | null
          energia_p3?: number | null
          id?: string
          impuesto_electrico?: number | null
          iva?: number | null
          potencia_p1?: number | null
          potencia_p2?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_electricidad_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas_gas: {
        Row: {
          empresa_id: string
          id: string
          iva: number | null
          tarifa_atr: string | null
          termino_fijo: number | null
          termino_variable: number | null
          updated_at: string | null
        }
        Insert: {
          empresa_id: string
          id?: string
          iva?: number | null
          tarifa_atr?: string | null
          termino_fijo?: number | null
          termino_variable?: number | null
          updated_at?: string | null
        }
        Update: {
          empresa_id?: string
          id?: string
          iva?: number | null
          tarifa_atr?: string | null
          termino_fijo?: number | null
          termino_variable?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_gas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      sync_statistics: {
        Row: {
          avg_duration_seconds: number | null
          failed_runs: number | null
          last_run: string | null
          operation: string | null
          successful_runs: number | null
          total_records_processed: number | null
          total_runs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_old_logs: { Args: { days_to_keep?: number }; Returns: number }
      decrypt_sensitive: {
        Args: { encrypted_data: string; key?: string }
        Returns: string
      }
      encrypt_sensitive: {
        Args: { data: string; key?: string }
        Returns: string
      }
      get_sync_state_with_lock: {
        Args: { operation_name: string }
        Returns: {
          created_at: string
          in_progress: boolean
          last_run: string
          operation: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "superadmin" | "company_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "superadmin", "company_admin"],
    },
  },
} as const
