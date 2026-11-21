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
DO $$
BEGIN
  PERFORM pg_temp.assert_true((SELECT count(*) = 4 FROM (
    SELECT t.project_id FROM public.tasks t
    JOIN lifecycle_fixtures f ON f.id = t.project_id
    JOIN public.columns c ON c.id = t.column_id
    GROUP BY t.project_id
    HAVING array_agg(t.position ORDER BY t.position) = ARRAY[0, 1, 2, 3, 4]
      AND array_agg(t.title ORDER BY t.position) = ARRAY[
        'Define the scope and first milestone', 'Define the architecture and its boundaries',
        'Choose the technology stack', 'Set up the repository and local environment',
        'Set up tests and continuous integration'
      ]
      AND bool_and(c.stage = 'todo' AND t.is_system AND t.is_hidden AND t.completed_on IS NULL
        AND t.archived_at IS NULL AND coalesce(t.description, '') <> ''
        AND (t.description_content->>'type' = 'doc') IS TRUE)
      AND bool_or(t.title = 'Define the architecture and its boundaries' AND t.description LIKE '%microservices%')
  ) AS initialized), 'Each new project receives five ordered hidden system tasks in To do with English descriptions');
END;
$$;
INSERT INTO public.tasks (project_id, column_id, title)
SELECT c.project_id, c.id, 'Private task' FROM public.columns c JOIN lifecycle_fixtures f ON f.id = c.project_id WHERE c.stage = 'todo';
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
  PERFORM pg_temp.assert_true((SELECT count(*) = 4 FROM public.columns WHERE project_id IN (SELECT id FROM lifecycle_fixtures)), 'Hidden columns remain private');
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
  BEGIN
    PERFORM public.mutate_task('archive', (SELECT id FROM lifecycle_fixtures LIMIT 1), gen_random_uuid());
    RAISE EXCEPTION 'Nonowner task mutation unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
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
  PERFORM pg_temp.assert_true((SELECT count(*) = 24 FROM public.tasks WHERE project_id IN (SELECT id FROM lifecycle_fixtures)), 'Cancellation preserves descendants');
END;
$$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
  visible_project UUID; todo UUID; done UUID; wrong_column UUID;
  first_id UUID := gen_random_uuid(); second_id UUID := gen_random_uuid();
  original_version TIMESTAMPTZ; new_version TIMESTAMPTZ;
  system_task public.tasks%ROWTYPE;
BEGIN
  SELECT id INTO visible_project FROM lifecycle_fixtures WHERE published AND NOT hidden;
  SELECT id INTO todo FROM public.columns WHERE project_id = visible_project AND stage = 'todo';
  SELECT id INTO done FROM public.columns WHERE project_id = visible_project AND stage = 'done';
  SELECT id INTO wrong_column FROM public.columns WHERE project_id <> visible_project
    AND project_id IN (SELECT id FROM lifecycle_fixtures) AND stage = 'todo' LIMIT 1;
  PERFORM pg_temp.assert_true(public.mutate_task('create', visible_project, first_id,
    p_column => wrong_column, p_title => 'Cross-project task', p_hidden => FALSE) = 'invalid', 'Wrong-project column is rejected');
  PERFORM pg_temp.assert_true(public.mutate_task('create', visible_project, first_id,
    p_column => todo, p_title => 'First task', p_hidden => FALSE) = 'ok', 'Task is created');
  PERFORM pg_temp.assert_true(public.mutate_task('create', visible_project, first_id,
    p_column => todo, p_title => 'Retried creation', p_hidden => FALSE) = 'ok', 'Create is retry-safe');
  PERFORM pg_temp.assert_true((SELECT title = 'First task' AND NOT is_system FROM public.tasks WHERE id = first_id), 'Create retry preserves the manual task');
  PERFORM pg_temp.assert_true(public.mutate_task('create', visible_project, second_id,
    p_column => todo, p_title => 'Second task', p_hidden => TRUE) = 'ok', 'Owner can create hidden task');
  SELECT updated_at INTO original_version FROM public.tasks WHERE id = first_id;
  PERFORM pg_temp.assert_true(public.mutate_task('move', visible_project, first_id, original_version, done,
    second_id) = 'stale', 'Anchor outside destination is rejected');
  PERFORM pg_temp.assert_true(public.mutate_task('move', visible_project, first_id, original_version, done) = 'ok', 'Task moves to Done');
  PERFORM pg_temp.assert_true((SELECT completed_on = (statement_timestamp() AT TIME ZONE 'UTC')::DATE
    FROM public.tasks WHERE id = first_id), 'Entering Done records the completion date');
  PERFORM pg_temp.assert_true(public.mutate_task('archive', visible_project, first_id, '2000-01-01') = 'stale', 'Old version cannot archive task');
  SELECT updated_at INTO new_version FROM public.tasks WHERE id = first_id;
  PERFORM pg_temp.assert_true(public.mutate_task('edit', visible_project, first_id, new_version, todo,
    p_title => 'Reopened task', p_hidden => FALSE) = 'ok', 'Stage can change during editing');
  PERFORM pg_temp.assert_true((SELECT completed_on IS NULL AND position = 7 FROM public.tasks WHERE id = first_id),
    'Reopening clears completion and appends to column');
  SELECT updated_at INTO new_version FROM public.tasks WHERE id = first_id;
  PERFORM pg_temp.assert_true(public.mutate_task('archive', visible_project, first_id, new_version) = 'ok', 'Task is archived');
  PERFORM pg_temp.assert_true((SELECT archived_at IS NOT NULL FROM public.tasks WHERE id = first_id), 'Archived data retained');

  SELECT * INTO STRICT system_task FROM public.tasks
    WHERE project_id = visible_project AND is_system ORDER BY position, id LIMIT 1;
  PERFORM pg_temp.assert_true(public.mutate_task('edit', visible_project, system_task.id,
    system_task.updated_at, todo, p_title => 'Changed title', p_hidden => FALSE) = 'invalid',
    'System tasks cannot be edited through the task RPC');
  PERFORM pg_temp.assert_true(public.mutate_task('archive', visible_project, system_task.id,
    system_task.updated_at) = 'invalid', 'System tasks cannot be archived through the task RPC');
  PERFORM pg_temp.assert_true(public.mutate_task('move', visible_project, system_task.id,
    system_task.updated_at, done) = 'ok', 'System tasks can move to Done');
  PERFORM pg_temp.assert_true((SELECT title = system_task.title AND is_system AND is_hidden
    AND archived_at IS NULL AND column_id = done AND completed_on IS NOT NULL
    FROM public.tasks WHERE id = system_task.id), 'Moving preserves system task content and visibility');
END;
$$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.tasks WHERE project_id IN (SELECT id FROM lifecycle_fixtures)),
    'Direct public reads exclude individually hidden and archived tasks');
END;
$$;
RESET ROLE;
ROLLBACK;
