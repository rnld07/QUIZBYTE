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
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          role: Database['public']['Enums']['user_role'];
          is_anonymous: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['user_role'];
          is_anonymous?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: Database['public']['Enums']['user_role'];
          is_anonymous?: boolean;
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
      quiz_sessions: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          session_type: Database['public']['Enums']['session_type'];
          started_at: string;
          completed_at: string | null;
          total_questions: number;
          correct_answers: number;
          xp_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          session_type?: Database['public']['Enums']['session_type'];
          started_at?: string;
          completed_at?: string | null;
          total_questions: number;
          correct_answers?: number;
          xp_earned?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string | null;
          session_type?: Database['public']['Enums']['session_type'];
          started_at?: string;
          completed_at?: string | null;
          total_questions?: number;
          correct_answers?: number;
          xp_earned?: number;
          created_at?: string;
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
      difficulty_level: 'easy' | 'medium' | 'hard';
      question_status: 'draft' | 'review' | 'published' | 'archived';
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
      difficulty_level: ['easy', 'medium', 'hard'],
      question_status: ['draft', 'review', 'published', 'archived'],
      session_type: ['category', 'random', 'weakness', 'daily', 'duel', 'exam'],
      user_role: ['user', 'admin'],
    },
  },
} as const;
