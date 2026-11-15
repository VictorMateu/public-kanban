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

## Project image storage update — 2026-11-14

- Status: private Storage and controlled Next.js delivery accepted by the owner on 2026-11-14.
- Scope: project rich-text images; implementation requires policy tests before enabling access.

Project images use a private Supabase Storage bucket. Uploads and removal require the existing single administrator authorization. Public reads must follow the parent project's publication and saved document references; drafts and unattached uploads remain private. Public delivery must remain independent of administrator cookies, with a separate authorized preview path. The application must not issue reusable signed image URLs or expose privileged keys.

A Next.js Route Handler checks access and sends non-cacheable responses. Storage RLS must enforce equivalent visibility and restrict allowed Storage operations so a public SELECT policy cannot also authorize signed-URL creation. This needs a compatible Storage version with operation-aware helpers; unsupported environments must fail closed. A Route Handler alone does not protect an object if Storage permissions allow another access path.

A public bucket was rejected because possession of its URL bypasses read policies. Short-lived signed URLs were considered but retain an access window after hiding. Controlled delivery increases application bandwidth and prevents shared image caching. It cannot retract files already downloaded by a visitor.

Image uploads and database changes are not one atomic transaction. The implementation must track asset ownership, validate images and resource limits, and handle failed/cancelled uploads without deleting existing user data. No automatic broad cleanup or remote operation is authorized by this decision.

## Shared administration implementation - 2026-11-14

The owner confirmed placing project controls in the existing shared views.
The existing session-refresh proxy now also matches /projects and
/project-images. Refresh does not authorize access: every private query,
mutation, preview and upload verifies the Auth user and is_admin; database
and Storage RLS remain enforced. Anonymous project queries and metadata
remain session independent. Private views are dynamic and proxy responses
are private/no-store. Draft metadata uses generic text and noindex.

Cookie-authenticated multipart uploads additionally require a same-origin
Origin header. The Node Route Handler bounds actual body bytes before
multipart parsing, checks the project and raster signature, then decodes
and normalizes before creating a pending asset. Storage upload precedes
the ready state. Failure compensation addresses only the new asset's exact
object path and ID; failed removal preserves the pending record for later
inspection. Successful but unsaved uploads remain private; no broad orphan
cleanup or deletion of existing assets is introduced.


## Creation images staging proposal - 2026-11-15

- Status: proposal; owner confirmation required before implementation.

The owner requested inserting images before the project is created.
Existing asset rows require an existing project and uploads enforce that
ownership. Proposed flow: stage selected files/previews in browser memory
until Create; persist a private draft when saving, upload sequentially
through the existing authorized/normalized route, then save image
references and requested visibility. Publish only after every required
upload succeeds. Closing before saving creates no project or assets.
If an upload fails after saving starts, retain the new private draft and
successful assets, report the failure and retry against that same project.
This avoids deleting existing data or silently publishing partial content.
The proposed aggregate staging limit is 32 MiB across both fields, with
the existing 8 MiB per-image limit and document image limits preserved.
Preview URLs must be revoked and dismissal blocked during save/upload.
The aggregate limit and failure/retry contract need confirmation.

Alternatives: create a persistent draft on the first image upload (leaves
a project even if the user cancels without saving), or introduce temporary
Storage ownership and later attachment (requires new policies/schema and
an explicit cleanup lifecycle). No alternative is implemented or accepted.
No dependency, migration, new Storage permission or cleanup is authorized
by this proposal.

The proposal would affect ProjectForm, RichTextEditor, EditorImageUpload,
editor-extensions (local previews), image-input (aggregate limits) and
project Server Actions (private draft preparation/final save). Existing
authorized image processing/delivery and database ownership rules remain
required. Validation would cover staging budgets, cancel-before-save,
unauthorized requests, valid image creation, delayed publication, partial
upload failure, retry without duplicate projects and private failed drafts.

## Creation images staging accepted - 2026-11-15

The owner accepted the preceding creation-images flow, 32 MiB aggregate
file budget and private-draft retention/retry contract. This supersedes
its pending status. No new dependency, Storage policy or migration is
needed. Local UUID references and blob previews exist only in the form;
the server accepts only validated documents with owned ready assets.
A stable browser-generated attempt UUID makes initial draft creation
idempotent if its response is lost. Draft writes stay private and use
optimistic timestamps. Successful references are saved to the private
draft before publication and, where possible, after a failed upload.
Uploads run sequentially, retaining successful IDs across retries.
Files/previews are retained for editor undo within the 32 MiB session
budget and revoked on dismissal. This budget bounds file bytes, not all
browser decoding memory. Closing after a failure preserves the private
draft and saved references but discards remaining local files; the UI
explains this. No automatic orphan cleanup is included. Visual review
will use the working form at desktop/mobile sizes and keyboard checks.
