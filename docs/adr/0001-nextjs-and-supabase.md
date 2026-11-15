# ADR 0001: Next.js application with Supabase

- Status: accepted.
- Date: 2026-11-01.
- Scope: foundation and persistence integration in phases 1 and 2.

## Context

Portfolio Kanban needs public browsing and administration exclusively by its owner. Simplicity, security, maintenance and low costs are priorities. It has been decided to keep a single application without an independent backend or an additional ORM.

## Decision

Keep a single Next.js application with App Router, strict TypeScript, Tailwind and Server Components by default. The foundation was initialized manually rather than generated from Vercel's Supabase starter.

Use Supabase PostgreSQL and Auth through the official clients. `lib/supabase/` separates the browser client, per-request server client and session-free public client. `server-only` protects server data-access modules.

Organize project, column and task queries by domain. Public queries use an anonymous client without administrator cookies and with `cache: no-store`. No generic repository layer is added.

SSR sessions use cookies. The initial `proxy.ts` implementation renews and verifies sessions on `/admin` and its subroutes with `getClaims()`, forwarding cookies and no-cache headers. Pages verify the user through `getUser()` and authorize separately. Forms use Server Actions; only actions write cookies through the server client.

Version SQL migrations and database tests under `supabase/`. Keep configuration and access types alongside the code; the current SQL types reflect migrations manually and can be regenerated with the CLI.

## Alternatives considered

- Use the full Vercel starter: a manual foundation was selected to include only what the scope required.
- Add a backend or ORM: rejected because of the explicit restriction and additional complexity.

## Consequences

The structure follows Next.js conventions and Supabase SSR integration. `lib/` and the domain separation are organizational choices for this project.

New session-dependent entry points must verify permissions and, when renewal is needed, be covered by the proxy. Protecting only the visible interface is insufficient.

At the time of this decision, the board, CRUD and deployment were left for later phases. Vercel was a prospective hosting choice; no deployment or remote service connection had been made.

## Subsequent product direction

The owner has since selected administration controls on the same board used for public browsing. That experience is not implemented by this ADR, and the existing `/admin` placeholder is not a final navigation decision. Any related changes to session-refresh coverage or authorization must be proposed before implementation. See [Product requirements](../product.md).

## Runtime validation and typing update — 2026-11-14

- Status: accepted by the owner on 2026-11-14.
- Scope: project input validation, dependency selection and application typing checks.

The owner selected Zod, a library they know and have experience with, and explicitly prohibited `any`. The project uses pinned Zod 4.6.7 as a direct runtime dependency. The project-details schema validates external input and supplies inferred input/output types; its output is checked against the existing database insert contract. External values remain `unknown` until validated or narrowed. A strict object schema rejects unexpected keys, while the form adapter submits only explicitly editable fields.

The initial handwritten project validator was the available alternative. It avoided a direct validation dependency but required separate type definitions and runtime checks. Zod is selected for schema-based runtime validation and type inference. It was already present transitively in the lockfile; declaring it directly makes the application dependency explicit. Existing authentication validation is not migrated in this increment.

TypeScript retains strict mode and enables checked index access. Type-aware ESLint rejects explicit `any` and unsafe assignments, arguments, calls, member access and returns. Suppressions and `z.any()` must not bypass the policy. These checks apply to application source and tests; they do not claim that third-party declarations contain no `any`. Type-aware linting adds analysis cost, while database constraints, RLS and server authorization remain necessary and unchanged.
## Rich project content update — 2026-11-14

- Status: accepted by the owner on 2026-11-14; implementation and UI acceptance remain separate.
- Scope: project descriptions and objectives, editor dependencies, persistence and image integration.

The project uses Tiptap as its visual rich-text editor. Structured documents are stored as JSONB and validated at runtime with strict Zod schemas and inferred TypeScript types. Supported formatting is allowlisted; external editor output is untrusted until validated. Public rendering uses semantic React elements rather than injecting authored HTML. Plain-text extraction supplies cards and metadata. Existing descriptions must be preserved during migration.

Image binaries belong in Supabase Storage, with stable asset references in documents rather than base64 or expiring URLs. The owner selected a private bucket and controlled delivery through a Next.js Route Handler; see ADR 0002 for access requirements. Image optimization must not require Supabase's paid transformation feature.

Alternatives considered were Markdown/plain text, HTML persistence and a public image bucket. The owner selected a visual editor for authoring comfort and JSONB for explicit structure and validation. This adds client-side editor code, schema/version compatibility, accessible toolbar work and an upload/file-lifecycle integration. This decision does not adopt collaboration, cloud editor services, AI features or unrelated editor plugins.

The first review method is a working editor prototype in the existing protected /admin page. Its location and presentation are provisional; final management still belongs in the shared project interface. No new authentication boundary is implied by this prototype.

## Shared project administration and image processing update - 2026-11-14

- Status: accepted by the owner on 2026-11-14; visual acceptance remains pending.
- Scope: project CRUD placement and Sharp adoption within the current increment.

The owner confirmed that administration uses the visitor-facing project and
task views with additional owner controls. Project creation opens a form
from a button in Projects; project editing belongs in the project view.
The earlier /admin editor prototype is superseded. /admin is only an
authentication entry that redirects authorized users to /projects, and
sign-in also redirects there. Task mutation controls remain outside this
project increment.

Sharp 0.35.5 is accepted as a pinned direct server dependency for image
upload normalization. It decodes allowlisted raster input, resizes, applies
orientation, encodes WebP and omits metadata. Alternatives are browser
Canvas preprocessing and Supabase delivery transformations. Canvas cannot
replace server validation; managed transformations add paid-service
requirements and do not normalize incoming stored files. Native binaries
add platform/deployment concerns and decoding consumes CPU/memory.
The measured local two-folder footprint is about 19.9 MiB; this version
already existed through Next.js. Sharp remains outside browser imports.
Deployment size and runtime resource measurements remain environment
specific; see the dated assessment in development.md.

## Project form modal update - 2026-11-15

- Status: modal placement accepted by the owner; visual acceptance remains pending.
- Scope: opening project creation/editing from the shared project views.

The owner requested left alignment for the creation button and a modal
form. This supersedes the provisional inline form presentation. The
implementation uses native HTML dialog rather than adopting a modal
library or implementing a custom overlay. It retains lazy editor loading,
uses the browser's top layer and inert background, and adds explicit
keyboard focus cycling, focus restoration and pending-operation guards.
The dialog scrolls internally to keep the form and its close control
usable on small screens. No dependency, route, schema or authorization
change is introduced. Styling and dimensions remain a provisional working
prototype for owner review.

## Cozy modal presentation refinement - 2026-11-15

The owner subsequently requested right-aligned actions instead of the
initial left alignment, a gentle entrance consistent with the cozy visual
direction, a header X, a bottom Close action and revised rich-text styling.
The prototype retains native dialog and adds CSS-only motion with a
reduced-motion alternative. A fixed footer keeps Save/Close visible while
the form scrolls. Grouped, labelled icon controls replace the large text
formatting buttons without changing editor commands or dependencies.
These requested directions supersede the earlier alignment/close-control
placement; the exact appearance remains a provisional owner-review result.


## Project visibility and board-focused detail update - 2026-11-15

The owner requested a Published switch in both form modes and a detail
view focused on the board. Publication now travels with content through
saveProject, under the existing authorization, Zod validation, optimistic
concurrency check and RLS. One database mutation applies both values;
this supersedes the separate publication action. Creation defaults to
private in the UI but may explicitly publish on save. A missing or invalid
publication value fails validation rather than silently changing state.

The alternative was an immediately persisted publication toggle separate
from content; that could expose older content while unsaved changes are
visible in the editor. The selected prototype applies the switch only
when saving. Save redirects no longer request automatic modal opening.
The detail removes supporting-information sections while retaining the
board, compact administration/navigation controls, accessible project
heading and existing published metadata. Visual acceptance is pending.


## Project title and information modal - 2026-11-15

The owner requested a visible project title with an adjacent information
icon, a modal for supporting information, an edit action for the signed-in
owner and removal of the Read only badge. The detail keeps the board as
its primary content and exposes description, objectives and repository in
a separate native dialog. Empty information has a translated message.
Only the verified administrator receives the edit control. Information
and editing share ProjectDialog for the cozy entrance, scrolling footer,
keyboard focus containment/restoration and dismissal guards. Rich content
is rendered by the existing server renderer and image routes keep their
existing access checks. This supersedes the screen-reader-only title and
absence of an information presentation from the preceding prototype.
Exact appearance remains provisional pending owner review.

## Project lifecycle and hidden flag proposal - 2026-11-15

- Status: fields requested; default values and hidden access semantics
  await owner confirmation before migration/implementation.

The owner requested project status and hidden columns. The concrete
proposal is status TEXT NOT NULL with a CHECK allowing development,
maintenance, completed and cancelled. development represents the single
owner label Active / in development. The proposed default is development
for new and existing projects; assigning that value to existing projects
needs confirmation. The alternative is a PostgreSQL enum, which gives
generated database union types but adds a separately managed SQL type.
Zod will validate the selected values and infer application types.

Proposed additive migration, not yet created or applied:

```sql
ALTER TABLE public.projects
  ADD COLUMN status TEXT NOT NULL DEFAULT 'development'
    CHECK (status IN (
      'development', 'maintenance', 'completed', 'cancelled'
    )),
  ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE;
```

The proposed meaning of is_hidden is unlisted: a published hidden project
is excluded from the public listing but remains publicly readable through
its URL and the data API. This is not a confidentiality control. Public
list queries would require is_published AND NOT is_hidden; direct detail,
board and image reads would retain publication authorization. The owner
would continue to see all projects. Unpublished projects stay private
regardless of the hidden flag. Lifecycle status is independent of both
visibility flags. Existing visibility and content would be preserved.

The meaningful alternative is hidden-as-private: hidden overrides
publication and blocks every public response path. That requires a
confirmed RLS/Storage/metadata plan for projects and their descendants;
changing only the listing would be insufficient. Do not choose silently.

After confirmation, affected files include a new versioned migration,
generated Supabase types, project schemas/input/actions/queries, creation
and edit controls, listing badges, the information modal and translations.
Validation must cover all status values, invalid/missing/duplicate input,
both publication/hidden combinations, anonymous and administrator reads,
HTML/RSC/metadata and image routes, optimistic updates and preservation of
existing rows/users. Apply only the confirmed non-destructive local
migration; remote operations remain separately authorized.
