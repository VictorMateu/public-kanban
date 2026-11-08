# Product requirements and open decisions

These requirements record the owner's product direction. They describe the intended product, not features already implemented or authorization to implement them all. Each task needs its own confirmed scope under [AGENTS.md](../AGENTS.md).

## Purpose and audience

Visitors should be able to understand the state of the owner's projects, explore their tasks and find supporting project information. The minimum experience is a conventional Kanban showing current progress. How to present changes over time remains undecided.

Portfolio Kanban will be the first project featured in the projects section of the owner's personal website. Repository instructions, documentation and code use English to reach an international audience, including recruiters. The interface supports English (default), Spanish and Catalan from this initial stage, with progressive translation through `next-intl` message catalogs.

Language preference is stored in a cookie while URLs remain unchanged. Without a valid preference, English is used regardless of browser-language headers. Localizing project or task content is outside this interface-only scope.

## Confirmed requirements

### Projects and public information

- Provide a project listing; more than one project may be active at a time.
- Each project has its own independent board and tasks.
- Initial supporting information includes a description, objectives and a repository link.
- The owner can create, read, update, delete, publish and hide projects.
- Visitors can access only published content. Unpublished projects remain private.

The home page may show a summary, all projects or another presentation chosen after exploring alternatives. The project entry point and navigation between information and board views remain open.

### Administration

- A single owner manages the application.
- The owner edits through the same board visitors use, with administration controls available after authorized sign-in.
- Authorization is enforced by the server and database, independently of which controls are shown.
- The existing dedicated `/admin` placeholder is not a final administration-design decision.

### Columns

- Support creating, reading, updating, deleting and ordering columns.
- Projects choose which columns they use; column definitions may be reused across projects.
- When changing a definition used by multiple projects, offer a choice between applying the change only to the current project or propagating it to other projects using that definition.
- No fixed set of default columns has been selected.

Storage, propagation details and the behavior of deleting a populated or reused column need a proposal before implementation. Reusable definitions are not present in the existing schema.

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

The current scope centralizes these colors in CSS and exposes semantic Tailwind utilities, applying only the global background and text colors. The reference column tints do not establish default columns, fixed task states or automatic mappings from column names to colors. Existing component colors will be migrated as their UI is reviewed.

Rounded cards, soft shadows, pastel labels and readable, slightly rounded typography guide future proposals. Font selection, exact radii and shadows, illustrations, animations and screen composition remain pending their own design review. No component library or additional dependency is adopted by this palette work.

### Existing boundaries

- Keep Next.js App Router, strict TypeScript, Supabase PostgreSQL/Auth and one authorized administrator.
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
| Public project listing and read-only boards | Existing phase 3 implementation preserved; navigation, design and structure acceptance pending |
| Administration | Sign-in, authorization and sign-out exist; administration CRUD is not implemented |
| Project information | Existing schema has name, slug, description, publication, ordering and timestamps; objectives and repository link are not implemented |
| Columns | Currently stored per project; reusable definitions and propagation choices are not implemented |
| Tasks | Existing schema has title, optional description, optional priority, optional `due_date`, column, ordering and timestamps |
| New task requirements | Individual hiding, automatic actual completion date and comments are not implemented; expected-date semantics need review against `due_date` |
| Language | English instructions and documentation; existing interface localized in English, Spanish and Catalan, with cookie selection and English fallback |
| Visual foundation | Cozy palette centralized in CSS with semantic Tailwind colors; component restyling and detailed visual standards remain pending |
| Hosting and remote services | No deployments or remote Supabase connection |

The schema is an implementation baseline that can be revised through confirmed, versioned migrations. Its existing fields and constraints do not settle open product decisions.

Project 404 responses currently deliver localized content through the React payload but have an empty initial HTML body. Resolving that rendering limitation and verifying hydration remain pending; see [Validation](validation.md#project-404-rendering-limitation).

## Decisions required before the relevant implementation

1. Home-page content, navigation and project information/board entry points.
2. Screen-level visual design beyond the selected cozy direction and palette, component-library adoption and the review method for each UI change.
3. Code-structure adjustments justified by the selected screens and interactions.
4. Reusable column modeling, propagation choices and deletion behavior.
5. Task completion semantics, automatic date behavior and reopening rules.
6. Task ordering/movement interactions and deletion or archival behavior.
7. Comment visibility options, editing and deletion.
8. Presentation of project evolution, if brought into a later task's scope.

## Current work boundary

Interface internationalization is implemented. The owner has selected the cozy visual direction and palette above. The current palette task adds shared color tokens and connects the global background/text only. It does not redesign existing components, change layouts or settle the remaining visual and navigation decisions. The language selector remains provisional; shadcn/ui adoption, administration CRUD, role-aware board queries and database changes remain outside this task. Further UI work requires its own confirmed scope.

Successful tests do not imply acceptance of provisional product or design decisions. Phase 3 remains pending acceptance until the owner reviews those decisions. Future phases, deployments and remote operations require explicit confirmation.
