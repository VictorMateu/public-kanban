-- Run with an existing local administrator. All test fixtures roll back.
BEGIN;
SET LOCAL statement_timeout = '15s';

CREATE FUNCTION pg_temp.assert_true(actual BOOLEAN, message TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM TRUE THEN RAISE EXCEPTION '%', message; END IF;
END;
$$;

SELECT set_config('test.comments_admin', (SELECT user_id::TEXT FROM private.administrator), TRUE) IS NOT NULL
  AS has_existing_administrator;
CREATE TEMP TABLE comment_fixture AS SELECT
  gen_random_uuid() AS project, gen_random_uuid() AS task, gen_random_uuid() AS other_task,
  gen_random_uuid() AS comment, gen_random_uuid() AS other_comment, gen_random_uuid() AS asset;
GRANT SELECT ON comment_fixture TO anon, authenticated;

INSERT INTO public.projects (id, slug, name, is_published)
SELECT project, 'task-comments-db-' || project::TEXT, 'Comment policy fixture', TRUE FROM comment_fixture;
INSERT INTO public.tasks (id, project_id, column_id, title)
SELECT fixture_task.id, f.project, c.id, 'Comment policy task'
  FROM comment_fixture f JOIN public.columns c ON c.project_id = f.project AND c.stage = 'todo'
  CROSS JOIN LATERAL (VALUES (f.task), (f.other_task)) fixture_task(id);
INSERT INTO public.project_assets (id, project_id, comment_id, object_path, status, byte_size, width, height)
SELECT asset, project, comment, project::TEXT || '/' || asset::TEXT || '.webp', 'ready', 1, 1, 1 FROM comment_fixture;
INSERT INTO storage.objects (bucket_id, name)
SELECT 'project-images', project::TEXT || '/' || asset::TEXT || '.webp' FROM comment_fixture;

CREATE FUNCTION pg_temp.diagram(id UUID) RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT jsonb_build_object('type', 'doc', 'content',
    jsonb_build_array(jsonb_build_object('type', 'image', 'attrs', jsonb_build_object('assetId', id, 'alt', 'Policy diagram'))))
$$;

SET LOCAL ROLE anon;
SELECT set_config('storage.operation', 'storage.object.get_authenticated', TRUE);
SELECT pg_temp.assert_true(NOT has_function_privilege(current_user,
  'public.mutate_task_comment(text,uuid,uuid,uuid,timestamptz,jsonb,boolean)', 'EXECUTE'), 'Anonymous RPC execution denied');
SELECT pg_temp.assert_true(NOT EXISTS (SELECT FROM public.project_assets WHERE id = f.asset), 'Unsaved asset is private')
  FROM comment_fixture f;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', gen_random_uuid()::TEXT, TRUE) IS NOT NULL AS impersonated_nonowner;
DO $$
DECLARE f comment_fixture%ROWTYPE;
BEGIN
  SELECT * INTO STRICT f FROM comment_fixture;
  BEGIN
    PERFORM public.mutate_task_comment('create', f.project, f.task, f.comment, p_body => pg_temp.diagram(f.asset));
    RAISE EXCEPTION 'Nonowner RPC write was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
SELECT set_config('request.jwt.claim.sub', current_setting('test.comments_admin'), TRUE) IS NOT NULL AS impersonated_admin;
SELECT pg_temp.assert_true(NOT has_table_privilege(current_user, 'public.task_comments', 'INSERT, UPDATE, DELETE'), 'Direct writes denied');
SELECT pg_temp.assert_true(public.mutate_task_comment('create', f.project, f.task, f.other_comment,
  p_body => pg_temp.diagram(f.asset)) = 'invalid', 'Another comment cannot reference this asset') FROM comment_fixture f;
SELECT pg_temp.assert_true(public.mutate_task_comment('create', f.project, f.task, f.comment,
  p_body => pg_temp.diagram(f.asset)) = 'ok', 'Create private image comment') FROM comment_fixture f;
SELECT pg_temp.assert_true(public.mutate_task_comment('create', f.project, f.task, f.comment,
  p_body => pg_temp.diagram(f.asset)) = 'ok', 'Identical creation retry succeeds') FROM comment_fixture f;
SELECT pg_temp.assert_true(EXISTS (SELECT FROM public.task_comments WHERE id = f.comment AND NOT is_public),
  'Owner can read private comment') FROM comment_fixture f;
SELECT pg_temp.assert_true(public.mutate_task_comment('delete', f.project, f.other_task, f.comment,
  c.updated_at) = 'stale', 'Another task cannot delete the comment')
  FROM comment_fixture f JOIN public.task_comments c ON c.id = f.comment;
SELECT pg_temp.assert_true(public.mutate_task_comment('edit', f.project, f.task, f.comment,
  '-infinity', c.body, TRUE) = 'stale', 'A stale edit cannot overwrite the comment')
  FROM comment_fixture f JOIN public.task_comments c ON c.id = f.comment;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(NOT EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND NOT EXISTS (SELECT FROM public.project_assets WHERE id = f.asset)
  AND NOT EXISTS (SELECT FROM storage.objects WHERE name = f.project::TEXT || '/' || f.asset::TEXT || '.webp'),
  'Private comment and image are hidden at all data boundaries') FROM comment_fixture f;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true(public.mutate_task_comment('edit', f.project, f.task, f.comment, c.updated_at, c.body, TRUE)
  = 'ok', 'Owner publishes comment') FROM comment_fixture f JOIN public.task_comments c ON c.id = f.comment;

RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND EXISTS (SELECT FROM public.project_assets WHERE id = f.asset)
  AND EXISTS (SELECT FROM storage.objects WHERE name = f.project::TEXT || '/' || f.asset::TEXT || '.webp'),
  'Public comment and referenced image are readable') FROM comment_fixture f;

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true(public.mutate_task_comment('edit', f.project, f.task, f.comment, c.updated_at, c.body, FALSE)
  = 'ok', 'Owner makes a published comment private') FROM comment_fixture f JOIN public.task_comments c ON c.id = f.comment;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(NOT EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND NOT EXISTS (SELECT FROM storage.objects WHERE name = f.project::TEXT || '/' || f.asset::TEXT || '.webp'),
  'Making a comment private revokes access to its image') FROM comment_fixture f;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true(public.mutate_task_comment('edit', f.project, f.task, f.comment, c.updated_at,
  '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Diagram removed"}]}]}'::JSONB, TRUE)
  = 'ok', 'Owner publishes an edit without the image') FROM comment_fixture f JOIN public.task_comments c ON c.id = f.comment;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND NOT EXISTS (SELECT FROM storage.objects WHERE name = f.project::TEXT || '/' || f.asset::TEXT || '.webp'),
  'Removing the image from a public comment revokes direct access') FROM comment_fixture f;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true(public.mutate_task_comment('edit', f.project, f.task, f.comment, c.updated_at, pg_temp.diagram(f.asset), TRUE)
  = 'ok', 'Owner can restore the comment image') FROM comment_fixture f JOIN public.task_comments c ON c.id = f.comment;

RESET ROLE;
UPDATE public.projects SET is_hidden = TRUE WHERE id = (SELECT project FROM comment_fixture);
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(NOT EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND NOT EXISTS (SELECT FROM public.project_assets WHERE id = f.asset), 'Hidden project revokes comments and images')
  FROM comment_fixture f;
RESET ROLE;
UPDATE public.projects SET is_hidden = FALSE, is_published = FALSE WHERE id = (SELECT project FROM comment_fixture);
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(NOT EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND NOT EXISTS (SELECT FROM public.project_assets WHERE id = f.asset), 'Unpublished project revokes comments and images')
  FROM comment_fixture f;
RESET ROLE;
UPDATE public.projects SET is_published = TRUE WHERE id = (SELECT project FROM comment_fixture);
UPDATE public.tasks SET is_hidden = TRUE WHERE id = (SELECT task FROM comment_fixture);
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(NOT EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND NOT EXISTS (SELECT FROM public.project_assets WHERE id = f.asset), 'Hidden task revokes comments and images')
  FROM comment_fixture f;
RESET ROLE;
UPDATE public.tasks SET is_hidden = FALSE, archived_at = statement_timestamp() WHERE id = (SELECT task FROM comment_fixture);
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(NOT EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND NOT EXISTS (SELECT FROM public.project_assets WHERE id = f.asset), 'Archived task revokes comments and images')
  FROM comment_fixture f;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true(EXISTS (SELECT FROM public.task_comments WHERE id = f.comment),
  'Owner can read an archived comment') FROM comment_fixture f;
SELECT pg_temp.assert_true(public.mutate_task_comment('delete', f.project, f.task, f.comment, c.updated_at) = 'stale',
  'Owner can read archived comment but cannot delete it')
  FROM comment_fixture f JOIN public.task_comments c ON c.id = f.comment;

RESET ROLE;
UPDATE public.tasks SET archived_at = NULL WHERE id = (SELECT task FROM comment_fixture);
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_true(public.mutate_task_comment('delete', f.project, f.task, f.comment, c.updated_at)
  = 'ok', 'Owner deletes comment') FROM comment_fixture f JOIN public.task_comments c ON c.id = f.comment;
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_true(NOT EXISTS (SELECT FROM public.task_comments WHERE id = f.comment)
  AND NOT EXISTS (SELECT FROM public.project_assets WHERE id = f.asset)
  AND NOT EXISTS (SELECT FROM storage.objects WHERE name = f.project::TEXT || '/' || f.asset::TEXT || '.webp'),
  'Deleting the comment revokes its retained image') FROM comment_fixture f;

ROLLBACK;
