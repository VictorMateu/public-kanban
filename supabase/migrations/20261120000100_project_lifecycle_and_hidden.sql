BEGIN;

ALTER TABLE public.projects
  ADD COLUMN status TEXT NOT NULL DEFAULT 'development'
    CHECK (status IN ('development', 'maintenance', 'completed', 'cancelled')),
  ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN cancellation_reason TEXT,
  ADD CONSTRAINT projects_cancellation_reason_length CHECK (
    cancellation_reason IS NULL OR char_length(cancellation_reason) <= 2000
  ),
  ADD CONSTRAINT projects_cancelled_reason_required CHECK (
    status <> 'cancelled' OR (
      cancellation_reason IS NOT NULL
      AND cancellation_reason ~ '[^[:space:]]'
    )
  );

-- Listing access must not grant access to hidden project content.
ALTER POLICY projects_published_read ON public.projects
  USING (is_published AND NOT is_hidden);
ALTER POLICY columns_published_read ON public.columns USING (
  EXISTS (SELECT 1 FROM public.projects p
    WHERE p.id = columns.project_id AND p.is_published AND NOT p.is_hidden)
);
ALTER POLICY tasks_published_read ON public.tasks USING (
  EXISTS (SELECT 1 FROM public.projects p
    WHERE p.id = tasks.project_id AND p.is_published AND NOT p.is_hidden)
);
ALTER POLICY project_assets_published_read ON public.project_assets USING (
  status = 'ready' AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_assets.project_id AND p.is_published AND NOT p.is_hidden
      AND (p.description_content @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', project_assets.id::TEXT))))
        OR p.objectives_content @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', project_assets.id::TEXT)))))
  )
);

-- Only this fixed projection bypasses project RLS. Never return private content.
CREATE FUNCTION public.list_project_summaries()
RETURNS TABLE (
  id UUID, slug TEXT, name TEXT, description TEXT, status TEXT,
  is_hidden BOOLEAN, is_published BOOLEAN, "position" INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id,
    CASE WHEN p.is_hidden THEN NULL ELSE p.slug END,
    p.name,
    CASE WHEN p.is_hidden THEN NULL ELSE left(p.description, 240) END,
    p.status, p.is_hidden, p.is_published, p.position
  FROM public.projects p
  WHERE p.is_published
  ORDER BY p.position, p.id;
$$;
REVOKE ALL ON FUNCTION public.list_project_summaries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_project_summaries() TO anon, authenticated;

-- Cancellation replaces deletion. Privileged maintenance is outside application access.
REVOKE DELETE ON public.projects FROM authenticated;

COMMIT;
