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
          platform: string | null
          posted_link: string | null
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
          platform?: string | null
          posted_link?: string | null
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
          platform?: string | null
          posted_link?: string | null
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
          platform?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      growth: {
        Row: {
          channel: string | null
          created_at: string
          date: string
          followers: number
          id: string
          platform: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          date?: string
          followers?: number
          id?: string
          platform?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          date?: string
          followers?: number
          id?: string
          platform?: string | null
        }
        Relationships: []
      }
      ideas: {
        Row: {
          category: string | null
          channel: string | null
          content_type: string | null
          created_at: string
          hook: string | null
          id: string
          idea: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          channel?: string | null
          content_type?: string | null
          created_at?: string
          hook?: string | null
          id?: string
          idea: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          channel?: string | null
          content_type?: string | null
          created_at?: string
          hook?: string | null
          id?: string
          idea?: string
          status?: string
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
          pillar?: string | null
          platform?: string | null
          posted_link?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          channel: string | null
          comments: number
          content_type: string | null
          created_at: string
          date: string
          id: string
          likes: number
          platform: string | null
          post_link: string | null
          saves: number
          shares: number
          updated_at: string
          views: number
        }
        Insert: {
          channel?: string | null
          comments?: number
          content_type?: string | null
          created_at?: string
          date?: string
          id?: string
          likes?: number
          platform?: string | null
          post_link?: string | null
          saves?: number
          shares?: number
          updated_at?: string
          views?: number
        }
        Update: {
          channel?: string | null
          comments?: number
          content_type?: string | null
          created_at?: string
          date?: string
          id?: string
          likes?: number
          platform?: string | null
          post_link?: string | null
          saves?: number
          shares?: number
          updated_at?: string
          views?: number
        }
        Relationships: []
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
      repurposing: {
        Row: {
          created_at: string
          id: string
          link: string | null
          new_format: string | null
          notes: string | null
          original_post: string
          source_platform: string | null
          status: string
          target_platform: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          new_format?: string | null
          notes?: string | null
          original_post: string
          source_platform?: string | null
          status?: string
          target_platform?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          new_format?: string | null
          notes?: string | null
          original_post?: string
          source_platform?: string | null
          status?: string
          target_platform?: string | null
          updated_at?: string
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
