BEGIN;

ALTER TABLE public.tasks ADD COLUMN is_system BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION private.initialize_project_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  todo_column_id UUID;
BEGIN
  PERFORM private.ensure_project_columns(new.id);
  SELECT id INTO STRICT todo_column_id FROM public.columns WHERE project_id = new.id AND stage = 'todo';

  INSERT INTO public.tasks (project_id, column_id, position, title, description, description_content, is_hidden, is_system)
  SELECT new.id, todo_column_id, starter.position, starter.title,
    concat_ws(E'\n', 'Objective', starter.objective, 'Steps', array_to_string(starter.steps, E'\n'),
      'Done when', array_to_string(starter.done_when, E'\n')),
    document.content, TRUE, TRUE
  FROM (VALUES
    (0, 'Define the scope and first milestone',
      'Agree on who the project serves, which problem is worth solving first, and what the first usable release will demonstrate. Write down the boundary of that release so new ideas can be evaluated without silently changing the plan.',
      ARRAY[
        'Identify the intended users and describe one concrete situation in which they need the project. Note what they do today and where that approach breaks down.',
        'Describe the main workflow from the user''s first action to a useful result. Separate essential steps from improvements that can wait.',
        'List what the first milestone includes and excludes. Capture dependencies, constraints, and the assumptions that could change the scope.',
        'Define how to demonstrate the milestone and choose observable acceptance criteria. Record the open questions that need evidence before work proceeds.'
      ], ARRAY[
        'The project has a short scope statement, an explicit list of exclusions, and a first milestone someone can demonstrate.',
        'Each acceptance criterion can be checked against a real workflow or example. Any unresolved assumption has a clear next step.'
      ]),
    (1, 'Define the architecture and its boundaries',
      'Choose a system structure that supports the first milestone and the constraints already known. Record which parts own behavior and data, how they interact, and why the chosen boundaries are worth their operational cost.',
      ARRAY[
        'Map the core workflows and identify the major capabilities. For each proposed component, write down its responsibilities, which data it owns, and who can read or change that data.',
        'Compare a modular monolith with separate services or microservices. Consider independent deployment, scaling and fault isolation alongside network failures, consistency, observability, security and operating effort.',
        'Draw the main interactions and deployment boundaries. Describe what crosses each boundary, whether the interaction is synchronous or asynchronous, and how failures or retries would be handled where relevant.',
        'Write a short decision record with the chosen structure, alternatives, trade-offs, and the evidence that would justify revisiting the decision. Flag the biggest unknown for a focused experiment if needed.'
      ], ARRAY[
        'A diagram and decision record explain the chosen structure, ownership boundaries, and the route taken by at least one core workflow.',
        'The record makes clear why components are deployed together or separately and identifies the conditions that would justify a different split.'
      ]),
    (2, 'Choose the technology stack',
      'Select technologies that fit the architecture, the people who will maintain the project, and the work required for the first release. Record the deciding constraints and validate unfamiliar or risky choices before relying on them.',
      ARRAY[
        'List the capabilities the project needs, such as an interface, runtime, persistence, authentication, testing and hosting. Note constraints on budget, maintenance, performance, privacy, or deployment.',
        'Compare a small set of realistic options for the decisions that matter most. Consider team familiarity, ecosystem maturity, support and upgrade paths, cost, and how easily the project could change course later.',
        'Validate the riskiest integration with a small experiment. Exercise an actual constraint, such as an authentication flow, a database operation, or a production-like build.',
        'Document the selected languages, tools, and services, their compatibility requirements, the alternatives considered, and work still needed to prove uncertain choices.'
      ], ARRAY[
        'The stack decision lists what will be used for the first milestone and explains the important choices.',
        'Risky assumptions have evidence from a focused experiment or a clear follow-up task with a success criterion.'
      ]),
    (3, 'Set up the repository and local environment',
      'Make it possible to clone the repository, configure a local environment, and run the project from a fresh checkout. Keep the setup reproducible and ensure that example configuration can be shared safely.',
      ARRAY[
        'Establish the repository layout and document the supported runtime, package manager, and other prerequisites. Add the project''s dependency lockfile where applicable.',
        'Provide documented commands to install dependencies, start the application and any required local services, and run the basic checks. Include migration or fixture steps if the project needs local data.',
        'Add an example configuration file with placeholders and explain where real secrets come from. Keep local credentials, generated files, and build output out of version control.',
        'Follow the README from a fresh checkout. Check that each command works in order and document any platform-specific requirements or common setup failures.'
      ], ARRAY[
        'A fresh checkout can start the application and complete a smoke check using the documented commands.',
        'The repository includes shareable example configuration and an onboarding guide with prerequisites and troubleshooting steps.'
      ]),
    (4, 'Set up tests and continuous integration',
      'Put the first automated checks in place so every proposed change can be reviewed with evidence. Start with the highest-risk behavior and make the same checks reproducible locally and in CI.',
      ARRAY[
        'Identify the core behavior and failure modes that matter for the first milestone. Add representative tests with meaningful assertions and predictable fixtures.',
        'Define the local commands for the project''s relevant lint, type, test and build checks. Add integration or smoke coverage where a core dependency or workflow needs it.',
        'Configure CI to run on pull requests with the same runtime and dependency versions used locally. Keep test data isolated and give jobs only the permissions and credentials their checks require.',
        'Run the pipeline with a passing change and a deliberately failing check. Confirm that the output tells contributors what failed and how to reproduce it locally.'
      ], ARRAY[
        'A pull request shows passing required checks with documented local equivalents.',
        'A failing test fails the pipeline and produces diagnostics that identify the affected behavior. The checks are repeatable with isolated test data.'
      ])
  ) AS starter(position, title, objective, steps, done_when)
  CROSS JOIN LATERAL (
    SELECT jsonb_build_object('type', 'doc', 'content', jsonb_agg(
      CASE WHEN block.items IS NULL THEN
        jsonb_build_object('type', block.kind, 'content',
          jsonb_build_array(jsonb_build_object('type', 'text', 'text', block.label)))
          || CASE WHEN block.kind = 'heading' THEN jsonb_build_object('attrs', jsonb_build_object('level', 3)) ELSE '{}'::JSONB END
      ELSE
        jsonb_build_object('type', 'bulletList', 'content', (
          SELECT jsonb_agg(jsonb_build_object('type', 'listItem', 'content', jsonb_build_array(
            jsonb_build_object('type', 'paragraph', 'content',
              jsonb_build_array(jsonb_build_object('type', 'text', 'text', item.text)))
          )) ORDER BY item.ordinality)
          FROM unnest(block.items) WITH ORDINALITY AS item(text, ordinality)
        ))
      END ORDER BY block.position
    )) AS content
    FROM (VALUES
      (0, 'heading', 'Objective', NULL::TEXT[]),
      (1, 'paragraph', starter.objective, NULL::TEXT[]),
      (2, 'heading', 'Steps', NULL::TEXT[]),
      (3, 'bulletList', NULL, starter.steps),
      (4, 'heading', 'Done when', NULL::TEXT[]),
      (5, 'bulletList', NULL, starter.done_when)
    ) AS block(position, kind, label, items)
  ) AS document;

  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.initialize_project_columns() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mutate_task(
  p_operation TEXT, p_project UUID, p_task UUID, p_version TIMESTAMPTZ DEFAULT NULL,
  p_column UUID DEFAULT NULL, p_before UUID DEFAULT NULL, p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL, p_priority TEXT DEFAULT NULL, p_due_date DATE DEFAULT NULL,
  p_hidden BOOLEAN DEFAULT NULL, p_description_content JSONB DEFAULT NULL
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
    INSERT INTO public.tasks (id, project_id, column_id, title, description, description_content, priority, due_date, is_hidden, position)
    VALUES (p_task, p_project, p_column, p_title, p_description, p_description_content, p_priority, p_due_date, p_hidden, target_index - 1)
    ON CONFLICT (id) DO NOTHING;
    IF NOT FOUND THEN RETURN 'stale'; END IF;
  ELSIF p_operation = 'edit' THEN
    UPDATE public.tasks SET title = p_title, description = p_description, description_content = p_description_content, priority = p_priority,
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

COMMIT;
