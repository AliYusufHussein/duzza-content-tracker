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
      calendar: {
        Row: {
          channel: string | null
          content: string
          created_at: string
          date: string
          id: string
          notes: string | null
          owner_id: string | null
          platform: string | null
          posted_link: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          content: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          platform?: string | null
          posted_link?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          content?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          platform?: string | null
          posted_link?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      channels: {
        Row: {
          brand: string
          category: string
          created_at: string
          id: string
          link: string | null
          notes: string | null
          owner_id: string | null
          platform: string
          status: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          category: string
          created_at?: string
          id?: string
          link?: string | null
          notes?: string | null
          owner_id?: string | null
          platform: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          notes?: string | null
          owner_id?: string | null
          platform?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pipeline: {
        Row: {
          channel: string | null
          created_at: string
          date: string
          format: string | null
          hook: string | null
          id: string
          idea: string
          notes: string | null
          owner_id: string | null
          pillar: string | null
          platform: string | null
          posted_link: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          date?: string
          format?: string | null
          hook?: string | null
          id?: string
          idea: string
          notes?: string | null
          owner_id?: string | null
          pillar?: string | null
          platform?: string | null
          posted_link?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          date?: string
          format?: string | null
          hook?: string | null
          id?: string
          idea?: string
          notes?: string | null
          owner_id?: string | null
          pillar?: string | null
          platform?: string | null
          posted_link?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_drafts: {
        Row: {
          body: string
          created_at: string
          id: string
          model: string | null
          owner_id: string | null
          pipeline_id: string
          prompt_meta: Json | null
          source: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          model?: string | null
          owner_id?: string | null
          pipeline_id: string
          prompt_meta?: Json | null
          source?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          model?: string | null
          owner_id?: string | null
          pipeline_id?: string
          prompt_meta?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_drafts_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      polisher_queue: {
        Row: {
          article_id: string | null
          channel: string | null
          created_at: string
          format: string | null
          hook: string | null
          id: string
          idea: string | null
          pipeline_id: string | null
          platform: string | null
          status: string
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          channel?: string | null
          created_at?: string
          format?: string | null
          hook?: string | null
          id?: string
          idea?: string | null
          pipeline_id?: string | null
          platform?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          channel?: string | null
          created_at?: string
          format?: string | null
          hook?: string | null
          id?: string
          idea?: string | null
          pipeline_id?: string | null
          platform?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polisher_queue_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipeline"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      migrate_legacy_calendar_to_pipeline: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
