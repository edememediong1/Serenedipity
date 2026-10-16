export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string;
          updated_at: string;
          updated_by: string | null;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          updated_at?: string;
          updated_by?: string | null;
          value: NonNullable<Json>;
        };
        Update: {
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        ComputedFields: never;
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          created_at: string;
          id: string;
          input_mode: string;
          mood_summary: string | null;
          safety_flag: boolean;
          transcript: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          input_mode?: string;
          mood_summary?: string | null;
          safety_flag?: boolean;
          transcript?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          input_mode?: string;
          mood_summary?: string | null;
          safety_flag?: boolean;
          transcript?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      focus_blocks: {
        Row: {
          completed: boolean;
          created_at: string;
          ended_at: string | null;
          focused_seconds: number;
          id: string;
          lap: number | null;
          outcome: string | null;
          planned_minutes: number;
          started_at: string;
          task_id: string | null;
          task_title: string | null;
          technique: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          completed?: boolean;
          created_at?: string;
          ended_at?: string | null;
          focused_seconds?: number;
          id?: string;
          lap?: number | null;
          outcome?: string | null;
          planned_minutes: number;
          started_at?: string;
          task_id?: string | null;
          task_title?: string | null;
          technique?: string | null;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          created_at?: string;
          ended_at?: string | null;
          focused_seconds?: number;
          id?: string;
          lap?: number | null;
          outcome?: string | null;
          planned_minutes?: number;
          started_at?: string;
          task_id?: string | null;
          task_title?: string | null;
          technique?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "focus_blocks_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          checkin_id: string | null;
          created_at: string;
          deadline: string | null;
          id: string;
          status: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          checkin_id?: string | null;
          created_at?: string;
          deadline?: string | null;
          id?: string;
          status?: string;
          user_id: string;
        };
        Update: {
          checkin_id?: string | null;
          created_at?: string;
          deadline?: string | null;
          id?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plans_checkin_id_fkey";
            columns: ["checkin_id"];
            isOneToOne: false;
            referencedRelation: "checkins";
            referencedColumns: ["id"];
          },
        ];
      };
      playlist_tracks: {
        Row: {
          playlist_id: string;
          position: number;
          track_id: string;
        };
        ComputedFields: never;
        Insert: {
          playlist_id: string;
          position?: number;
          track_id: string;
        };
        Update: {
          playlist_id?: string;
          position?: number;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey";
            columns: ["playlist_id"];
            isOneToOne: false;
            referencedRelation: "playlists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "playlist_tracks_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      playlists: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          featured: boolean;
          id: string;
          is_premium: boolean;
          position: number;
          slug: string;
          state: string;
          status: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          is_premium?: boolean;
          position?: number;
          slug: string;
          state: string;
          status?: string;
          title: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          is_premium?: boolean;
          position?: number;
          slug?: string;
          state?: string;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          age_confirmed: boolean;
          age_confirmed_at: string | null;
          ai_guide_consent: boolean;
          ai_guide_consent_at: string | null;
          created_at: string;
          default_break_minutes: number;
          default_focus_minutes: number;
          display_name: string | null;
          focus_laps: number;
          focus_technique: string;
          goals: string[];
          has_headphones: boolean | null;
          id: string;
          long_break_every: number;
          long_break_minutes: number;
          music_prefs: string[];
          onboarding_completed_at: string | null;
          onboarding_step: number;
          plan: string;
          role: string;
          timezone: string | null;
          updated_at: string;
          work_style: string | null;
        };
        ComputedFields: never;
        Insert: {
          age_confirmed?: boolean;
          age_confirmed_at?: string | null;
          ai_guide_consent?: boolean;
          ai_guide_consent_at?: string | null;
          created_at?: string;
          default_break_minutes?: number;
          default_focus_minutes?: number;
          display_name?: string | null;
          focus_laps?: number;
          focus_technique?: string;
          goals?: string[];
          has_headphones?: boolean | null;
          id: string;
          long_break_every?: number;
          long_break_minutes?: number;
          music_prefs?: string[];
          onboarding_completed_at?: string | null;
          onboarding_step?: number;
          plan?: string;
          role?: string;
          timezone?: string | null;
          updated_at?: string;
          work_style?: string | null;
        };
        Update: {
          age_confirmed?: boolean;
          age_confirmed_at?: string | null;
          ai_guide_consent?: boolean;
          ai_guide_consent_at?: string | null;
          created_at?: string;
          default_break_minutes?: number;
          default_focus_minutes?: number;
          display_name?: string | null;
          focus_laps?: number;
          focus_technique?: string;
          goals?: string[];
          has_headphones?: boolean | null;
          id?: string;
          long_break_every?: number;
          long_break_minutes?: number;
          music_prefs?: string[];
          onboarding_completed_at?: string | null;
          onboarding_step?: number;
          plan?: string;
          role?: string;
          timezone?: string | null;
          updated_at?: string;
          work_style?: string | null;
        };
        Relationships: [];
      };
      rate_limit_hits: {
        Row: {
          bucket: string;
          created_at: string;
          id: number;
          key_hash: string;
        };
        ComputedFields: never;
        Insert: {
          bucket: string;
          created_at?: string;
          id?: never;
          key_hash: string;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          id?: never;
          key_hash?: string;
        };
        Relationships: [];
      };
      reflections: {
        Row: {
          content: NonNullable<Json>;
          created_at: string;
          id: string;
          period: string;
          period_start: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          content: NonNullable<Json>;
          created_at?: string;
          id?: string;
          period?: string;
          period_start: string;
          user_id: string;
        };
        Update: {
          content?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          period?: string;
          period_start?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: string;
          reported_user_id: string;
          reporter_id: string;
          room_id: string | null;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: string;
          reported_user_id: string;
          reporter_id: string;
          room_id?: string | null;
          status?: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: string;
          reported_user_id?: string;
          reporter_id?: string;
          room_id?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_messages: {
        Row: {
          body: string;
          created_at: string;
          display_name: string;
          id: string;
          room_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          body: string;
          created_at?: string;
          display_name: string;
          id?: string;
          room_id: string;
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          display_name?: string;
          id?: string;
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_participants: {
        Row: {
          joined_at: string;
          last_seen_at: string;
          left_at: string | null;
          removed: boolean;
          room_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          joined_at?: string;
          last_seen_at?: string;
          left_at?: string | null;
          removed?: boolean;
          room_id: string;
          user_id: string;
        };
        Update: {
          joined_at?: string;
          last_seen_at?: string;
          left_at?: string | null;
          removed?: boolean;
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          break_minutes: number;
          capacity: number;
          created_at: string;
          description: string | null;
          focus_minutes: number;
          host_id: string | null;
          id: string;
          invite_code: string | null;
          schedule: string;
          session_minutes: number;
          starts_at: string;
          status: string;
          title: string;
          track_id: string | null;
          visibility: string;
        };
        ComputedFields: never;
        Insert: {
          break_minutes?: number;
          capacity?: number;
          created_at?: string;
          description?: string | null;
          focus_minutes?: number;
          host_id?: string | null;
          id?: string;
          invite_code?: string | null;
          schedule?: string;
          session_minutes?: number;
          starts_at: string;
          status?: string;
          title: string;
          track_id?: string | null;
          visibility?: string;
        };
        Update: {
          break_minutes?: number;
          capacity?: number;
          created_at?: string;
          description?: string | null;
          focus_minutes?: number;
          host_id?: string | null;
          id?: string;
          invite_code?: string | null;
          schedule?: string;
          session_minutes?: number;
          starts_at?: string;
          status?: string;
          title?: string;
          track_id?: string | null;
          visibility?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      safety_events: {
        Row: {
          category: string;
          checkin_id: string | null;
          created_at: string;
          id: string;
          source: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          checkin_id?: string | null;
          created_at?: string;
          id?: string;
          source: string;
          user_id: string;
        };
        Update: {
          category?: string;
          checkin_id?: string | null;
          created_at?: string;
          id?: string;
          source?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "safety_events_checkin_id_fkey";
            columns: ["checkin_id"];
            isOneToOne: false;
            referencedRelation: "checkins";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          billing_interval: string | null;
          cancel_at_period_end: boolean;
          current_period_end: string | null;
          price_id: string | null;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          trial_end: string | null;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          billing_interval?: string | null;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          price_id?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_end?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          billing_interval?: string | null;
          cancel_at_period_end?: boolean;
          current_period_end?: string | null;
          price_id?: string | null;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          trial_end?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          estimate_minutes: number;
          id: string;
          music_category: string | null;
          plan_id: string;
          position: number;
          status: string;
          title: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          estimate_minutes: number;
          id?: string;
          music_category?: string | null;
          plan_id: string;
          position: number;
          status?: string;
          title: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          estimate_minutes?: number;
          id?: string;
          music_category?: string | null;
          plan_id?: string;
          position?: number;
          status?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      tracks: {
        Row: {
          category: string;
          created_at: string;
          duration_seconds: number;
          file_url: string;
          id: string;
          is_premium: boolean;
          license_record: string;
          slug: string;
          source: string;
          status: string;
          style: string | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          category: string;
          created_at?: string;
          duration_seconds: number;
          file_url: string;
          id?: string;
          is_premium?: boolean;
          license_record: string;
          slug: string;
          source: string;
          status?: string;
          style?: string | null;
          title: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          duration_seconds?: number;
          file_url?: string;
          id?: string;
          is_premium?: boolean;
          license_record?: string;
          slug?: string;
          source?: string;
          status?: string;
          style?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      waitlist: {
        Row: {
          created_at: string;
          email: string;
          id: number;
          source: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_medium: string | null;
          utm_source: string | null;
          utm_term: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          id?: never;
          source?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: never;
          source?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
          utm_term?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_room_member: { Args: { p_room: string }; Returns: boolean };
      rate_limit_hit: {
        Args: { p_bucket: string; p_key_hash: string; p_max?: number; p_window_seconds?: number };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
