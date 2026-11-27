BEGIN;

CREATE FUNCTION private.valid_task_tags(p_tags TEXT[])
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT cardinality(p_tags) <= 5
    AND (cardinality(p_tags) = 0 OR (array_ndims(p_tags) = 1 AND array_lower(p_tags, 1) = 1))
    AND count(*) = count(DISTINCT lower(tag COLLATE pg_catalog."und-x-icu"))
    AND count(*) = count(*) FILTER (WHERE char_length(tag) BETWEEN 1 AND 30 AND tag = btrim(tag,
      U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
    ))
  FROM unnest(p_tags) AS labels(tag);
$$;

ALTER TABLE public.tasks ADD COLUMN tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD CONSTRAINT tasks_tags_valid CHECK (private.valid_task_tags(tags));

-- Replace the signature to avoid an ambiguous PostgREST overload with default arguments.
DROP FUNCTION public.mutate_task(TEXT, UUID, UUID, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, TEXT, DATE, BOOLEAN, JSONB);

CREATE FUNCTION public.mutate_task(
  p_operation TEXT, p_project UUID, p_task UUID, p_version TIMESTAMPTZ DEFAULT NULL,
  p_column UUID DEFAULT NULL, p_before UUID DEFAULT NULL, p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL, p_priority TEXT DEFAULT NULL, p_due_date DATE DEFAULT NULL,
  p_hidden BOOLEAN DEFAULT NULL, p_description_content JSONB DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
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
    OR p_task IS NULL OR (p_tags IS NOT NULL AND (
      p_operation NOT IN ('create', 'edit') OR NOT private.valid_task_tags(p_tags)
    )) OR (p_operation IN ('create', 'edit') AND (
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

  IF current_task.is_system AND p_operation IN ('edit', 'archive')
  THEN RETURN 'invalid'; END IF;

  IF p_operation = 'archive' THEN
    UPDATE public.tasks SET archived_at = statement_timestamp() WHERE id = p_task;
    RETURN 'ok';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.columns WHERE id = p_column AND project_id = p_project)
  THEN RETURN 'invalid'; END IF;

  IF p_operation IN ('create', 'edit') AND p_description_content IS NOT NULL THEN
    IF ((jsonb_typeof(p_description_content) = 'object'
      AND p_description_content->>'type' = 'doc'
      AND jsonb_typeof(p_description_content->'content') = 'array'
      AND octet_length(p_description_content::TEXT) <= 250000) IS NOT TRUE)
    THEN RETURN 'invalid'; END IF;

    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_description_content->'content') AS node(value)
      WHERE node.value->>'type' = 'image' AND NOT EXISTS (
        SELECT 1 FROM public.project_assets a
        WHERE a.project_id = p_project AND a.task_id = p_task AND a.status = 'ready'
          AND a.id::TEXT = node.value #>> '{attrs,assetId}'
      )
    ) THEN RETURN 'invalid'; END IF;
  END IF;

  IF p_operation = 'create' OR p_operation = 'move' OR p_column <> current_task.column_id THEN
    SELECT coalesce(array_agg(id ORDER BY position, id), ARRAY[]::UUID[]) INTO ordered_ids
      FROM public.tasks WHERE project_id = p_project AND column_id = p_column
        AND archived_at IS NULL AND id <> p_task;
    target_index := CASE WHEN p_before IS NULL THEN cardinality(ordered_ids) + 1
      ELSE array_position(ordered_ids, p_before) END;
    IF target_index IS NULL THEN RETURN 'stale'; END IF;
  END IF;

  IF p_operation = 'create' THEN
    INSERT INTO public.tasks (id, project_id, column_id, title, description, description_content, priority, due_date, is_hidden, position, tags)
    VALUES (p_task, p_project, p_column, p_title, p_description, p_description_content, p_priority, p_due_date, p_hidden, target_index - 1, coalesce(p_tags, ARRAY[]::TEXT[]))
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN RETURN 'stale'; END IF;
  ELSIF p_operation = 'edit' THEN
    UPDATE public.tasks SET title = p_title, description = p_description, description_content = p_description_content, priority = p_priority,
      due_date = p_due_date, is_hidden = p_hidden, column_id = p_column,
      tags = coalesce(p_tags, current_task.tags),
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

REVOKE ALL ON FUNCTION public.mutate_task(TEXT, UUID, UUID, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, TEXT, DATE, BOOLEAN, JSONB, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_task(TEXT, UUID, UUID, TIMESTAMPTZ, UUID, UUID, TEXT, TEXT, TEXT, DATE, BOOLEAN, JSONB, TEXT[])
  TO authenticated;

COMMIT;
