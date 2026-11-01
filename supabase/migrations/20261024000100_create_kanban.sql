BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

-- Una única identidad, autorizada manualmente por el propietario mediante SQL.
CREATE TABLE private.administrator (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE private.administrator ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.administrator FROM PUBLIC, anon, authenticated;

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (
    char_length(slug) BETWEEN 1 AND 100
    AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  description TEXT CHECK (char_length(description) <= 5000),
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, project_id)
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  column_id UUID NOT NULL,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 10000),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tasks_column_project_fkey FOREIGN KEY (column_id, project_id)
    REFERENCES public.columns(id, project_id) ON DELETE CASCADE
);

CREATE INDEX projects_published_order_idx ON public.projects(is_published, position, id);
CREATE INDEX columns_project_order_idx ON public.columns(project_id, position, id);
CREATE INDEX tasks_project_order_idx ON public.tasks(project_id, position, id);
CREATE INDEX tasks_column_order_idx ON public.tasks(column_id, position, id);

CREATE FUNCTION private.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  new.created_at := old.created_at;
  new.updated_at := statement_timestamp();
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER columns_updated_at BEFORE UPDATE ON public.columns
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- La primera migración ya cierra el acceso antes de instalar políticas.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.projects, public.columns, public.tasks FROM PUBLIC, anon, authenticated;

COMMIT;
