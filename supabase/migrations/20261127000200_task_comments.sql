BEGIN;

CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  body JSONB NOT NULL CHECK ((
    jsonb_typeof(body) = 'object' AND body->>'type' = 'doc'
    AND jsonb_typeof(body->'content') = 'array' AND octet_length(body::TEXT) <= 250000
  ) IS TRUE),
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp()
);

CREATE INDEX task_comments_task_history_idx ON public.task_comments (task_id, created_at, id);
CREATE TRIGGER task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.task_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.task_comments TO anon, authenticated;

CREATE POLICY task_comments_admin_read ON public.task_comments FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));
CREATE POLICY task_comments_published_read ON public.task_comments FOR SELECT TO anon, authenticated
  USING (is_public AND EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = task_comments.task_id AND NOT t.is_hidden AND t.archived_at IS NULL
      AND p.is_published AND NOT p.is_hidden
  ));

-- The editor reserves a comment UUID before saving. Uploads without a referencing
-- comment stay private, including after a comment is deleted.
ALTER TABLE public.project_assets ADD COLUMN comment_id UUID,
  ADD CONSTRAINT project_assets_exclusive_editor_scope CHECK (task_id IS NULL OR comment_id IS NULL);
CREATE INDEX project_assets_comment_scope_idx ON public.project_assets (comment_id, project_id)
  WHERE comment_id IS NOT NULL;

ALTER POLICY project_assets_published_read ON public.project_assets USING (
  status = 'ready' AND (
    (task_id IS NULL AND comment_id IS NULL AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_assets.project_id AND p.is_published AND NOT p.is_hidden
        AND (p.description_content @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', project_assets.id::TEXT))))
          OR p.objectives_content @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', project_assets.id::TEXT)))))
    )) OR (task_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = project_assets.task_id AND t.project_id = project_assets.project_id
        AND NOT t.is_hidden AND t.archived_at IS NULL AND p.is_published AND NOT p.is_hidden
        AND t.description_content @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', project_assets.id::TEXT))))
    )) OR (comment_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.task_comments c
      JOIN public.tasks t ON t.id = c.task_id
      JOIN public.projects p ON p.id = t.project_id
      WHERE c.id = project_assets.comment_id AND t.project_id = project_assets.project_id
        AND c.is_public AND NOT t.is_hidden AND t.archived_at IS NULL AND p.is_published AND NOT p.is_hidden
        AND c.body @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', project_assets.id::TEXT))))
    ))
  )
);

CREATE FUNCTION public.mutate_task_comment(
  p_operation TEXT, p_project UUID, p_task UUID, p_comment UUID,
  p_version TIMESTAMPTZ DEFAULT NULL, p_body JSONB DEFAULT NULL, p_public BOOLEAN DEFAULT FALSE
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  current_comment public.task_comments%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_operation IS NULL OR p_operation NOT IN ('create', 'edit', 'delete') OR p_comment IS NULL
  THEN RETURN 'invalid'; END IF;

  -- Serialize against task archival and concurrent changes within the task.
  PERFORM 1 FROM public.tasks
    WHERE id = p_task AND project_id = p_project AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN 'stale'; END IF;

  SELECT * INTO current_comment FROM public.task_comments WHERE id = p_comment AND task_id = p_task;
  IF p_operation <> 'create' AND
    (current_comment.id IS NULL OR current_comment.updated_at IS DISTINCT FROM p_version)
  THEN RETURN 'stale'; END IF;
  IF p_operation = 'delete' THEN
    DELETE FROM public.task_comments WHERE id = p_comment;
    RETURN 'ok';
  END IF;

  IF ((jsonb_typeof(p_body) = 'object' AND p_body->>'type' = 'doc'
    AND jsonb_typeof(p_body->'content') = 'array' AND octet_length(p_body::TEXT) <= 250000
    AND p_public IS NOT NULL) IS NOT TRUE)
  THEN RETURN 'invalid'; END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_body->'content') AS node(value)
    WHERE node.value->>'type' = 'image' AND NOT EXISTS (
      SELECT 1 FROM public.project_assets a
      WHERE a.project_id = p_project AND a.comment_id = p_comment AND a.status = 'ready'
        AND a.id::TEXT = node.value #>> '{attrs,assetId}'
    )
  ) THEN RETURN 'invalid'; END IF;

  IF p_operation = 'create' THEN
    IF current_comment.id IS NOT NULL THEN
      IF current_comment.body = p_body AND current_comment.is_public = p_public THEN RETURN 'ok'; END IF;
      RETURN 'stale';
    END IF;
    INSERT INTO public.task_comments (id, task_id, body, is_public)
    VALUES (p_comment, p_task, p_body, p_public)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN RETURN 'stale'; END IF;
  ELSE
    UPDATE public.task_comments SET body = p_body, is_public = p_public WHERE id = p_comment;
  END IF;
  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.mutate_task_comment(TEXT, UUID, UUID, UUID, TIMESTAMPTZ, JSONB, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mutate_task_comment(TEXT, UUID, UUID, UUID, TIMESTAMPTZ, JSONB, BOOLEAN)
  TO authenticated;

COMMIT;
