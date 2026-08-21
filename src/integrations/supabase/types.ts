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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_collapsed: boolean
          name: string
          pos_dx: number | null
          pos_dy: number | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_collapsed?: boolean
          name: string
          pos_dx?: number | null
          pos_dy?: number | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_collapsed?: boolean
          name?: string
          pos_dx?: number | null
          pos_dy?: number | null
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_credentials: {
        Row: {
          calendar_id: string
          connection_api_key: string
          created_at: string
          email: string | null
          last_sync_at: string | null
          sync_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string
          connection_api_key: string
          created_at?: string
          email?: string | null
          last_sync_at?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          connection_api_key?: string
          created_at?: string
          email?: string | null
          last_sync_at?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_sync: {
        Row: {
          calendar_id: string
          created_at: string
          event_id: string | null
          last_google_update: string | null
          last_local_update: string | null
          note_id: string | null
          sync_status: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string
          created_at?: string
          event_id?: string | null
          last_google_update?: string | null
          last_local_update?: string | null
          note_id?: string | null
          sync_status?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          event_id?: string | null
          last_google_update?: string | null
          last_local_update?: string | null
          note_id?: string | null
          sync_status?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_sync_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_attachments: {
        Row: {
          content_type: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_versions: {
        Row: {
          category_id: string | null
          checklist: Json
          color: string | null
          content: string
          created_at: string
          event_type: string
          icon: string | null
          id: string
          is_collapsed: boolean
          linked_note_ids: string[]
          note_id: string
          note_type: string
          parent_note_id: string | null
          pos_dx: number | null
          pos_dy: number | null
          restored_from_version_id: string | null
          source: string
          title: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          checklist?: Json
          color?: string | null
          content?: string
          created_at?: string
          event_type?: string
          icon?: string | null
          id?: string
          is_collapsed?: boolean
          linked_note_ids?: string[]
          note_id: string
          note_type?: string
          parent_note_id?: string | null
          pos_dx?: number | null
          pos_dy?: number | null
          restored_from_version_id?: string | null
          source?: string
          title?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          checklist?: Json
          color?: string | null
          content?: string
          created_at?: string
          event_type?: string
          icon?: string | null
          id?: string
          is_collapsed?: boolean
          linked_note_ids?: string[]
          note_id?: string
          note_type?: string
          parent_note_id?: string | null
          pos_dx?: number | null
          pos_dy?: number | null
          restored_from_version_id?: string | null
          source?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          category_id: string | null
          checklist: Json
          color: string | null
          content: string
          created_at: string
          icon: string | null
          id: string
          is_collapsed: boolean
          linked_note_ids: string[]
          note_type: string
          parent_note_id: string | null
          pos_dx: number | null
          pos_dy: number | null
          pos_x: number | null
          pos_y: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          checklist?: Json
          color?: string | null
          content?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_collapsed?: boolean
          linked_note_ids?: string[]
          note_type?: string
          parent_note_id?: string | null
          pos_dx?: number | null
          pos_dy?: number | null
          pos_x?: number | null
          pos_y?: number | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          checklist?: Json
          color?: string | null
          content?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_collapsed?: boolean
          linked_note_ids?: string[]
          note_type?: string
          parent_note_id?: string | null
          pos_dx?: number | null
          pos_dy?: number | null
          pos_x?: number | null
          pos_y?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_parent_note_id_fkey"
            columns: ["parent_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          brain_name: string
          created_at: string
          display_name: string | null
          google_calendar_connected: boolean
          google_calendar_email: string | null
          id: string
          onboarded: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          brain_name?: string
          created_at?: string
          display_name?: string | null
          google_calendar_connected?: boolean
          google_calendar_email?: string | null
          id: string
          onboarded?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          brain_name?: string
          created_at?: string
          display_name?: string | null
          google_calendar_connected?: boolean
          google_calendar_email?: string | null
          id?: string
          onboarded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      move_note: {
        Args: { _new_parent_id?: string; _note_id: string }
        Returns: {
          category_id: string | null
          checklist: Json
          color: string | null
          content: string
          created_at: string
          icon: string | null
          id: string
          is_collapsed: boolean
          linked_note_ids: string[]
          note_type: string
          parent_note_id: string | null
          pos_dx: number | null
          pos_dy: number | null
          pos_x: number | null
          pos_y: number | null
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      recover_deleted_note_version: {
        Args: { _version_id: string }
        Returns: {
          category_id: string | null
          checklist: Json
          color: string | null
          content: string
          created_at: string
          icon: string | null
          id: string
          is_collapsed: boolean
          linked_note_ids: string[]
          note_type: string
          parent_note_id: string | null
          pos_dx: number | null
          pos_dy: number | null
          pos_x: number | null
          pos_y: number | null
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      restore_note_version: {
        Args: { _note_id: string; _version_id: string }
        Returns: {
          category_id: string | null
          checklist: Json
          color: string | null
          content: string
          created_at: string
          icon: string | null
          id: string
          is_collapsed: boolean
          linked_note_ids: string[]
          note_type: string
          parent_note_id: string | null
          pos_dx: number | null
          pos_dy: number | null
          pos_x: number | null
          pos_y: number | null
          title: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
