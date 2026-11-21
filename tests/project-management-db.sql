-- Local populated-database-safe test: unique fixtures, no users, full rollback.
BEGIN;
SET LOCAL statement_timeout = '15s';
CREATE FUNCTION pg_temp.assert_true(actual BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM TRUE THEN RAISE EXCEPTION '%', message; END IF;
END;
$$;
SELECT set_config('test.lifecycle_admin', (SELECT user_id::TEXT FROM private.administrator), TRUE);
CREATE TEMP TABLE lifecycle_fixtures (
  id UUID DEFAULT gen_random_uuid(), asset_id UUID DEFAULT gen_random_uuid(),
  published BOOLEAN, hidden BOOLEAN
) ON COMMIT DROP;
INSERT INTO lifecycle_fixtures (published, hidden) VALUES (TRUE,FALSE),(TRUE,TRUE),(FALSE,FALSE),(FALSE,TRUE);
GRANT SELECT ON lifecycle_fixtures TO anon, authenticated;
INSERT INTO public.projects (id, slug, name, description, is_published, is_hidden, repository_url)
SELECT id, 'lifecycle-db-' || id::TEXT, 'Lifecycle fixture', repeat(chr(127793),240) || 'Private description tail ' || id::TEXT,
  published, hidden, 'https://example.com/private-repository' FROM lifecycle_fixtures;
INSERT INTO public.columns (id, project_id, name) SELECT id, id, 'Private column' FROM lifecycle_fixtures;
INSERT INTO public.tasks (project_id, column_id, title) SELECT id, id, 'Private task' FROM lifecycle_fixtures;
INSERT INTO public.project_assets (id, project_id, object_path, status, byte_size, width, height)
SELECT asset_id, id, id::TEXT || '/' || asset_id::TEXT || '.webp', 'ready', 1, 1, 1 FROM lifecycle_fixtures;
UPDATE public.projects p SET description_content = jsonb_build_object('type','doc','content',jsonb_build_array(jsonb_build_object('type','image','attrs',jsonb_build_object('assetId',f.asset_id::TEXT,'alt','Private image'))))
FROM lifecycle_fixtures f WHERE p.id = f.id;
INSERT INTO storage.objects (bucket_id, name)
SELECT 'project-images', id::TEXT || '/' || asset_id::TEXT || '.webp' FROM lifecycle_fixtures;

DO $$
DECLARE fixture UUID; next_status TEXT; blank_reason TEXT;
BEGIN
  SELECT id INTO fixture FROM lifecycle_fixtures LIMIT 1;
  PERFORM pg_temp.assert_true((SELECT bool_and(status = 'development' AND cancellation_reason IS NULL) FROM public.projects WHERE id IN (SELECT id FROM lifecycle_fixtures)), 'New projects default to active');
  BEGIN
    UPDATE public.projects SET status = 'archived' WHERE id = fixture;
    RAISE EXCEPTION 'Unknown status accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  FOREACH next_status IN ARRAY ARRAY['development','maintenance','completed','cancelled'] LOOP
    UPDATE public.projects SET status = next_status, cancellation_reason = 'Changed priorities' WHERE id = fixture;
  END LOOP;
  FOREACH blank_reason IN ARRAY ARRAY[E' \t\n', chr(160), chr(65279)] LOOP
    BEGIN
      UPDATE public.projects SET cancellation_reason = blank_reason WHERE id = fixture;
      RAISE EXCEPTION 'Blank cancellation reason accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
  BEGIN
    UPDATE public.projects SET cancellation_reason = NULL WHERE id = fixture;
    RAISE EXCEPTION 'Missing cancellation reason accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.projects SET cancellation_reason = repeat(chr(127793),2000) WHERE id = fixture;
  BEGIN
    UPDATE public.projects SET cancellation_reason = repeat('x',2001) WHERE id = fixture;
    RAISE EXCEPTION 'Oversized cancellation reason accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.projects SET status = 'development' WHERE id = fixture;
  PERFORM pg_temp.assert_true((SELECT char_length(cancellation_reason) = 2000 FROM public.projects WHERE id = fixture), 'Reopening retains the reason');
END;
$$;

SET LOCAL ROLE anon;
SELECT set_config('storage.operation','storage.object.get_authenticated',TRUE);
DO $$
BEGIN
  PERFORM pg_temp.assert_true((SELECT count(*) = 2 FROM public.list_project_summaries() WHERE id IN (SELECT id FROM lifecycle_fixtures)), 'Both published cards are listed');
  PERFORM pg_temp.assert_true((SELECT bool_and(slug IS NULL AND description = repeat(chr(127793),240) AND is_published) FROM public.list_project_summaries() WHERE is_hidden AND id IN (SELECT id FROM lifecycle_fixtures)), 'Hidden summaries contain a 240-character excerpt without a slug');
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.projects WHERE id IN (SELECT id FROM lifecycle_fixtures)), 'Only published nonhidden full projects are public');
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.columns WHERE project_id IN (SELECT id FROM lifecycle_fixtures)), 'Hidden columns remain private');
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.tasks WHERE project_id IN (SELECT id FROM lifecycle_fixtures)), 'Hidden tasks remain private');
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.project_assets WHERE project_id IN (SELECT id FROM lifecycle_fixtures)), 'Hidden asset metadata remains private');
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM storage.objects WHERE name IN (SELECT id::TEXT || '/' || asset_id::TEXT || '.webp' FROM lifecycle_fixtures)), 'Direct hidden Storage downloads denied');
END;
$$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',gen_random_uuid()::TEXT,TRUE);
DO $$
BEGIN
  PERFORM pg_temp.assert_true(NOT public.is_admin(), 'Unassigned identity is not an administrator');
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.projects WHERE id IN (SELECT id FROM lifecycle_fixtures)), 'Nonowner identity cannot bypass hidden access');
  PERFORM pg_temp.assert_true((SELECT count(*) = 2 FROM public.list_project_summaries() WHERE id IN (SELECT id FROM lifecycle_fixtures)), 'Nonowner sees only public summaries');
END;
$$;
SELECT set_config('request.jwt.claim.sub',current_setting('test.lifecycle_admin'),TRUE);
DO $$
BEGIN
  PERFORM pg_temp.assert_true(public.is_admin(), 'Existing administrator is authorized');
  PERFORM pg_temp.assert_true((SELECT count(*) = 4 FROM public.projects WHERE id IN (SELECT id FROM lifecycle_fixtures)), 'Owner sees every visibility combination');
  PERFORM pg_temp.assert_true((SELECT count(*) = 4 FROM storage.objects WHERE name IN (SELECT id::TEXT || '/' || asset_id::TEXT || '.webp' FROM lifecycle_fixtures)), 'Owner can preview hidden and draft images');
  UPDATE public.projects SET status = 'cancelled', cancellation_reason = 'Owner cancellation' WHERE id IN (SELECT id FROM lifecycle_fixtures);
  BEGIN
    DELETE FROM public.projects WHERE id IN (SELECT id FROM lifecycle_fixtures);
    RAISE EXCEPTION 'Owner project DELETE unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM pg_temp.assert_true((SELECT count(*) = 4 FROM public.tasks WHERE project_id IN (SELECT id FROM lifecycle_fixtures)), 'Cancellation preserves descendants');
END;
$$;
RESET ROLE;
ROLLBACK;
