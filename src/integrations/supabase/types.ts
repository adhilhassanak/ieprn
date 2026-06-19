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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          accent_color: string
          button_color: string
          community_registration: Json
          gradient_from: string
          gradient_to: string
          id: string
          primary_color: string
          registration_open_global: boolean
          secondary_color: string
          singleton: boolean
          theme_mode: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          button_color?: string
          community_registration?: Json
          gradient_from?: string
          gradient_to?: string
          id?: string
          primary_color?: string
          registration_open_global?: boolean
          secondary_color?: string
          singleton?: boolean
          theme_mode?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          button_color?: string
          community_registration?: Json
          gradient_from?: string
          gradient_to?: string
          id?: string
          primary_color?: string
          registration_open_global?: boolean
          secondary_color?: string
          singleton?: boolean
          theme_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          community: string | null
          created_at: string
          created_by: string | null
          id: string
          message: string
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          community?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          title: string
          type?: string
        }
        Update: {
          active?: boolean
          community?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          event_id: string
          id: string
          marked_by: string
          participant_gmail: string
          participant_id: string | null
          participant_name: string
          present: boolean
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          marked_by: string
          participant_gmail: string
          participant_id?: string | null
          participant_name: string
          present?: boolean
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          marked_by?: string
          participant_gmail?: string
          participant_id?: string | null
          participant_name?: string
          present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "event_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      community_logos: {
        Row: {
          community: string
          created_at: string
          logo_url: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          community: string
          created_at?: string
          logo_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          community?: string
          created_at?: string
          logo_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      dashboard_links: {
        Row: {
          button_link: string
          button_text: string
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          button_link: string
          button_text: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          button_link?: string
          button_text?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      event_coordinators: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_coordinators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_gallery: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          event_id: string
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          event_id: string
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_gallery_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          created_at: string
          event_id: string
          full_name: string
          gmail: string
          id: string
          phone: string
          semester: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          full_name: string
          gmail: string
          id?: string
          phone: string
          semester?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          full_name?: string
          gmail?: string
          id?: string
          phone?: string
          semester?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          actual_participants: number
          actual_registrations: number | null
          community: string
          coordinator_contacts: Json
          coordinator_names: string[]
          created_at: string
          created_by: string | null
          description: string | null
          displayed_registrations: number | null
          event_date: string | null
          event_time: string | null
          expected_participants: number
          external_form_url: string | null
          funds_received: number
          id: string
          manual_registered_count: number | null
          name: string
          pdf_url: string | null
          poster_url: string | null
          registration_mode: string
          registration_open: boolean
          slug: string | null
          status: Database["public"]["Enums"]["event_status"]
          venue: string | null
          whatsapp_group_link: string | null
          whatsapp_link: string | null
        }
        Insert: {
          actual_participants?: number
          actual_registrations?: number | null
          community: string
          coordinator_contacts?: Json
          coordinator_names?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          displayed_registrations?: number | null
          event_date?: string | null
          event_time?: string | null
          expected_participants?: number
          external_form_url?: string | null
          funds_received?: number
          id?: string
          manual_registered_count?: number | null
          name: string
          pdf_url?: string | null
          poster_url?: string | null
          registration_mode?: string
          registration_open?: boolean
          slug?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          venue?: string | null
          whatsapp_group_link?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          actual_participants?: number
          actual_registrations?: number | null
          community?: string
          coordinator_contacts?: Json
          coordinator_names?: string[]
          created_at?: string
          created_by?: string | null
          description?: string | null
          displayed_registrations?: number | null
          event_date?: string | null
          event_time?: string | null
          expected_participants?: number
          external_form_url?: string | null
          funds_received?: number
          id?: string
          manual_registered_count?: number | null
          name?: string
          pdf_url?: string | null
          poster_url?: string | null
          registration_mode?: string
          registration_open?: boolean
          slug?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          venue?: string | null
          whatsapp_group_link?: string | null
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      faculty: {
        Row: {
          active: boolean
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          priority: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          priority?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          priority?: number
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      finance: {
        Row: {
          amount: number
          id: string
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          id?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          id?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      highlights: {
        Row: {
          caption: string | null
          community: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          community?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          community?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
        }
        Relationships: []
      }
      positions_needed: {
        Row: {
          community: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          max_count: number
          role_name: string
        }
        Insert: {
          community: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_count?: number
          role_name: string
        }
        Update: {
          community?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          max_count?: number
          role_name?: string
        }
        Relationships: []
      }
      principal: {
        Row: {
          created_at: string
          designation: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          photo_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          community: string | null
          created_at: string
          email: string | null
          full_name: string | null
          phone: string | null
          photo_url: string | null
          semester: string | null
          user_id: string
        }
        Insert: {
          community?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          photo_url?: string | null
          semester?: string | null
          user_id: string
        }
        Update: {
          community?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          phone?: string | null
          photo_url?: string | null
          semester?: string | null
          user_id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          branch: string | null
          community: string
          created_at: string
          current_position: string | null
          division: string | null
          full_name: string
          gmail: string
          id: string
          parent_head: string | null
          phone: string
          photo_url: string | null
          previous_position: string | null
          semester: string | null
          status: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Insert: {
          branch?: string | null
          community: string
          created_at?: string
          current_position?: string | null
          division?: string | null
          full_name: string
          gmail: string
          id?: string
          parent_head?: string | null
          phone: string
          photo_url?: string | null
          previous_position?: string | null
          semester?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          user_id: string
        }
        Update: {
          branch?: string | null
          community?: string
          created_at?: string
          current_position?: string | null
          division?: string | null
          full_name?: string
          gmail?: string
          id?: string
          parent_head?: string | null
          phone?: string
          photo_url?: string | null
          previous_position?: string | null
          semester?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      execom_sorted: {
        Row: {
          branch: string | null
          community: string | null
          created_at: string | null
          current_position: string | null
          division: string | null
          full_name: string | null
          gmail: string | null
          id: string | null
          phone: string | null
          photo_url: string | null
          previous_position: string | null
          priority: number | null
          semester: string | null
          status: Database["public"]["Enums"]["registration_status"] | null
          user_id: string | null
        }
        Insert: {
          branch?: string | null
          community?: string | null
          created_at?: string | null
          current_position?: string | null
          division?: string | null
          full_name?: string | null
          gmail?: string | null
          id?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_position?: string | null
          priority?: never
          semester?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          user_id?: string | null
        }
        Update: {
          branch?: string | null
          community?: string | null
          created_at?: string | null
          current_position?: string | null
          division?: string | null
          full_name?: string | null
          gmail?: string | null
          id?: string | null
          phone?: string | null
          photo_url?: string | null
          previous_position?: string | null
          priority?: never
          semester?: string | null
          status?: Database["public"]["Enums"]["registration_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_old_events: { Args: { _days: number }; Returns: number }
      generate_event_slug: { Args: { _name: string }; Returns: string }
      get_public_execom: {
        Args: never
        Returns: {
          community: string
          current_position: string
          full_name: string
          id: string
          photo_url: string
        }[]
      }
      get_storage_stats: {
        Args: never
        Returns: {
          bucket_id: string
          file_count: number
          total_bytes: number
        }[]
      }
      has_approved_position: {
        Args: { _position: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_executive: { Args: { _user_id: string }; Returns: boolean }
      is_co_admin_of: {
        Args: { _community: string; _user_id: string }
        Returns: boolean
      }
      is_documentation_head: { Args: { _user_id: string }; Returns: boolean }
      is_event_coordinator: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "student"
        | "executive_member"
        | "coordinator"
        | "admin"
        | "co_admin"
        | "documentation_head"
        | "finance_head"
      event_status:
        | "draft"
        | "pending"
        | "published"
        | "completed"
        | "cancelled"
      registration_status: "pending" | "approved" | "rejected"
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
      app_role: [
        "student",
        "executive_member",
        "coordinator",
        "admin",
        "co_admin",
        "documentation_head",
        "finance_head",
      ],
      event_status: ["draft", "pending", "published", "completed", "cancelled"],
      registration_status: ["pending", "approved", "rejected"],
    },
  },
} as const
