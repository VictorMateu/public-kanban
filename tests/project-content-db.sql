-- Safe on a populated local database: no users, only unique fixtures, transaction rollback.
-- Requires the project rich-text migration and an existing authorized administrator.
BEGIN;
SET LOCAL statement_timeout = '10s';

CREATE FUNCTION pg_temp.assert_true(actual BOOLEAN, message TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM TRUE THEN RAISE EXCEPTION '%', message; END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.administrator) THEN
    RAISE EXCEPTION 'An existing administrator is required; this test never creates users';
  END IF;
  PERFORM set_config('test.admin_id', (SELECT user_id::TEXT FROM private.administrator), TRUE);
  PERFORM set_config('test.project_id', gen_random_uuid()::TEXT, TRUE);
  PERFORM set_config('test.asset_id', gen_random_uuid()::TEXT, TRUE);
  PERFORM set_config('test.pending_id', gen_random_uuid()::TEXT, TRUE);
  PERFORM set_config('test.unattached_id', gen_random_uuid()::TEXT, TRUE);
END;
$$;

INSERT INTO public.projects (id, slug, name, is_published, description_content)
VALUES (current_setting('test.project_id')::UUID, 'rich-text-test-' || current_setting('test.project_id'), 'Rich text test fixture', TRUE,
  jsonb_build_object('type', 'doc', 'content', jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', current_setting('test.asset_id'), 'alt', 'Fixture image')))));
INSERT INTO public.project_assets (id, project_id, object_path, status, byte_size, width, height)
SELECT id, current_setting('test.project_id')::UUID, current_setting('test.project_id') || '/' || id::TEXT || '.webp', status, 1, 1, 1
FROM (VALUES (current_setting('test.asset_id')::UUID, 'ready'), (current_setting('test.pending_id')::UUID, 'pending'), (current_setting('test.unattached_id')::UUID, 'ready')) AS fixtures(id, status);
-- Metadata fixtures only: no binary is uploaded and all rows roll back.
INSERT INTO storage.objects (bucket_id, name)
VALUES ('project-images', current_setting('test.project_id') || '/' || current_setting('test.asset_id') || '.webp');

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.project_assets WHERE project_id = current_setting('test.project_id')::UUID), 'Anonymous reads expose only ready attached images');
  PERFORM set_config('storage.operation', 'storage.object.get_authenticated', TRUE);
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM storage.objects WHERE name = current_setting('test.project_id') || '/' || current_setting('test.asset_id') || '.webp'), 'Published images must be downloadable');
  PERFORM set_config('storage.operation', 'storage.object.sign', TRUE);
  PERFORM pg_temp.assert_true((SELECT count(*) = 0 FROM storage.objects WHERE bucket_id = 'project-images'), 'Anonymous URL signing must be denied');
  PERFORM set_config('storage.operation', 'storage.object.list', TRUE);
  PERFORM pg_temp.assert_true((SELECT count(*) = 0 FROM storage.objects WHERE bucket_id = 'project-images'), 'Anonymous Storage listing must be denied');
  BEGIN
    INSERT INTO public.project_assets (id, project_id, object_path, byte_size, width, height)
    VALUES (gen_random_uuid(), current_setting('test.project_id')::UUID, 'forged', 1, 1, 1);
    RAISE EXCEPTION 'Anonymous asset insertion unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::TEXT, TRUE);
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.project_assets WHERE project_id = current_setting('test.project_id')::UUID), 'An unauthorized identity must have only public access');
  BEGIN
    INSERT INTO public.projects (slug, name) VALUES ('rich-text-forged-' || gen_random_uuid()::TEXT, 'Forged');
    RAISE EXCEPTION 'Unauthorized project insertion unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub', current_setting('test.admin_id'), TRUE);
  PERFORM pg_temp.assert_true((SELECT public.is_admin()), 'Existing administrator claims must authorize');
  PERFORM pg_temp.assert_true((SELECT count(*) = 3 FROM public.project_assets WHERE project_id = current_setting('test.project_id')::UUID), 'Administrator must see pending and unattached images');
  PERFORM set_config('storage.operation', 'storage.object.sign', TRUE);
  PERFORM pg_temp.assert_true((SELECT count(*) = 0 FROM storage.objects WHERE bucket_id = 'project-images'), 'Administrator download policies must not accidentally permit URL signing');
  UPDATE public.projects SET is_published = FALSE WHERE id = current_setting('test.project_id')::UUID;
  PERFORM set_config('storage.operation', 'storage.object.get_authenticated', TRUE);
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM storage.objects WHERE name = current_setting('test.project_id') || '/' || current_setting('test.asset_id') || '.webp'), 'Administrator preview must work for drafts');
END;
$$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM pg_temp.assert_true((SELECT count(*) = 0 FROM public.project_assets WHERE project_id = current_setting('test.project_id')::UUID), 'Hiding must remove anonymous asset metadata');
  PERFORM pg_temp.assert_true((SELECT count(*) = 0 FROM storage.objects WHERE name = current_setting('test.project_id') || '/' || current_setting('test.asset_id') || '.webp'), 'Hiding must immediately remove anonymous downloads');
END;
$$;
RESET ROLE;

UPDATE public.projects SET is_published = TRUE, description_content = NULL WHERE id = current_setting('test.project_id')::UUID;
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM pg_temp.assert_true((SELECT count(*) = 0 FROM public.project_assets WHERE project_id = current_setting('test.project_id')::UUID), 'Removed document references must not leave public assets');
END;
$$;
RESET ROLE;

DO $$
BEGIN
  BEGIN
    UPDATE public.projects SET description_content = '{}'::JSONB WHERE id = current_setting('test.project_id')::UUID;
    RAISE EXCEPTION 'Invalid root document unexpectedly passed database constraints';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.projects SET repository_url = 'https://user:password@example.com' WHERE id = current_setting('test.project_id')::UUID;
    RAISE EXCEPTION 'Credential-bearing repository URL unexpectedly passed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;
SELECT 'Project rich-text access assertions passed' AS result;
ROLLBACK;
