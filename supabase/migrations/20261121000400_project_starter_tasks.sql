BEGIN;

CREATE OR REPLACE FUNCTION private.initialize_project_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  todo_column_id UUID;
BEGIN
  PERFORM private.ensure_project_columns(new.id);
  SELECT id INTO STRICT todo_column_id FROM public.columns WHERE project_id = new.id AND stage = 'todo';

  INSERT INTO public.tasks (project_id, column_id, position, title, description, is_hidden)
  SELECT new.id, todo_column_id, starter.position, starter.title, starter.description, TRUE
  FROM (VALUES
    (0, 'Define the scope and first milestone',
      'Describe who the project is for, what problem it solves, and what the first release needs to deliver. Record what is out of scope and how you will know the milestone is complete.'),
    (1, 'Define the architecture and its boundaries',
      'Decide how to structure the system. Compare a modular monolith with separate services or microservices where useful. Describe each component''s responsibilities, data ownership, communication, and deployment, and record the trade-offs behind the choice.'),
    (2, 'Choose the technology stack',
      'Choose the languages, frameworks, storage, and hosting that fit the architecture and constraints. Record why the main technologies were chosen and any alternatives considered.'),
    (3, 'Set up the repository and local environment',
      'Initialize the repository, configure dependencies and environment variable examples, and document how to run the project locally from a fresh checkout.'),
    (4, 'Set up tests and continuous integration',
      'Add initial automated tests for core behavior and configure continuous integration to run the relevant checks on each pull request.')
  ) AS starter(position, title, description);

  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION private.initialize_project_columns() FROM PUBLIC, anon, authenticated;

COMMIT;
