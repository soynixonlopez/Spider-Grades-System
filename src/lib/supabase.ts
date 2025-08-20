import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'professor' | 'student';
          passcode: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role: 'admin' | 'professor' | 'student';
          passcode: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'admin' | 'professor' | 'student';
          passcode?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      promotions: {
        Row: {
          id: string;
          name: string;
          cohort_code: string;
          entry_year: number;
          graduation_year: number;
          shift: 'AM' | 'PM';
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          cohort_code: string;
          entry_year: number;
          graduation_year: number;
          shift: 'AM' | 'PM';
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          cohort_code?: string;
          entry_year?: number;
          graduation_year?: number;
          shift?: 'AM' | 'PM';
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
                   subjects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          year: number;
          semester: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          year: number;
          semester: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          year?: number;
          semester?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      subject_promotions: {
        Row: {
          id: string;
          subject_id: string;
          promotion_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          promotion_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          promotion_id?: string;
          created_at?: string;
        };
      };
      professors: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          lastname: string;
          specialty: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          lastname: string;
          specialty: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          lastname?: string;
          specialty?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          lastname: string;
          promotion_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          lastname: string;
          promotion_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          lastname?: string;
          promotion_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      professor_subjects: {
        Row: {
          id: string;
          professor_id: string;
          subject_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          professor_id: string;
          subject_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          professor_id?: string;
          subject_id?: string;
          created_at?: string;
        };
      };
      grade_categories: {
        Row: {
          id: string;
          name: string;
          weight: number;
          subject_id: string;
          promotion_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          weight: number;
          subject_id: string;
          promotion_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          weight?: number;
          subject_id?: string;
          promotion_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      grades: {
        Row: {
          id: string;
          student_id: string;
          category_id: string;
          grade: number;
          comments: string | null;
          last_editor_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          category_id: string;
          grade: number;
          comments?: string | null;
          last_editor_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          category_id?: string;
          grade?: number;
          comments?: string | null;
          last_editor_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
