BEGIN;

ALTER TABLE public.projects
  ADD COLUMN description_content JSONB,
  ADD COLUMN objectives_content JSONB,
  ADD COLUMN repository_url TEXT,
  ADD CONSTRAINT projects_description_content CHECK (
    description_content IS NULL OR (
      jsonb_typeof(description_content) = 'object'
      AND description_content->>'type' = 'doc'
      AND jsonb_typeof(description_content->'content') = 'array'
      AND octet_length(description_content::TEXT) <= 250000
    ) IS TRUE
  ),
  ADD CONSTRAINT projects_objectives_content CHECK (
    objectives_content IS NULL OR (
      jsonb_typeof(objectives_content) = 'object'
      AND objectives_content->>'type' = 'doc'
      AND jsonb_typeof(objectives_content->'content') = 'array'
      AND octet_length(objectives_content::TEXT) <= 250000
    ) IS TRUE
  ),
  ADD CONSTRAINT projects_repository_url CHECK (
    repository_url IS NULL OR (
      char_length(repository_url) <= 2048
      AND repository_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'
    )
  );

-- Keep content and timestamps; the additive backfill is not an owner edit.
ALTER TABLE public.projects DISABLE TRIGGER projects_updated_at;
UPDATE public.projects
SET description_content = jsonb_build_object(
  'type', 'doc', 'content', jsonb_build_array(jsonb_build_object(
    'type', 'paragraph', 'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', description))
  ))
)
WHERE description IS NOT NULL AND description <> '';
ALTER TABLE public.projects ENABLE TRIGGER projects_updated_at;

CREATE TABLE public.project_assets (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  object_path TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready')),
  mime_type TEXT NOT NULL DEFAULT 'image/webp' CHECK (mime_type = 'image/webp'),
  byte_size INTEGER NOT NULL CHECK (byte_size BETWEEN 1 AND 2097152),
  width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 4096),
  height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 4096),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_assets_path CHECK (object_path = project_id::TEXT || '/' || id::TEXT || '.webp')
);
CREATE INDEX project_assets_project_id_idx ON public.project_assets(project_id);
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_assets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.project_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_assets TO authenticated;

CREATE POLICY project_assets_admin_all ON public.project_assets
FOR ALL TO authenticated
USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY project_assets_published_read ON public.project_assets
FOR SELECT TO anon, authenticated USING (
  status = 'ready' AND EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_assets.project_id AND p.is_published
    AND (p.description_content @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', project_assets.id::TEXT))))
      OR p.objectives_content @> jsonb_build_object('content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', project_assets.id::TEXT)))))
  )
);

-- Fail closed on Storage versions that cannot distinguish downloads from URL signing.
DO $$
BEGIN
  IF to_regprocedure('storage.allow_only_operation(text)') IS NULL THEN
    RAISE EXCEPTION 'Operation-aware Storage helpers are required for project images';
  END IF;
END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('project-images', 'project-images', FALSE, 2097152, ARRAY['image/webp']);

CREATE POLICY project_images_download ON storage.objects
FOR SELECT TO anon, authenticated USING (
  bucket_id = 'project-images'
  AND storage.allow_only_operation('object.get_authenticated')
  AND EXISTS (SELECT 1 FROM public.project_assets a WHERE a.object_path = storage.objects.name AND a.status = 'ready')
);

CREATE POLICY project_images_admin_insert ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'project-images' AND (SELECT public.is_admin())
  AND EXISTS (SELECT 1 FROM public.project_assets a WHERE a.object_path = storage.objects.name AND a.status = 'pending')
);

-- SELECT is also required by the Storage deletion API; it grants no signing/listing path.
CREATE POLICY project_images_admin_remove_select ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'project-images' AND (SELECT public.is_admin())
  AND storage.allow_any_operation(ARRAY['object.delete', 'object.delete_many'])
);
CREATE POLICY project_images_admin_remove ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'project-images' AND (SELECT public.is_admin()));

COMMIT;
