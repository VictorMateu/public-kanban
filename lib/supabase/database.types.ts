// Generated from the local migrated public schema with Supabase CLI 2.122.0.
export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    "public": {
        Tables: {
            "columns": {
                Row: {
                    "created_at": string;
                    "id": string;
                    "name": string;
                    "position": number;
                    "project_id": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "id"?: string;
                    "name": string;
                    "position"?: number;
                    "project_id": string;
                    "updated_at"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "id"?: string;
                    "name"?: string;
                    "position"?: number;
                    "project_id"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "columns_project_id_fkey";
                        columns: [
                            "project_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "project_assets": {
                Row: {
                    "byte_size": number;
                    "created_at": string;
                    "height": number;
                    "id": string;
                    "mime_type": string;
                    "object_path": string;
                    "project_id": string;
                    "status": string;
                    "width": number;
                };
                ComputedFields: never;
                Insert: {
                    "byte_size": number;
                    "created_at"?: string;
                    "height": number;
                    "id": string;
                    "mime_type"?: string;
                    "object_path": string;
                    "project_id": string;
                    "status"?: string;
                    "width": number;
                };
                Update: {
                    "byte_size"?: number;
                    "created_at"?: string;
                    "height"?: number;
                    "id"?: string;
                    "mime_type"?: string;
                    "object_path"?: string;
                    "project_id"?: string;
                    "status"?: string;
                    "width"?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "project_assets_project_id_fkey";
                        columns: [
                            "project_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "projects": {
                Row: {
                    "created_at": string;
                    "description": string | null;
                    "description_content": Json | null;
                    "id": string;
                    "is_published": boolean;
                    "name": string;
                    "objectives_content": Json | null;
                    "position": number;
                    "repository_url": string | null;
                    "slug": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "created_at"?: string;
                    "description"?: string | null;
                    "description_content"?: Json | null;
                    "id"?: string;
                    "is_published"?: boolean;
                    "name": string;
                    "objectives_content"?: Json | null;
                    "position"?: number;
                    "repository_url"?: string | null;
                    "slug": string;
                    "updated_at"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "description"?: string | null;
                    "description_content"?: Json | null;
                    "id"?: string;
                    "is_published"?: boolean;
                    "name"?: string;
                    "objectives_content"?: Json | null;
                    "position"?: number;
                    "repository_url"?: string | null;
                    "slug"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                ];
            };
            "tasks": {
                Row: {
                    "column_id": string;
                    "created_at": string;
                    "description": string | null;
                    "due_date": string | null;
                    "id": string;
                    "position": number;
                    "priority": string | null;
                    "project_id": string;
                    "title": string;
                    "updated_at": string;
                };
                ComputedFields: never;
                Insert: {
                    "column_id": string;
                    "created_at"?: string;
                    "description"?: string | null;
                    "due_date"?: string | null;
                    "id"?: string;
                    "position"?: number;
                    "priority"?: string | null;
                    "project_id": string;
                    "title": string;
                    "updated_at"?: string;
                };
                Update: {
                    "column_id"?: string;
                    "created_at"?: string;
                    "description"?: string | null;
                    "due_date"?: string | null;
                    "id"?: string;
                    "position"?: number;
                    "priority"?: string | null;
                    "project_id"?: string;
                    "title"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "tasks_column_project_fkey";
                        columns: [
                            "column_id",
                            "project_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "columns";
                        referencedColumns: [
                            "id",
                            "project_id"
                        ];
                    },
                    {
                        foreignKeyName: "tasks_project_id_fkey";
                        columns: [
                            "project_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "projects";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            "is_admin": {
                Args: Record<PropertyKey, never>;
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
type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];
export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]) : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
    Row: infer R;
} ? R : never : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
} ? R : never : never;
export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
} ? I : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I;
} ? I : never : never;
export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
} ? U : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
} ? U : never : never;
export type Enums<DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | {
    schema: keyof DatabaseWithoutInternals;
}, EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;
export type CompositeTypes<PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | {
    schema: keyof DatabaseWithoutInternals;
}, CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never;
export const Constants = {
    "public": {
        Enums: {}
    }
} as const;
