/**
 * Database type definitions for Supabase.
 *
 * These types mirror the PostgreSQL schema and provide type safety
 * when interacting with the Supabase client.
 */

export type TaskStatus = 'planning' | 'in-progress' | 'completed';
export type TaskCategory = 'seed-pro' | 'agronomy' | 'sales' | 'testing' | 'samples';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Database {
  public: {
    Tables: {
      team_members: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          initials: string;
          avatar_color: string;
          email: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          initials: string;
          avatar_color: string;
          email?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          initials?: string;
          avatar_color?: string;
          email?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          category: TaskCategory;
          priority: TaskPriority;
          assignee_id: string | null;
          due_date: string | null;
          order: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status: TaskStatus;
          category: TaskCategory;
          priority: TaskPriority;
          assignee_id?: string | null;
          due_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          category?: TaskCategory;
          priority?: TaskPriority;
          assignee_id?: string | null;
          due_date?: string | null;
          order?: number;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'team_members';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      task_status: TaskStatus;
      task_category: TaskCategory;
      task_priority: TaskPriority;
    };
  };
}

/**
 * Type alias for a team member row from the database.
 */
export type DbTeamMember = Database['public']['Tables']['team_members']['Row'];

/**
 * Type alias for a task row from the database.
 */
export type DbTask = Database['public']['Tables']['tasks']['Row'];

/**
 * Error log severity levels.
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Error log row from the database.
 */
export interface DbErrorLog {
  id: string;
  user_id: string | null;
  severity: ErrorSeverity;
  message: string;
  context: Record<string, unknown>;
  stack_trace: string | null;
  url: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Insert type for error logs.
 */
export interface DbErrorLogInsert {
  user_id?: string | null;
  severity?: ErrorSeverity;
  message: string;
  context?: Record<string, unknown>;
  stack_trace?: string | null;
  url?: string | null;
  user_agent?: string | null;
}
