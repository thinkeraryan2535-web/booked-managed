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
      bookings: {
        Row: {
          advance_payment: number
          assigned_team_member_ids: string[]
          client_name: string
          contact_person: string | null
          created_at: string
          created_by: string
          email: string | null
          event_date: string
          event_time: string | null
          event_type: string
          extra_activities: Json
          fy_label: string
          hall_cost: number
          hall_name: string
          id: string
          people_count: number
          phone: string
          special_demand: string | null
          spent_amount: number
          status: Database["public"]["Enums"]["booking_status"]
          total_budget: number
          updated_at: string
          venue_text: string
        }
        Insert: {
          advance_payment?: number
          assigned_team_member_ids?: string[]
          client_name: string
          contact_person?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          event_date: string
          event_time?: string | null
          event_type: string
          extra_activities?: Json
          fy_label: string
          hall_cost?: number
          hall_name: string
          id?: string
          people_count: number
          phone: string
          special_demand?: string | null
          spent_amount?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_budget?: number
          updated_at?: string
          venue_text: string
        }
        Update: {
          advance_payment?: number
          assigned_team_member_ids?: string[]
          client_name?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          extra_activities?: Json
          fy_label?: string
          hall_cost?: number
          hall_name?: string
          id?: string
          people_count?: number
          phone?: string
          special_demand?: string | null
          spent_amount?: number
          status?: Database["public"]["Enums"]["booking_status"]
          total_budget?: number
          updated_at?: string
          venue_text?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          is_read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_read?: boolean
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          preferences: Json
          presence: Database["public"]["Enums"]["presence_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name: string
          preferences?: Json
          presence?: Database["public"]["Enums"]["presence_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          preferences?: Json
          presence?: Database["public"]["Enums"]["presence_status"]
          updated_at?: string
        }
        Relationships: []
      }
      revenue_archives: {
        Row: {
          booking_records: Json
          created_at: string
          fy_label: string
          id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          booking_records?: Json
          created_at?: string
          fy_label: string
          id?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          booking_records?: Json
          created_at?: string
          fy_label?: string
          id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          booking_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string
          due_time: string | null
          id: string
          last_updated_by: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          scope: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          booking_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          due_date: string
          due_time?: string | null
          id?: string
          last_updated_by?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          scope?: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string
          due_time?: string | null
          id?: string
          last_updated_by?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          scope?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "team_member"
      booking_status: "upcoming" | "today" | "completed"
      presence_status: "online" | "offline"
      task_priority: "high" | "medium" | "low"
      task_status: "pending" | "done"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "team_member"],
      booking_status: ["upcoming", "today", "completed"],
      presence_status: ["online", "offline"],
      task_priority: ["high", "medium", "low"],
      task_status: ["pending", "done"],
    },
  },
} as const
