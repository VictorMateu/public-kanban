BEGIN;

ALTER TABLE public.columns ADD COLUMN stage TEXT;

-- Preserve existing column IDs and task references. Stop for an ambiguous board
-- so its owner can decide the mapping instead of losing or guessing a state.
UPDATE public.columns SET stage = CASE lower(btrim(name))
  WHEN 'backlog' THEN 'todo' WHEN 'to do' THEN 'todo' WHEN 'todo' THEN 'todo'
  WHEN 'por hacer' THEN 'todo' WHEN 'per fer' THEN 'todo'
  WHEN 'in progress' THEN 'in_progress' WHEN 'en curso' THEN 'in_progress' WHEN 'en curs' THEN 'in_progress'
  WHEN 'review' THEN 'review' WHEN 'in review' THEN 'review'
  WHEN 'en revisión' THEN 'review' WHEN 'en revisió' THEN 'review'
  WHEN 'done' THEN 'done' WHEN 'hecho' THEN 'done' WHEN 'fet' THEN 'done'
END;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.columns WHERE stage IS NULL)
    OR EXISTS (SELECT 1 FROM public.columns GROUP BY project_id, stage HAVING count(*) > 1)
  THEN
    RAISE EXCEPTION 'Map unrecognized or duplicate project columns before applying task management';
  END IF;
END;
$$;

ALTER TABLE public.columns ALTER COLUMN stage SET NOT NULL,
  ADD CONSTRAINT columns_stage_valid CHECK (stage IN ('todo', 'in_progress', 'review', 'done')),
  ADD CONSTRAINT columns_project_stage_key UNIQUE (project_id, stage);

CREATE FUNCTION private.ensure_project_columns(p_project UUID)
RETURNS VOID LANGUAGE SQL SET search_path = '' AS $$
  INSERT INTO public.columns (project_id, stage, name, position)
  VALUES (p_project, 'todo', 'To do', 0), (p_project, 'in_progress', 'In progress', 1),
    (p_project, 'review', 'In review', 2), (p_project, 'done', 'Done', 3)
  ON CONFLICT (project_id, stage) DO UPDATE SET position = excluded.position
    WHERE public.columns.position <> excluded.position;
$$;
REVOKE ALL ON FUNCTION private.ensure_project_columns(UUID) FROM PUBLIC, anon, authenticated;

SELECT private.ensure_project_columns(id) FROM public.projects;

CREATE FUNCTION private.initialize_project_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.ensure_project_columns(new.id);
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.initialize_project_columns() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER projects_initialize_columns AFTER INSERT ON public.projects
FOR EACH ROW EXECUTE FUNCTION private.initialize_project_columns();

ALTER TABLE public.tasks ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN completed_on DATE;

ALTER POLICY tasks_published_read ON public.tasks USING (
  NOT is_hidden AND archived_at IS NULL AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = tasks.project_id AND p.is_published AND NOT p.is_hidden
  )
);
REVOKE INSERT, UPDATE, DELETE ON public.columns, public.tasks FROM authenticated;

CREATE FUNCTION private.set_task_completion()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (SELECT stage FROM public.columns WHERE id = new.column_id) <> 'done' THEN
    new.completed_on := NULL;
  ELSIF tg_op = 'INSERT' THEN
    new.completed_on := (statement_timestamp() AT TIME ZONE 'UTC')::DATE;
  ELSIF new.column_id <> old.column_id THEN
    new.completed_on := (statement_timestamp() AT TIME ZONE 'UTC')::DATE;
  ELSE
    new.completed_on := old.completed_on;
  END IF;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.set_task_completion() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER tasks_set_completion BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION private.set_task_completion();

CREATE FUNCTION public.mutate_task(
  p_operation TEXT, p_project UUID, p_task UUID, p_version TIMESTAMPTZ DEFAULT NULL,
  p_column UUID DEFAULT NULL, p_before UUID DEFAULT NULL, p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL, p_priority TEXT DEFAULT NULL, p_due_date DATE DEFAULT NULL,
  p_hidden BOOLEAN DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  current_task public.tasks%ROWTYPE;
  ordered_ids UUID[];
  target_index INTEGER;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_operation IS NULL OR p_operation NOT IN ('create', 'edit', 'move', 'archive')
    OR p_task IS NULL OR (p_operation IN ('create', 'edit') AND (
      p_title IS NULL OR p_title !~ '[^[:space:]]' OR p_hidden IS NULL
    ))
  THEN RETURN 'invalid'; END IF;

  -- Serialize placement and edits within a board, including into empty columns.
  PERFORM 1 FROM public.projects WHERE id = p_project FOR UPDATE;
  IF NOT FOUND THEN RETURN 'stale'; END IF;

  SELECT * INTO current_task FROM public.tasks WHERE id = p_task AND project_id = p_project;
  IF p_operation = 'create' THEN
    IF current_task.id IS NOT NULL THEN
      IF current_task.archived_at IS NULL THEN RETURN 'ok'; END IF;
      RETURN 'stale';
    END IF;
  ELSIF current_task.id IS NULL OR current_task.archived_at IS NOT NULL
    OR current_task.updated_at IS DISTINCT FROM p_version
  THEN RETURN 'stale'; END IF;

  IF p_operation = 'archive' THEN
    UPDATE public.tasks SET archived_at = statement_timestamp() WHERE id = p_task;
    RETURN 'ok';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.columns WHERE id = p_column AND project_id = p_project)
  THEN RETURN 'invalid'; END IF;

  IF p_operation = 'create' OR p_operation = 'move' OR p_column <> current_task.column_id THEN
    SELECT coalesce(array_agg(id ORDER BY position, id), ARRAY[]::UUID[]) INTO ordered_ids
      FROM public.tasks WHERE project_id = p_project AND column_id = p_column
        AND archived_at IS NULL AND id <> p_task;
    target_index := CASE WHEN p_before IS NULL THEN cardinality(ordered_ids) + 1
      ELSE array_position(ordered_ids, p_before) END;
    IF target_index IS NULL THEN RETURN 'stale'; END IF;
  END IF;

  IF p_operation = 'create' THEN
    INSERT INTO public.tasks (id, project_id, column_id, title, description, priority, due_date, is_hidden, position)
    VALUES (p_task, p_project, p_column, p_title, p_description, p_priority, p_due_date, p_hidden, target_index - 1)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN RETURN 'stale'; END IF;
  ELSIF p_operation = 'edit' THEN
    UPDATE public.tasks SET title = p_title, description = p_description, priority = p_priority,
      due_date = p_due_date, is_hidden = p_hidden, column_id = p_column,
      position = coalesce(target_index - 1, position)
    WHERE id = p_task;
  ELSE
    UPDATE public.tasks SET column_id = p_column, position = target_index - 1
    WHERE id = p_task AND (column_id, position) IS DISTINCT FROM (p_column, target_index - 1);
  END IF;

  IF target_index IS NOT NULL THEN
    UPDATE public.tasks t SET position = (ordered.ordinal - 1 + (ordered.ordinal >= target_index)::INTEGER)::INTEGER
    FROM unnest(ordered_ids) WITH ORDINALITY AS ordered(id, ordinal)
    WHERE t.id = ordered.id AND t.position <> ordered.ordinal - 1 + (ordered.ordinal >= target_index)::INTEGER;
  END IF;
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.mutate_task(TEXT, UUID, UUID, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, TEXT, DATE, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_task(TEXT, UUID, UUID, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, TEXT, DATE, BOOLEAN)
  TO authenticated;

COMMIT;
