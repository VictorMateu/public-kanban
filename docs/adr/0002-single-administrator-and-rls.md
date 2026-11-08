# ADR 0002: Single administrator and RLS authorization

- Status: accepted.
- Date: 2026-11-01.
- Scope: data, authentication and security in phase 2.

## Context

Public reading must include only published projects and their columns and tasks. Writes belong to a single owner. Public registration, multiuser collaboration and permissions supplied by the frontend are not allowed.

## Decision

Store the authorized Supabase Auth UUID in `private.administrator`. A boolean primary key restricted to `TRUE` limits the table to one row. The UUID references `auth.users.id`; migrations and the application neither create users nor assign an administrator.

Only the database owner changes that table through SQL. The private schema is not exposed by the Data API and grants no permissions to `anon` or `authenticated`.

`public.is_admin()` takes no arguments: it compares `auth.uid()` with the authorized UUID. It uses `SECURITY DEFINER`, qualified object names and an empty `search_path`; execution is granted only to `authenticated`. The server and policies query the same authorization, without duplicating a UUID in environment variables or trusting email or metadata.

Enable RLS and revoke default permissions before granting the required access. Projects are private by default.

| Identity | Read | Write |
| --- | --- | --- |
| Anonymous | Published projects and their columns/tasks | Denied |
| Authenticated without authorization | Same as anonymous | Denied |
| Authorized UUID | All projects, columns and tasks | Allowed by RLS |

Administrator sign-in uses the email and password of a manually created account. Public registration and anonymous sign-ins remain disabled. An authenticated identity without authorization is rejected and signed out by the application's sign-in flow.

The application uses only a publishable key. Public queries do not inherit the administrator's session; hiding controls or protecting routes does not replace RLS.

## Data integrity

`projects`, `columns` and `tasks` use UUIDs, nonnegative integer positions and timestamps with time zone. A trigger preserves `created_at` and updates `updated_at`. Position ties use `position, id` ordering.

Project slugs are unique and allow lowercase letters, numbers and hyphens; names and titles are nonempty with bounded lengths. Descriptions are optional. Tasks allow optional `low`, `medium` or `high` priority and an optional due date; their column represents their state.

Relationships cascade deletion to the descendants of a project or column. The composite `(column_id, project_id)` foreign key prevents a task from belonging to another project's column. Exact constraints and indexes are in the [schema migration](../../supabase/migrations/20261024000100_create_kanban.sql); permissions are in the [RLS migration](../../supabase/migrations/20261024000200_authorize_kanban.sql).

## Alternatives considered

- Fixed UUID in a SQL function: the private singleton table was selected so authorization can change through an explicit administrative operation.
- Permissions based on email or editable metadata: rejected because they do not provide reliable authorization.
- Magic link: email and password were selected for owner access without adding an email-link flow.

## Consequences

Changing or removing the UUID revokes database permissions immediately, without waiting for JWT expiration. Deleting the Auth user removes authorization through the foreign key.

The owner must create and authorize the account manually. Authorization changes and remote migrations require confirmation. Local RLS and authentication tests do not replace checks against a subsequently configured remote project.

## Subsequent requirements not implemented here

The owner has since requested individually hidden tasks and comments with selectable visibility. The policies recorded above implement project-level publication only. They do not implement those additional privacy rules. Reusable columns and automatic actual completion dates are also outside this migration's scope.

Those changes require confirmed schema and security proposals, new migrations and access-policy tests before exposure. See [Product requirements](../product.md).

## Transport hardening update — 2026-11-08

- Status: accepted by the owner on 2026-11-08.
- Scope: application transport configuration; no schema, RLS or user changes.

The review found that the installed SSR cookie defaults did not force `Secure` and that configuration accepted remote HTTP Supabase origins. The owner approved both proposed hardening measures.

The project now shares cookie options across the server, proxy and browser Auth clients, requiring `Secure` in production. Supabase URLs require HTTPS except for HTTP on the explicit loopback hosts `localhost`, `127.0.0.1` and `[::1]`. Existing origin-only validation remains.

Retaining dependency defaults alone would allow production Auth cookies without `Secure`. Requiring HTTPS without an exception would prevent the existing local Supabase setup. The selected policy preserves local development while requiring HTTPS for production authentication. Browser-readable Auth cookies remain part of the existing Supabase SSR design; switching to a server-only cookie/session architecture was not selected.

Consequences: use `npm run dev` for HTTP authentication on localhost; production builds require HTTPS for Auth cookie delivery even when tested locally. LAN HTTP Supabase configurations must move to HTTPS or an explicit loopback origin. Tests exercise cookie creation/deletion through the installed SSR adapter and reject non-loopback HTTP configuration. A real HTTPS deployment and successful owner login/session renewal still require environment-specific verification.
