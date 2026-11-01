# Product requirements and open decisions

These requirements record the owner's product direction. They describe the intended product, not features already implemented or authorization to implement them all. Each task needs its own confirmed scope under [AGENTS.md](../AGENTS.md).

## Purpose and audience

Visitors should be able to understand the state of the owner's projects, explore their tasks and find supporting project information. The minimum experience is a conventional Kanban showing current progress. How to present changes over time remains undecided.

Portfolio Kanban will be the first project featured in the projects section of the owner's personal website. The repository, documentation and interface use English to reach an international audience, including recruiters. Existing interface text will be translated during the subsequent UI work.

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
| Language | Instructions and documentation are English; existing Spanish interface text is preserved for the UI iteration |
| Hosting and remote services | No deployments or remote Supabase connection |

The schema is an implementation baseline that can be revised through confirmed, versioned migrations. Its existing fields and constraints do not settle open product decisions.

## Decisions required before the relevant implementation

1. Home-page content, navigation and project information/board entry points.
2. Visual design, component-library adoption and review method for the proposed UI change.
3. Code-structure adjustments justified by the selected screens and interactions.
4. Reusable column modeling, propagation choices and deletion behavior.
5. Task completion semantics, automatic date behavior and reopening rules.
6. Task ordering/movement interactions and deletion or archival behavior.
7. Comment visibility options, editing and deletion.
8. Presentation of project evolution, if brought into a later task's scope.

## Current work boundary

The current iteration updates instructions and documentation. Existing UI and application code are preserved. The next implementation task must first propose the navigation, UI and structure review scope.

Successful tests do not imply acceptance of provisional product or design decisions. Phase 3 remains pending acceptance until the owner reviews those decisions. Future phases, deployments and remote operations require explicit confirmation.
