BEGIN;

-- Include a plain-text excerpt on published hidden cards; preserve the existing grants.
CREATE OR REPLACE FUNCTION public.list_project_summaries()
RETURNS TABLE (
  id UUID, slug TEXT, name TEXT, description TEXT, status TEXT,
  is_hidden BOOLEAN, is_published BOOLEAN, "position" INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT p.id,
    CASE WHEN p.is_hidden THEN NULL ELSE p.slug END,
    p.name,
    left(p.description, 240),
    p.status, p.is_hidden, p.is_published, p.position
  FROM public.projects p
  WHERE p.is_published
  ORDER BY p.position, p.id;
$$;

COMMIT;
