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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          equipment: string | null
          external_video_url: string | null
          id: string
          name: string
          reference_video_url: string | null
          target_muscles: string[] | null
          trainer_reference_url: string | null
          updated_at: string | null
          video_source: string | null
          video_status: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          external_video_url?: string | null
          id?: string
          name: string
          reference_video_url?: string | null
          target_muscles?: string[] | null
          trainer_reference_url?: string | null
          updated_at?: string | null
          video_source?: string | null
          video_status?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          equipment?: string | null
          external_video_url?: string | null
          id?: string
          name?: string
          reference_video_url?: string | null
          target_muscles?: string[] | null
          trainer_reference_url?: string | null
          updated_at?: string | null
          video_source?: string | null
          video_status?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      fitness_buddy_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          personality: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          personality?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          personality?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          meals: Json
          notes: string | null
          total_calories: number | null
          total_carbs: number | null
          total_fats: number | null
          total_protein: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          meals?: Json
          notes?: string | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          meals?: Json
          notes?: string | null
          total_calories?: number | null
          total_carbs?: number | null
          total_fats?: number | null
          total_protein?: number | null
          user_id?: string
        }
        Relationships: []
      }
      pace_milestones: {
        Row: {
          ai_image_url: string | null
          created_at: string
          generated_at: string | null
          id: string
          program_start_date: string
          status: string
          target_weight: number | null
          user_id: string
          week_number: number
        }
        Insert: {
          ai_image_url?: string | null
          created_at?: string
          generated_at?: string | null
          id?: string
          program_start_date: string
          status?: string
          target_weight?: number | null
          user_id: string
          week_number: number
        }
        Update: {
          ai_image_url?: string | null
          created_at?: string
          generated_at?: string | null
          id?: string
          program_start_date?: string
          status?: string
          target_weight?: number | null
          user_id?: string
          week_number?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          before_photo_url: string | null
          created_at: string
          current_weight: number | null
          email: string | null
          face_photo_url: string | null
          fitness_level: string | null
          full_name: string | null
          gender: string | null
          goal_type: string | null
          goal_weight: number | null
          has_seen_transformation: boolean | null
          height: number | null
          id: string
          is_subscribed: boolean | null
          original_photo_url: string | null
          pace_mode_enabled: boolean | null
          program_duration_weeks: number | null
          program_start_date: string | null
          stripe_customer_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          transformation_photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          before_photo_url?: string | null
          created_at?: string
          current_weight?: number | null
          email?: string | null
          face_photo_url?: string | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          goal_type?: string | null
          goal_weight?: number | null
          has_seen_transformation?: boolean | null
          height?: number | null
          id?: string
          is_subscribed?: boolean | null
          original_photo_url?: string | null
          pace_mode_enabled?: boolean | null
          program_duration_weeks?: number | null
          program_start_date?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          transformation_photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          before_photo_url?: string | null
          created_at?: string
          current_weight?: number | null
          email?: string | null
          face_photo_url?: string | null
          fitness_level?: string | null
          full_name?: string | null
          gender?: string | null
          goal_type?: string | null
          goal_weight?: number | null
          has_seen_transformation?: boolean | null
          height?: number | null
          id?: string
          is_subscribed?: boolean | null
          original_photo_url?: string | null
          pace_mode_enabled?: boolean | null
          program_duration_weeks?: number | null
          program_start_date?: string | null
          stripe_customer_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          transformation_photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      progress_photos: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photo_date: string
          photo_url: string
          user_id: string
          weight_at_time: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_date?: string
          photo_url: string
          user_id: string
          weight_at_time?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photo_date?: string
          photo_url?: string
          user_id?: string
          weight_at_time?: number | null
        }
        Relationships: []
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
      weight_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          notes: string | null
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          completed: boolean | null
          created_at: string
          duration_minutes: number | null
          exercises: Json
          id: string
          notes: string | null
          user_id: string
          workout_date: string
          workout_plan_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          duration_minutes?: number | null
          exercises: Json
          id?: string
          notes?: string | null
          user_id: string
          workout_date?: string
          workout_plan_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          duration_minutes?: number | null
          exercises?: Json
          id?: string
          notes?: string | null
          user_id?: string
          workout_date?: string
          workout_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_plan_id_fkey"
            columns: ["workout_plan_id"]
            isOneToOne: false
            referencedRelation: "workout_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_plans: {
        Row: {
          created_at: string
          days_per_week: number | null
          description: string | null
          fitness_level: string
          goal_type: string
          id: string
          is_active: boolean | null
          name: string
          plan_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          days_per_week?: number | null
          description?: string | null
          fitness_level: string
          goal_type: string
          id?: string
          is_active?: boolean | null
          name: string
          plan_data: Json
          user_id: string
        }
        Update: {
          created_at?: string
          days_per_week?: number | null
          description?: string | null
          fitness_level?: string
          goal_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          plan_data?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
