# Product requirements and open decisions

These requirements record the owner's product direction. They describe the intended product, not features already implemented or authorization to implement them all. Each task needs its own confirmed scope under [AGENTS.md](../AGENTS.md).

## Purpose and audience

The owner selected Project Garden as the application's name. It is a brand name shared by all interface languages, with a single source in `Common.appName` in the English message catalog; other locales inherit it through the existing English fallback. The sidebar presents it as a visual title in Dancing Script at 30px and weight 600.

Visitors should be able to understand the state of the owner's projects, explore their tasks and find supporting project information. The minimum experience is a conventional Kanban showing current progress. How to present changes over time remains undecided.

Project Garden will be the first project featured in the projects section of the owner's personal website. Repository instructions, documentation and code use English to reach an international audience, including recruiters. The interface supports English (default), Spanish and Catalan from this initial stage, with progressive translation through `next-intl` message catalogs.

Language preference is stored in a cookie while URLs remain unchanged. Without a valid preference, English is used regardless of browser-language headers. Localizing project or task content is outside this interface-only scope.

## Confirmed requirements

### Projects and public information

- Provide a project listing; more than one project may be active at a time.
- Each project has its own independent board and tasks.
- Initial supporting information includes a description, objectives and a repository link.
- The owner can create, read, update, publish, unpublish and hide projects. Projects cannot be deleted; cancellation preserves the project and requires a reason.
- Lifecycle states are Active / in development, Maintenance, Completed and Cancelled. New and existing projects start as Active / in development when the status field is introduced.
- Visitors can see published projects in the listing. A published hidden project remains listed but its card does not open, and its detail URL and underlying content are unavailable to visitors. The administrator retains access. Unpublished projects remain private regardless of the hidden flag.

The home page may show a summary, all projects or another presentation chosen after exploring alternatives. The project entry point and navigation between information and board views remain open.

### Administration

- A single owner manages the application.
- The owner edits through the same board visitors use, with administration controls available after authorized sign-in.
- The application uses a shared layout for the project pages and sign-in, without separate public/private route groups. `/admin/login` is the intended administrative entry point; management belongs in the shared interface.
- Authorization is enforced by the server and database, independently of which controls are shown.
- The existing dedicated `/admin` placeholder is not a final administration-design decision.

### Columns

- Column CRUD is excluded from the initial product scope. This supersedes the earlier reusable-definition and propagation requirements.
- Projects will use the same predefined set of columns. Define and implement that set during the task CRUD increment, not during project management.
- Four columns were mentioned as a provisional starting point; the owner explicitly left the final count, names and meanings undecided.

The existing database stores columns per project. No schema conversion, column creation, rename, deletion or task movement is authorized by this deferral. The task increment must propose how to populate the selected set for new and existing projects while preserving current data.

### Tasks

- Support creating, reading, updating, deleting and individually hiding tasks.
- Support ordering and moving tasks between columns to change their state.
- Task content includes a title and description.
- Priority, an expected completion date and comments are optional.
- Record the actual completion date automatically when a task is marked completed. It must not be manually editable.
- A hidden task inside a public project is visible only to the administrator.

The completion rule, behavior when reopening a task and detailed interactions remain open. No drag-and-drop library or interaction pattern has been selected.

### Comments

- Only the owner can write comments.
- The owner can choose each comment's visibility.
- Public comments must respect the visibility of their parent task and project; hiding a parent must not expose its comments through another route or query.

Editing, deletion and the presentation of comments still need definition. Comments are not implemented.

### Progress and evolution

- A current-state Kanban is the minimum required experience.
- A combination of history and owner-written updates may be explored.
- History, milestones, versions and update messages do not yet have an approved implementation scope.

Possible approaches are recorded in [Future ideas](ideas.md).

## Technical and quality boundaries

### Shared visual direction

The owner selected a cozy visual direction and the following shared palette. The supplied images are visual references; their sidebar, search, notifications, avatar, controls and workflow labels do not define application features or navigation.

| Palette color | Value | Intended use |
| --- | --- | --- |
| Cream | `#FAF4EE` | Main background |
| Peach | `#EBCDBB` | Secondary surfaces |
| Honey | `#E8B66D` | Accents and active treatments |
| Sage | `#DCE6D3` | Positive treatments |
| Espresso | `#49382F` | Main text and strong outlines |
| Soft peach | `#F5E4DA` | Warm column/surface tint |
| Soft honey | `#FBF9C9` | Highlighted column/surface tint |
| Soft sage | `#E8EFDF` | Positive column/surface tint |

These colors are centralized in CSS and exposed as semantic Tailwind utilities. The base layout now uses the palette for its canvas, sidebar and brand mark. The main area is currently transparent over the canvas. The reference column tints do not establish default columns, fixed task states or automatic mappings from column names to colors. Existing project and task component colors will be migrated as their UI is reviewed.

Rounded cards, soft shadows and pastel labels guide future proposals. The owner selected Dancing Script for main titles, section headings and Kanban column headings, and Handlee for body text, task titles/content, controls, navigation and other interface text. The current base-layout prototype uses provisional drawer rounding, shadow and sidebar proportions for review. Card styling, illustrations, animations and detailed screen composition remain pending their own design review. No component library or additional dependency is adopted.

### Typography

The two fonts are loaded once through `next/font/google` in the root layout and shared across routes. Dancing Script uses its variable 400–700 range, with 700 for main titles and 600 for section/column headings. Handlee provides only 400; body and control text must use that real weight rather than simulated bold or italic.

The default body size is 16px with a 1.6 line height. Section and column headings use 24px; task titles use Handlee at 18px. Existing main-title sizes remain responsive, starting at 30px. Secondary text may use 14px; task metadata and column counts no longer use 12px. CSS/Tailwind variables centralize font roles, while semantic heading elements apply the heading family by default. Task titles explicitly retain the body family even when marked up as headings.

The typography choices do not themselves define navigation or functionality; those decisions are described below. Browser review of font appearance, long headings, accent coverage and mobile wrapping remains necessary before visual acceptance. See [development typography conventions](development.md#typography) for variables and future-component rules.

### Current base-layout prototype

The owner requested a shared cozy shell inspired by the reference, with a left sidebar. The sidebar now includes the Project Garden brand, the owner's unchanged personal logo from the sibling `victor-portfolio` project, and the selected Overview/Projects navigation. The logo links home. `/` retains an empty, accessibly named main area while KPI definitions are pending; it renders no project data, sample metrics, search, notifications, avatar or language form. A keyboard-only skip link targets the main landmark.

The owner corrected the initial inset-panel prototype: the application must fill the viewport, preserve the warm ambient background and remove the cream content panel for now. The peach sidebar sits at the left edge with small top, bottom and left margins so its independent rounding and shadow remain visible. It occupies the viewport height minus those vertical margins and remains in view when retained content scrolls. The main content area is transparent over the shared background. On narrow viewports the sidebar remains on the left as a compact brand rail; its full brand text is visually hidden but available to assistive technology. Exact sidebar widths, spacing, radius, shadow and responsive treatment remain provisional for visual review.

The owner subsequently requested larger sidebar elements. The working prototype now uses a 304px desktop drawer, a 40px logo, 30px brand title, 20px navigation text and 24px navigation icons, with increased link padding and spacing. Below the existing 48rem breakpoint, an 80px icon rail preserves space for the main content and retains accessible text labels. These proportions await visual review rather than constituting final design acceptance.

The owner also requested a small looping cartoon of himself working at a laptop and sipping a hot drink at the bottom of the sidebar. The original eight-pose sheet uses the portfolio portraits as identity references. Generated typing/drinking poses were added, then reduced to brief gestures and long rests after the owner requested calmer motion. The owner subsequently reported no visible animation and explicitly requested video conversion and testing. The current prototype uses two transparent, silent WebM clips with motion-compensated intermediate frames and occasional drinks at clip boundaries. After further reports of a visible cut, typing was revised into a slower continuous cycle with a stable head/body and localized hand/steam movement; the full drinking gesture is retained. The mug has no visible chocolate or stains; steam indicates warmth. A discreet pause/play control remains usable when reduced-motion preferences suppress autoplay. The decoration stays at the bottom of the drawer and is hidden on compact/short viewports. Chrome playback and handoffs can now be inspected through the owner-requested MCP connector; resemblance, perceived naturalness and the revised loop still require owner review. This does not authorize task CRUD implementation.

The former home listing in `components/projects/project-list.tsx` is now mounted at `/projects` and adapted to the shared palette. Existing `/projects/[slug]` routes and authentication behavior are preserved. No language selector is rendered for now; validated existing locale cookies still select translations. Further content requires a separate confirmed scope.

### First-version navigation — selected; KPI definitions pending

The owner selected two primary entries: **Overview** at `/` and **Projects** at `/projects`, with the logo also linking home. An explicit Overview entry makes the destination easier to discover than relying only on the logo. The logo-only alternative was considered. The selected navigation is implemented with translated labels, active-page indication and accessible names on the compact mobile rail; visual acceptance remains pending.

The Projects page reuses the preserved public listing and its anonymous Supabase queries. Initial KPI candidates are exact counts of published projects and publicly readable tasks, obtained from server-side counts through the public client/RLS. Existing list lengths must not be used as totals because the Data API caps responses at 1,000 rows. No KPIs or sample values have been added.

Completion percentages, completed/in-progress counts and historical trends require definitions and potentially schema changes: current columns are arbitrary per project, and completion semantics are still undecided. These metrics must not be inferred from column names or include private owner totals. Future inline administration also requires a confirmed session-refresh and authorization plan for the public routes.

No additional primary entry is recommended for the first version until it has defined content. Owner sign-in could be a small secondary drawer link to the existing route if selected; updates/history can be considered later under the already-open product decisions. These are proposals, not implementation authorization.

### Current supporting-page review

The owner requested login, generic 404 and project-specific 404 to follow the cozy palette and typography, without a language selector for now. These pages now use palette-based surfaces, borders, action styles and visible focus treatment. A shared custom `PageMessage` also supplies generic error-page presentation. The language selector is unmounted; existing locale-cookie behavior is preserved.

The Overview content remains blank pending KPI definitions. The known project-404 initial-HTML limitation remains open despite the updated presentation. Styling and passing HTTP assertions do not establish hydration, responsive visual correctness or final design acceptance.

### Existing boundaries

- Keep Next.js App Router, strict TypeScript without `any`, Supabase PostgreSQL/Auth and one authorized administrator.
- Use Zod for new runtime input validation and infer types from its schemas.
- Use Tailwind CSS; shadcn/ui is the preferred candidate for component tooling, with adoption and configuration still requiring confirmation.
- Keep a single application without an independent backend or additional ORM.
- Do not add public registration, multiuser collaboration, payments or microservices.
- Notifications and realtime functionality are outside the current scope.
- Consider responsive layouts, keyboard interaction, accessibility and loading, empty, unavailable and error states.
- Test database access rules before exposing new public content or enabling writes.

## Implementation and acceptance status

| Area | Current state |
| --- | --- |
| Project foundation | Phase 1 complete |
| Supabase integration, Auth and initial RLS | Phase 2 validated locally; owner account manually authorized locally |
| Public project listing and read-only boards | Listing available at `/projects`; existing board routes preserved; Overview content remains empty until KPIs are defined |
| Administration | Shared views implement creation, reading, editing, publication, lifecycle, required cancellation reasons and listed-but-inaccessible hidden cards. Project DELETE is denied. Local validation passes; visual review of the new controls remains pending |
| Project information | Description and objectives use optional rich-text JSONB; repository is optional HTTPS; editor, public rendering and private image upload/processing are implemented |
| Columns | Stored per project today; column CRUD is excluded from the initial scope. A common predefined set is deferred to task CRUD; count, labels and meanings remain undecided |
| Tasks | Existing schema has title, optional description, optional priority, optional `due_date`, column, ordering and timestamps |
| New task requirements | Individual hiding, automatic actual completion date and comments are not implemented; expected-date semantics need review against `due_date` |
| Language | English instructions and documentation; existing interface localized in English, Spanish and Catalan, with cookie selection and English fallback |
| Visual foundation | Cozy palette centralized in CSS; shared sidebar shell implemented provisionally for visual review; project and task component restyling remains pending |
| Hosting and remote services | No deployments or remote Supabase connection |

The schema is an implementation baseline that can be revised through confirmed, versioned migrations. Its existing fields and constraints do not settle open product decisions.

Project 404 responses currently deliver localized content through the React payload but have an empty initial HTML body. Resolving that rendering limitation and verifying hydration remain pending; see [Validation](validation.md#project-404-rendering-limitation).

## Decisions required before the relevant implementation

1. Home-page content, navigation and project information/board entry points.
2. Screen-level visual design beyond the selected cozy direction and palette, component-library adoption and the review method for each UI change.
3. Code-structure adjustments justified by the selected screens and interactions.
4. The common predefined column set (final count, labels and meanings), its initial population and data-preserving migration during task CRUD; column CRUD is excluded.
5. Task completion semantics, automatic date behavior and reopening rules.
6. Task ordering/movement interactions and deletion or archival behavior.
7. Comment visibility options, editing and deletion.
8. Presentation of project evolution, if brought into a later task's scope.

## Earlier work boundary - superseded by the project increments below

Interface internationalization is implemented. The owner subsequently approved removing the `(public)` route group and sharing the root layout with the sign-in page, keeping existing URLs and authentication behavior. This structure decision does not accept the remaining phase 3 navigation or visual design. The language selector is a provisional native form; shadcn/ui adoption, administration CRUD, role-aware board queries and database changes remain outside this adjustment. The existing `/admin` authorization placeholder is preserved until inline administration is implemented. Further UI work requires its own confirmed scope.

The name, base layout and typography are committed. The current iteration reviews code structure and security, implements the owner-selected sidebar and Projects page, enlarges the sidebar elements, adapts login/404/error presentation and removes the visible language selector. The owner authorized committing this work by responsibility and approved production-secure Auth cookies plus HTTPS Supabase origins with explicit local HTTP exceptions. No schema, dependency or administration-CRUD change is included. KPI definitions and visual acceptance remain pending.

Successful tests do not imply acceptance of provisional product or design decisions. Phase 3 remains pending acceptance until the owner reviews those decisions. Future phases, deployments and remote operations require explicit confirmation.

### Project CRUD increment — scope confirmed on 2026-11-14

The owner requested starting project CRUD interactively and confirmed that objectives and a repository link are included in this increment. Zod and strict typing without `any` have also been selected. The owner subsequently confirmed optional supporting fields, HTTPS repository URLs, Tiptap, JSONB content and private image delivery as recorded below. Shared-route administrator access was subsequently confirmed as recorded below. The 2026-11-20 decision below excludes project deletion and introduces cancellation with a required reason.
### Rich project content — confirmed on 2026-11-14

The owner selected a substantial visual rich-text editor for description and objectives, including image support. Tiptap, strict Zod-validated JSONB documents, Supabase Storage in a private bucket and controlled image delivery through Next.js are confirmed (ADRs 0001 and 0002). Optional description/objectives/repository values may be empty even when publishing. The repository is an optional HTTPS URL, without embedded credentials, at most 2,048 characters and not restricted to a provider. Supporting information follows project publication.

The initial /admin editor prototype has been superseded by the owner-confirmed shared project views described below. Image processing dependencies, detailed upload limits and lifecycle behavior must remain explicit in implementation status. Deleting projects still needs a decision about the existing cascading deletion of columns and tasks.

### Rich-text implementation status — 2026-11-14

The shared Projects listing provides draft creation and project selection; the shared detail view provides editing and separate publish/hide actions. Deletion is not exposed. Public queries remain anonymous and session-independent; administrator previews use an explicit private image request. Session refresh covers /admin, /projects and /project-images, with independent server authorization for private operations.

Supported documents include paragraphs, level 2/3 headings, bold/italic/strike/inline code, HTTPS links, nested lists, paragraph-only quotes, code blocks, dividers and stable image references. List items contain paragraphs and nested lists; images are top-level blocks. Limits are 50,000 Unicode code points, 200,000 serialized UTF-8 bytes, 2,000 typed nodes, structural depth 24 and 20 image nodes per field. Empty textual content is null unless it contains an image. Cards display a 240-character plain summary and metadata uses plain text. The original description column remains a derived plain-text compatibility field capped at its existing 5,000-character limit.

A scoped system font is provisionally used inside rich content so real bold and italic faces are visible, without changing shell typography or adding fonts. The form presentation, toolbar and typography require owner visual review; its placement in shared project views is confirmed. No browser or responsive/keyboard interaction review has been performed yet.

The additive local migration, controlled download route and Sharp upload processing are implemented and tested with real image bytes. Sharp 0.35.5 is an accepted direct server dependency. Uploads accept JPEG/PNG/WebP and normalize to WebP without metadata, within the source/output limits recorded below. File cleanup and project deletion remain pending decisions.

## Shared project management follow-up - 2026-11-14

The owner confirmed project creation from a button in Projects, opening the
form in that view, and editing through the shared project detail view.
/admin has no project-management role; it authenticates and redirects to
Projects. This supersedes the earlier provisional /admin editor placement.
Authenticated administrators see drafts and visibility labels in Projects,
and an edit button on project details. Visitors retain published-only
access. Task CRUD will follow the same shared-view direction but is not
implemented by this project increment.

Sharp 0.35.5 has been accepted and incorporated for image upload processing.
The editor accepts JPEG, PNG and WebP after the first draft save; uploads
are at most 8 MiB and 25 million pixels, single-frame, and normalized to
WebP with no retained metadata, at most 4,096 pixels per side and 2 MiB.
Images are inserted as root document blocks with required alternative text.
Saving applies document references; removing a node does not delete the
stored file. Successful uploads abandoned before saving remain private.
No existing files are automatically deleted. Project deletion and its
column/task/file behavior still require the owner's decision.

The initial inline form presentation was provisional and is superseded by
the owner-requested modal below. Toolbar, rich-text font and the modal's
visual presentation still require owner review before acceptance.

### Project session-control follow-up - 2026-11-15

The owner requested removing the separate sign-out control from the
Projects listing because main already manages session controls in the
shared shell. This branch no longer adds a project-level sign-out button.
The shared session controls remain owned by main; main has not been merged
into this worktree as part of this focused correction.

### Project form modal - 2026-11-15

The owner requested a modal form, initially with a left-aligned creation
button. The subsequent style revision below moves actions to the right.
Creation and editing now use a native dialog from their existing shared
project views. The form remains lazy-loaded, with internal scrolling on
small screens and a visible close button. Its title receives initial
focus; Tab and Shift+Tab stay within the modal, Escape closes it when idle,
and closing restores focus to the opening button. Background interaction
and scrolling are blocked while it is open. Saving, publishing and image
uploads block dismissal. Closing an idle form discards unsaved edits as
before; no autosave or file-cleanup policy is added. Modal width, spacing
and styling are a working prototype awaiting owner visual review.

### Cozy modal and editor styling refinement - 2026-11-15

The owner requested right-aligned actions, a gentle modal entrance, an X
in the header, a labelled close action at the bottom, and a review of the
rich-text fields' appearance. Creation/editing buttons now align right.
The creation button shares the introduction row from 1,024px viewport width;
below that breakpoint it follows the description and fills the available
content width, as subsequently requested by the owner.
The modal keeps its X in the header and Close/Save actions together in a
fixed footer, with only the form body scrolling. Publication, link and
image-upload actions also align right where space allows.

The working prototype uses a short fade and soft upward/scale entrance,
a fading blurred backdrop, warm cream/peach surfaces and honey accents.
Reduced-motion preferences disable the entrance and interaction transitions.
Rich-text controls use compact grouped icons with translated accessible
names and hover titles, 44px targets, visible pressed/focus states, softer
field borders and a localized empty-writing hint. Supported formatting and
content limits remain unchanged. Exact styling remains provisional for
owner review; no dependency is added.


### Project visibility and board-focused detail - 2026-11-15

The owner requested a publication switch in creation and editing. Both
modes use the same modal/form with optional initial project values. New
forms default to private; saving explicitly applies the switch together
with content in one project mutation. Editing a published project saves
its content and selected visibility together. The previous separate
Publish/Hide action is superseded. Saving redirects to the project board
without automatically opening the editor. Explicit edit=1 links remain
available for direct editor entry.

The detail page now concentrates on the board with compact back/edit
controls and an administrator visibility badge. Description, objectives
and repository are retained as stored, editable content but have no
visible detail section. The project name remains an accessible heading
and public metadata continues to use published content. The future
information presentation is undecided; this layout remains WIP.

Images during creation are requested but their staging and failure
lifecycle await the owner decision described in ADR 0002. The current
upload still requires an existing project; no automatic draft-on-upload
or temporary Storage policy has been introduced.


### Project title, information and requested data fields - 2026-11-15

The owner requested a visible title with an adjacent information icon.
The icon opens description, objectives and repository in a cozy native
dialog, including an empty-information state. The verified administrator
has an Edit project button beside the title; visitors have no edit
control. The fixed Read only badge is removed. The board remains the
primary page content. Visual review remains pending.

The owner also requested a lifecycle status with Active / in development,
Maintenance, Completed and Cancelled, plus an independent hidden flag.
These data fields are not implemented yet: hidden access semantics and
the default status for existing projects require confirmation. ADR 0001
contains the concrete migration/access proposal. The currently implemented
visibility model still has only is_published. The creation-image staging
proposal remains pending and is not included in this UI adjustment.

### Information modal edit action refinement - 2026-11-15

The owner moved Edit project into the information modal footer. The title
row now contains the information icon and administrator visibility badge,
without an external edit button. The icon has no border or background,
while retaining a 44px target, accessible name and visible keyboard focus.
For the verified administrator, Edit project switches the same dialog to
the existing shared form; no second modal is stacked. Closing and reopening
returns to information. Explicit edit=1 entry and save redirects remain.
This supersedes the earlier placement beside the title. Visual acceptance
is pending; lifecycle and hidden semantics remain awaiting confirmation.

The owner requested larger Description and Objectives subheadings in the
information modal. Both use 24px text at all viewport sizes, retaining the
existing script typeface and heading semantics. Visual review is pending.

### Images during project creation - 2026-11-15

The owner accepted the creation-image staging proposal in ADR 0002.
Creation now accepts images in description and objectives before the
project exists. Files/previews remain local until Create, with 8 MiB per
file and a 32 MiB shared file budget across both fields. Files retained
for undo count against that session budget; decoded browser memory may
be greater. Closing before saving creates no project or asset.

Saving first creates a private draft, uploads referenced files one at a
time and saves successful references privately before applying requested
publication. A stable attempt ID prevents duplicate draft creation after
a lost initial response. If an upload fails, the form retains text, files,
the private draft and known successful asset IDs for retry on that same
project. It also saves successful image references to the draft where
possible. Closing after failure discards remaining local files but keeps
the draft and saved images; the UI explains this. Saving finishes on the
project route without automatically opening another modal.

Existing project editing retains immediate uploads followed by explicit
content saving. Storage remains private with controlled delivery, no new
dependency or migration, and no automatic orphan cleanup. The multipart
reader now preserves browser boundary case so ordinary browser uploads
are parsed correctly. Visual acceptance remains pending.


### Image selection and keyboard submission safety - 2026-11-20

A reproduced form bug submitted the project when Enter was pressed in an
image's alternative-text field, dropping the selected file before insertion.
Enter now validates and inserts that image, keeping the project form open.
Explicit project saving is blocked while either field still has a selected
file awaiting insertion. The form explains the issue and focuses the pending
file; the owner can insert it or discard the selection before saving.

Provisional UI feedback distinguishes selection, local insertion awaiting
creation, and completed upload awaiting content save. Alternative text is
visibly required for insertion and validation errors are associated with its
input. Creation's button says Insert image because upload still waits for
Create project. The accepted staging, visibility and Storage policies are
unchanged. The feedback presentation remains pending owner review.

### Project management closure decisions - 2026-11-20

The owner verified that image insertion/upload now works correctly. This accepts
that reported image flow; it does not constitute acceptance of every prior UI
or the whole project-management increment.

The owner selected the following remaining project requirements:

- Projects cannot be deleted. Cancelled is a lifecycle state and must have a
  reason stored in an additional field. Preserve project content and descendants.
- The lifecycle values are Active / in development, Maintenance, Completed and
  Cancelled. Both existing and new projects start as Active / in development.
- Hidden is independent of publication. Published hidden projects remain in
  Projects, but visitors cannot open the card or access the project by URL.
  Protect detail content, boards, images, metadata and direct data access;
  the administrator must retain management access.
- Column CRUD is excluded from the initial scope. During task CRUD, define a
  common set used by all projects. Four is provisional; the final count, labels
  and meanings still need the owner's decision.

These requirements supersede the 2026-11-15 unlisted-hidden proposal and earlier
project-deletion/reusable-column plans. The owner confirmed the concrete plan
and instructed implementation. Cancellation uses plain text up to 2,000 Unicode
code points, retained when leaving Cancelled and shown in project information
only while cancelled. Lifecycle is independent of publication and hiding.

The two local migrations are applied: lifecycle/hidden/reason fields, public
summary RPC, content/descendant RLS and application DELETE denial, followed by a
Unicode-whitespace constraint correction. Shared creation/editing controls and
status/reason presentation are implemented in English, Spanish and Catalan.
Published hidden cards expose name/status without navigation or content to
visitors; owner cards retain management access. Database, HTTP and isolated
browser tests pass. The new form/card presentation remains pending owner visual
review; see ADRs 0001/0002 and validation.md. No task or column CRUD was added.
