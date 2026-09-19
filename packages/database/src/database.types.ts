/**
 * Supabase database types for the `public` schema.
 *
 * Written to match the output of `supabase gen types typescript`. Regenerate with
 * `pnpm db:types` (local stack) or `pnpm --filter @quizbyte/database types:remote`
 * (linked project) after changing migrations, and keep this file in sync.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          accent_color: string | null;
          sort_order: number;
          is_active: boolean;
          requires_pro: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          accent_color?: string | null;
          sort_order?: number;
          is_active?: boolean;
          requires_pro?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          accent_color?: string | null;
          sort_order?: number;
          is_active?: boolean;
          requires_pro?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      app_ideas: {
        Row: {
          id: string;
          user_id: string;
          area: Database['public']['Enums']['idea_area'];
          title: string;
          details: string;
          status: Database['public']['Enums']['report_status'];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          area?: Database['public']['Enums']['idea_area'];
          title: string;
          details?: string;
          status?: Database['public']['Enums']['report_status'];
          created_at?: string;
        };
        Update: { id?: string };
        Relationships: [];
      };
      feature_flags: {
        Row: {
          key: string;
          enabled: boolean;
          note: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          enabled: boolean;
          note?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          enabled?: boolean;
          note?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      daily_quiz_plan: {
        Row: {
          day: string;
          question_ids: string[];
          note: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          day: string;
          question_ids: string[];
          note?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          day?: string;
          question_ids?: string[];
          note?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_actions: {
        Row: {
          id: string;
          admin_id: string;
          target_user_id: string | null;
          kind: Database['public']['Enums']['admin_action_kind'];
          details: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          target_user_id?: string | null;
          kind: Database['public']['Enums']['admin_action_kind'];
          details?: string;
          created_at?: string;
        };
        Update: { id?: string };
        Relationships: [];
      };
      user_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          reason: Database['public']['Enums']['user_report_reason'];
          details: string;
          status: Database['public']['Enums']['report_status'];
          admin_note: string;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          reason: Database['public']['Enums']['user_report_reason'];
          details?: string;
          status?: Database['public']['Enums']['report_status'];
          created_at?: string;
        };
        Update: { id?: string };
        Relationships: [];
      };
      user_blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: { created_at?: string };
        Relationships: [];
      };
      question_reports: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          reason: Database['public']['Enums']['report_reason'];
          details: string;
          status: Database['public']['Enums']['report_status'];
          admin_note: string;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          reason: Database['public']['Enums']['report_reason'];
          details?: string;
          status?: Database['public']['Enums']['report_status'];
          created_at?: string;
        };
        Update: { id?: string };
        Relationships: [
          {
            foreignKeyName: 'question_reports_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      study_sheets: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category_id: string | null;
          folder_id: string | null;
          pdf_url: string;
          page_urls: string[];
          page_count: number;
          is_published: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          category_id?: string | null;
          folder_id?: string | null;
          pdf_url: string;
          page_urls?: string[];
          page_count?: number;
          is_published?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          category_id?: string | null;
          folder_id?: string | null;
          pdf_url?: string;
          page_urls?: string[];
          page_count?: number;
          is_published?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'study_sheets_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'study_sheets_folder_id_fkey';
            columns: ['folder_id'];
            isOneToOne: false;
            referencedRelation: 'study_sheet_folders';
            referencedColumns: ['id'];
          },
        ];
      };
      study_sheet_folders: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          is_published: boolean;
          sort_order: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          is_published?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          is_published?: boolean;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_questions: {
        Row: { user_id: string; question_id: string; created_at: string };
        Insert: { user_id: string; question_id: string; created_at?: string };
        Update: { user_id?: string; question_id?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: 'saved_questions_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          avatar_config: Json;
          selected_frame: string | null;
          role: Database['public']['Enums']['user_role'];
          is_anonymous: boolean;
          suspended_at: string | null;
          suspended_reason: string | null;
          username_changed_at: string | null;
          searchable: boolean;
          allow_friend_requests: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          avatar_config?: Json;
          selected_frame?: string | null;
          role?: Database['public']['Enums']['user_role'];
          is_anonymous?: boolean;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          username_changed_at?: string | null;
          searchable?: boolean;
          allow_friend_requests?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          avatar_config?: Json;
          selected_frame?: string | null;
          role?: Database['public']['Enums']['user_role'];
          is_anonymous?: boolean;
          suspended_at?: string | null;
          suspended_reason?: string | null;
          username_changed_at?: string | null;
          searchable?: boolean;
          allow_friend_requests?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          category_id: string;
          subcategory: string | null;
          question_text: string;
          answer_a: string;
          answer_b: string;
          answer_c: string;
          answer_d: string;
          correct_answer: Database['public']['Enums']['answer_key'];
          explanation: string;
          difficulty: Database['public']['Enums']['difficulty_level'];
          tags: string[];
          image_url: string | null;
          audio_url: string | null;
          status: Database['public']['Enums']['question_status'];
          requires_pro: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          category_id: string;
          subcategory?: string | null;
          question_text: string;
          answer_a: string;
          answer_b: string;
          answer_c: string;
          answer_d: string;
          correct_answer: Database['public']['Enums']['answer_key'];
          explanation?: string;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          tags?: string[];
          image_url?: string | null;
          audio_url?: string | null;
          status?: Database['public']['Enums']['question_status'];
          requires_pro?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          category_id?: string;
          subcategory?: string | null;
          question_text?: string;
          answer_a?: string;
          answer_b?: string;
          answer_c?: string;
          answer_d?: string;
          correct_answer?: Database['public']['Enums']['answer_key'];
          explanation?: string;
          difficulty?: Database['public']['Enums']['difficulty_level'];
          tags?: string[];
          image_url?: string | null;
          audio_url?: string | null;
          status?: Database['public']['Enums']['question_status'];
          requires_pro?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories_overview';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_attempts: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          quiz_session_id: string;
          selected_answer: Database['public']['Enums']['answer_key'];
          is_correct: boolean;
          response_time_ms: number;
          xp_earned: number;
          answered_on: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          quiz_session_id: string;
          selected_answer: Database['public']['Enums']['answer_key'];
          is_correct?: boolean;
          response_time_ms?: number;
          xp_earned?: number;
          answered_on?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_id?: string;
          quiz_session_id?: string;
          selected_answer?: Database['public']['Enums']['answer_key'];
          is_correct?: boolean;
          response_time_ms?: number;
          xp_earned?: number;
          answered_on?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_attempts_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_attempts_quiz_session_id_fkey';
            columns: ['quiz_session_id'];
            isOneToOne: false;
            referencedRelation: 'quiz_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      quiz_session_questions: {
        Row: {
          quiz_session_id: string;
          question_id: string;
          sort_position: number;
        };
        Insert: {
          quiz_session_id: string;
          question_id: string;
          sort_position: number;
        };
        Update: {
          quiz_session_id?: string;
          question_id?: string;
          sort_position?: number;
        };
        Relationships: [];
      };
      daily_question_payouts: {
        Row: {
          user_id: string;
          quiz_day: string;
          question_id: string;
          xp: number;
          was_correct: boolean;
          claimed_at: string;
        };
        Insert: {
          user_id: string;
          quiz_day: string;
          question_id: string;
          xp?: number;
          was_correct: boolean;
          claimed_at?: string;
        };
        Update: {
          user_id?: string;
          quiz_day?: string;
          question_id?: string;
          xp?: number;
          was_correct?: boolean;
          claimed_at?: string;
        };
        Relationships: [];
      };
      quiz_sessions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          session_type: Database['public']['Enums']['session_type'];
          mode: Database['public']['Enums']['quiz_mode'];
          started_at: string;
          completed_at: string | null;
          total_questions: number;
          correct_answers: number;
          xp_earned: number;
          created_at: string;
          question_set_enforced: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          session_type?: Database['public']['Enums']['session_type'];
          mode?: Database['public']['Enums']['quiz_mode'];
          started_at?: string;
          completed_at?: string | null;
          total_questions: number;
          correct_answers?: number;
          xp_earned?: number;
          created_at?: string;
          question_set_enforced?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          session_type?: Database['public']['Enums']['session_type'];
          mode?: Database['public']['Enums']['quiz_mode'];
          started_at?: string;
          completed_at?: string | null;
          total_questions?: number;
          correct_answers?: number;
          xp_earned?: number;
          created_at?: string;
          question_set_enforced?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'quiz_sessions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quiz_sessions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories_overview';
            referencedColumns: ['id'];
          },
        ];
      };
      user_progress: {
        Row: {
          user_id: string;
          total_xp: number;
          current_streak: number;
          longest_streak: number;
          last_active_date: string | null;
          total_questions_answered: number;
          total_correct_answers: number;
          total_sessions_completed: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          total_xp?: number;
          current_streak?: number;
          longest_streak?: number;
          last_active_date?: string | null;
          total_questions_answered?: number;
          total_correct_answers?: number;
          total_sessions_completed?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          total_xp?: number;
          current_streak?: number;
          longest_streak?: number;
          last_active_date?: string | null;
          total_questions_answered?: number;
          total_correct_answers?: number;
          total_sessions_completed?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      categories_overview: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          accent_color: string | null;
          sort_order: number;
          is_active: boolean;
          requires_pro: boolean;
          created_at: string;
          updated_at: string;
          published_question_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      answer_shared_question: {
        Args: { p_message_id: string; p_answer: Database['public']['Enums']['answer_key'] };
        Returns: boolean;
      };
      count_my_perfect_sessions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      count_my_wrong_questions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      create_duel: {
        Args: { p_friend_id: string; p_mode?: Database['public']['Enums']['quiz_mode'] };
        Returns: string;
      };
      duel_question_count: {
        Args: { p_mode: Database['public']['Enums']['quiz_mode'] };
        Returns: number;
      };
      decline_duel: {
        Args: { p_duel_id: string };
        Returns: boolean;
      };
      get_conversation: {
        Args: { p_friend_id: string; p_limit?: number };
        Returns: {
          id: string;
          sender_id: string;
          kind: Database['public']['Enums']['message_kind'];
          question_id: string | null;
          duel_id: string | null;
          created_at: string;
          answer: Json;
          duel: Json;
        }[];
      };
      get_daily_questions: {
        Args: { p_limit?: number };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      get_duel_questions: {
        Args: { p_duel_id: string };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      get_friend_profile: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      get_friend_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_config: Json;
          selected_frame: string | null;
          created_at: string;
        }[];
      };
      get_my_category_difficulty_stats: {
        Args: { p_category_id: string };
        Returns: { difficulty: Database['public']['Enums']['difficulty_level']; attempts: number; correct: number }[];
      };
      get_my_category_questions: {
        Args: { p_category_id: string; p_filter?: string };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      get_my_answer_stats: {
        Args: Record<PropertyKey, never>;
        Returns: { answered: number; correct: number }[];
      };
      count_my_duels: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_my_played_days: {
        Args: { p_days?: number };
        Returns: string[];
      };
      get_my_history: {
        Args: { p_days?: number };
        Returns: {
          bucket_start: string;
          answered: number;
          correct: number;
          wrong: number;
          sessions: number;
          perfect: number;
          duels: number;
          duels_won: number;
          duels_drawn: number;
          duels_lost: number;
        }[];
      };
      get_my_totals: {
        Args: { p_days?: number | null };
        Returns: {
          answered: number;
          correct: number;
          wrong: number;
          sessions: number;
          perfect: number;
          duels: number;
          longest_streak: number;
        }[];
      };
      get_my_accuracy_trend: {
        Args: { p_days?: number };
        Returns: {
          bucket_start: string;
          answered: number;
          correct: number;
          accuracy: number | null;
        }[];
      };
      get_my_daily_history: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          answered: number;
          correct: number;
          wrong: number;
          sessions: number;
          perfect: number;
          duels: number;
          duels_won: number;
          duels_drawn: number;
          duels_lost: number;
        }[];
      };
      get_duel: {
        Args: { p_duel_id: string };
        Returns: Json;
      };
      get_duel_record: {
        Args: { p_user_id: string };
        Returns: {
          played: number;
          won: number;
          drawn: number;
          lost: number;
        }[];
      };
      get_friend_mode_records: {
        Args: { p_user_id: string };
        Returns: {
          mode: Database['public']['Enums']['quiz_mode'];
          rounds: number;
          best_correct: number;
          best_answered: number;
          perfect_rounds: number;
        }[];
      };
      delete_my_account: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      is_suspended: {
        Args: { p_user_id?: string };
        Returns: boolean;
      };
      set_privacy_settings: {
        Args: { p_searchable: boolean; p_allow_friend_requests: boolean };
        Returns: undefined;
      };
      admin_suspend_user: {
        Args: { p_user_id: string; p_reason?: string };
        Returns: undefined;
      };
      admin_unsuspend_user: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      admin_reset_username: {
        Args: { p_user_id: string };
        Returns: string;
      };
      admin_set_report_status: {
        Args: { p_report_id: string; p_status: Database['public']['Enums']['report_status']; p_note?: string | null };
        Returns: undefined;
      };
      admin_list_user_reports: {
        Args: { p_status?: Database['public']['Enums']['report_status'] | null };
        Returns: {
          id: string;
          reason: Database['public']['Enums']['user_report_reason'];
          details: string;
          status: Database['public']['Enums']['report_status'];
          admin_note: string;
          created_at: string;
          reviewed_at: string | null;
          reporter_id: string;
          reporter_username: string;
          reported_id: string;
          reported_username: string;
          reported_suspended_at: string | null;
          reported_report_count: number;
        }[];
      };
      admin_list_question_reports: {
        Args: { p_status?: Database['public']['Enums']['report_status'] | null };
        Returns: {
          id: string;
          reason: Database['public']['Enums']['report_reason'];
          details: string;
          status: Database['public']['Enums']['report_status'];
          admin_note: string;
          created_at: string;
          reviewed_at: string | null;
          reporter_id: string;
          reporter_username: string;
          question_id: string;
          question_text: string;
          question_status: Database['public']['Enums']['question_status'];
          category_name: string;
          question_report_count: number;
        }[];
      };
      admin_set_question_report_status: {
        Args: { p_report_id: string; p_status: Database['public']['Enums']['report_status']; p_note?: string | null };
        Returns: undefined;
      };
      admin_dashboard_kpis: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_activity_history: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          sessions: number;
          answers: number;
          active_users: number;
          new_users: number;
        }[];
      };
      admin_top_categories: {
        Args: { p_days?: number; p_limit?: number };
        Returns: {
          category_id: string;
          name: string;
          slug: string;
          attempts: number;
          correct: number;
          accuracy: number;
          players: number;
        }[];
      };
      admin_hardest_questions: {
        Args: { p_min_attempts?: number; p_limit?: number };
        Returns: {
          question_id: string;
          question_text: string;
          category_name: string;
          difficulty: Database['public']['Enums']['difficulty_level'];
          attempts: number;
          correct: number;
          accuracy: number;
        }[];
      };
      admin_recent_users: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          created_at: string;
          total_xp: number;
          level: number;
          suspended: boolean;
        }[];
      };
      admin_list_users: {
        Args: {
          p_search?: string | null;
          p_status?: string | null;
          p_sort?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          role: Database['public']['Enums']['user_role'];
          created_at: string;
          last_sign_in_at: string | null;
          total_xp: number;
          level: number;
          current_streak: number;
          longest_streak: number;
          questions_answered: number;
          sessions_completed: number;
          accuracy: number;
          suspended_at: string | null;
          suspended_reason: string | null;
          report_count: number;
          total_count: number;
        }[];
      };
      admin_user_detail: {
        Args: { p_user_id: string };
        Returns: Json;
      };
      admin_question_stats: {
        Args: { p_ids: string[] };
        Returns: {
          question_id: string;
          attempts: number;
          correct: number;
          accuracy: number;
          open_reports: number;
          total_reports: number;
        }[];
      };
      admin_question_ids_by_signal: {
        Args: { p_signal: string; p_max_accuracy?: number; p_min_attempts?: number };
        Returns: string[];
      };
      admin_category_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category_id: string;
          questions_total: number;
          questions_published: number;
          questions_missing_image: number;
          questions_missing_audio: number;
          attempts: number;
          accuracy: number;
          players: number;
        }[];
      };
      admin_move_category: {
        Args: { p_category_id: string; p_direction: string };
        Returns: undefined;
      };
      admin_list_actions: {
        Args: { p_limit?: number };
        Returns: {
          id: string;
          kind: Database['public']['Enums']['admin_action_kind'];
          details: string;
          created_at: string;
          admin_username: string | null;
          target_user_id: string | null;
          target_username: string | null;
        }[];
      };
      admin_health_check: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_feature_flags: {
        Args: Record<PropertyKey, never>;
        Returns: { key: string; enabled: boolean }[];
      };
      admin_list_feature_flags: {
        Args: Record<PropertyKey, never>;
        Returns: {
          key: string;
          enabled: boolean;
          note: string;
          updated_at: string;
          updated_by_username: string | null;
        }[];
      };
      admin_set_feature_flag: {
        Args: { p_key: string; p_enabled: boolean | null; p_note?: string | null };
        Returns: undefined;
      };
      admin_set_daily_plan: {
        Args: { p_day: string; p_question_ids: string[] | null; p_note?: string | null };
        Returns: undefined;
      };
      admin_daily_overview: {
        Args: { p_back?: number; p_forward?: number };
        Returns: {
          day: string;
          planned_count: number;
          note: string;
          players: number;
          sessions: number;
          avg_accuracy: number;
          perfect_rounds: number;
        }[];
      };
      admin_daily_plan: {
        Args: { p_day: string };
        Returns: {
          sort_position: number;
          question_id: string;
          question_text: string;
          category_name: string;
          difficulty: Database['public']['Enums']['difficulty_level'];
          status: Database['public']['Enums']['question_status'];
        }[];
      };
      block_user: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      unblock_user: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      blocked_by_me: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
      is_blocked: {
        Args: { p_a: string; p_b: string };
        Returns: boolean;
      };
      get_my_blocks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_config: Json;
          created_at: string;
        }[];
      };
      get_my_mode_records: {
        Args: { p_exclude_session?: string | null };
        Returns: {
          mode: Database['public']['Enums']['quiz_mode'];
          rounds: number;
          best_correct: number;
          best_answered: number;
          perfect_rounds: number;
        }[];
      };
      get_my_daily_result_today: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_my_daily_session_today: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      get_my_difficulty_stats: {
        Args: Record<PropertyKey, never>;
        Returns: { difficulty: Database['public']['Enums']['difficulty_level']; attempts: number; correct: number }[];
      };
      get_my_daily_tasks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          task_key: string;
          target: number;
          progress: number;
          xp: number;
          claimed: boolean;
        }[];
      };
      claim_daily_task: {
        Args: { p_key: string };
        Returns: number;
      };
      get_my_daily_wheel: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      spin_daily_wheel: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      get_unread_counts: {
        Args: Record<PropertyKey, never>;
        Returns: {
          friend_id: string;
          unread: number;
        }[];
      };
      mark_conversation_read: {
        Args: { p_friend_id: string };
        Returns: undefined;
      };
      get_my_friends: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_config: Json;
          selected_frame: string | null;
          total_xp: number;
          friends_since: string | null;
        }[];
      };
      get_my_saved_questions: {
        Args: { p_limit?: number };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      get_my_session_questions: {
        Args: { p_session_id: string };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      get_my_wrong_questions: {
        Args: { p_limit?: number };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      is_repeated_daily: {
        Args: { p_session_id: string };
        Returns: boolean;
      };
      join_duel: {
        Args: { p_duel_id: string; p_session_id: string };
        Returns: undefined;
      };
      remove_friend: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      respond_friend_request: {
        Args: { p_friendship_id: string; p_accept: boolean };
        Returns: undefined;
      };
      search_users: {
        Args: { p_query: string; p_limit?: number };
        Returns: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_config: Json;
          selected_frame: string | null;
          friend_status: string;
        }[];
      };
      send_friend_request: {
        Args: { p_user_id: string };
        Returns: string;
      };
      send_question_to_friend: {
        Args: { p_friend_id: string; p_question_id: string };
        Returns: string;
      };
      set_profile_frame: {
        Args: { p_frame: string | null };
        Returns: undefined;
      };
      settle_duel: {
        Args: { p_duel_id: string };
        Returns: undefined;
      };
      apply_streak: {
        Args: {
          p_current_streak: number;
          p_longest_streak: number;
          p_last_active_date: string | null;
          p_today: string;
        };
        Returns: {
          current_streak: number;
          longest_streak: number;
          last_active_date: string | null;
        };
      };
      complete_quiz_session: {
        Args: { p_session_id: string };
        Returns: Json;
      };
      generate_username: {
        Args: { p_user_id: string };
        Returns: string;
      };
      get_admin_dashboard_stats: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_my_category_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category_id: string;
          category_slug: string;
          category_name: string;
          attempts: number;
          correct: number;
        }[];
      };
      get_my_topic_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          kind: string;
          key: string;
          label: string;
          attempts: number;
          correct: number;
        }[];
      };
      get_session_questions: {
        Args: { p_category_id?: string | null; p_limit?: number };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      get_training_questions: {
        Args: {
          p_subcategories?: string[];
          p_tags?: string[];
          p_category_ids?: string[];
          p_limit?: number;
        };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_username_available: {
        Args: { p_username: string };
        Returns: boolean;
      };
      start_daily_round: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      start_duel_round: {
        Args: { p_duel_id: string };
        Returns: Json;
      };
      submit_attempt: {
        Args: {
          p_session_id: string;
          p_question_id: string;
          p_answer: Database['public']['Enums']['answer_key'];
          p_response_time_ms?: number;
          p_answered_on?: string;
        };
        Returns: Json;
      };
      get_questions_for_chat: {
        Args: { p_question_ids: string[] };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      admin_question: {
        Args: { p_id: string };
        Returns: Database['public']['Tables']['questions']['Row'][];
      };
      admin_legacy_session_starts: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          session_type: Database['public']['Enums']['session_type'];
          sessions: number;
          users: number;
        }[];
      };
      require_active_user: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      require_signed_in_user: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      reset_my_progress: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      user_has_pro: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      xp_for_answer: {
        Args: { p_is_correct: boolean };
        Returns: number;
      };
      xp_for_session_completion: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      answer_key: 'A' | 'B' | 'C' | 'D';
      duel_status: 'pending' | 'active' | 'finished' | 'declined';
      friend_status: 'pending' | 'accepted' | 'declined';
      idea_area: 'questions' | 'quiz' | 'design' | 'progress' | 'other';
      message_kind: 'question' | 'duel';
      report_reason: 'wrong_answer' | 'wrong_question' | 'outdated' | 'typo' | 'unclear' | 'other';
      user_report_reason: 'username' | 'spam' | 'harassment' | 'cheating' | 'other';
      admin_action_kind:
        | 'suspend_user'
        | 'unsuspend_user'
        | 'reset_username'
        | 'resolve_report'
        | 'resolve_question_report'
        | 'note_report'
        | 'set_feature_flag'
        | 'plan_daily_quiz'
        | 'edit_question'
        | 'edit_category';
      report_status: 'open' | 'in_review' | 'reviewed' | 'rejected';
      difficulty_level: 'easy' | 'medium' | 'hard';
      question_status: 'draft' | 'review' | 'published' | 'archived';
      quiz_mode: 'classic' | 'blitz' | 'survival' | 'perfect';
      session_type: 'category' | 'random' | 'weakness' | 'daily' | 'duel' | 'exam';
      user_role: 'user' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> = (PublicSchema['Tables'] &
  PublicSchema['Views'])[T] extends { Row: infer R }
  ? R
  : never;

export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T] extends { Insert: infer I }
  ? I
  : never;

export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T] extends { Update: infer U }
  ? U
  : never;

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];

export type FunctionArgs<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Args'];
export type FunctionReturns<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Returns'];

export const Constants = {
  public: {
    Enums: {
      answer_key: ['A', 'B', 'C', 'D'],
      duel_status: ['pending', 'active', 'finished', 'declined'],
      friend_status: ['pending', 'accepted', 'declined'],
      idea_area: ['questions', 'quiz', 'design', 'progress', 'other'],
      message_kind: ['question', 'duel'],
      report_reason: ['wrong_answer', 'wrong_question', 'outdated', 'typo', 'unclear', 'other'],
      user_report_reason: ['username', 'spam', 'harassment', 'cheating', 'other'],
      admin_action_kind: [
        'suspend_user',
        'unsuspend_user',
        'reset_username',
        'resolve_report',
        'resolve_question_report',
        'note_report',
        'set_feature_flag',
        'plan_daily_quiz',
        'edit_question',
        'edit_category',
      ],
      report_status: ['open', 'in_review', 'reviewed', 'rejected'],
      difficulty_level: ['easy', 'medium', 'hard'],
      question_status: ['draft', 'review', 'published', 'archived'],
      quiz_mode: ['classic', 'blitz', 'survival', 'perfect'],
      session_type: ['category', 'random', 'weakness', 'daily', 'duel', 'exam'],
      user_role: ['user', 'admin'],
    },
  },
} as const;
