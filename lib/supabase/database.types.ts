// Tipos del contrato SQL versionado. Regenerar con la CLI tras validar las migraciones.
type ProjectRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_published: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};
type ColumnRow = {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};
type TaskRow = {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};
type ProjectInsert = Pick<ProjectRow, "slug" | "name"> & Partial<Omit<ProjectRow, "slug" | "name">>;
type ColumnInsert = Pick<ColumnRow, "project_id" | "name"> & Partial<Omit<ColumnRow, "project_id" | "name">>;
type TaskInsert = Pick<TaskRow, "project_id" | "column_id" | "title"> & Partial<Omit<TaskRow, "project_id" | "column_id" | "title">>;

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: Partial<ProjectInsert>;
        Relationships: [];
      };
      columns: {
        Row: ColumnRow;
        Insert: ColumnInsert;
        Update: Partial<ColumnInsert>;
        Relationships: [{
          foreignKeyName: "columns_project_id_fkey";
          columns: ["project_id"];
          isOneToOne: false;
          referencedRelation: "projects";
          referencedColumns: ["id"];
        }];
      };
      tasks: {
        Row: TaskRow;
        Insert: TaskInsert;
        Update: Partial<TaskInsert>;
        Relationships: [{
          foreignKeyName: "tasks_project_id_fkey";
          columns: ["project_id"];
          isOneToOne: false;
          referencedRelation: "projects";
          referencedColumns: ["id"];
        }, {
          foreignKeyName: "tasks_column_project_fkey";
          columns: ["column_id", "project_id"];
          isOneToOne: false;
          referencedRelation: "columns";
          referencedColumns: ["id", "project_id"];
        }];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
