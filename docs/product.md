# Product requirements and open decisions

These requirements record the owner's product direction. They describe the intended product, not features already implemented or authorization to implement them all. Each task needs its own confirmed scope under [AGENTS.md](../AGENTS.md).

## Purpose and audience

The owner selected Project Garden as the application's name. It is a brand name shared by all interface languages, with a single source in `Common.appName` in the English message catalog; other locales inherit it through the existing English fallback. The sidebar presents it as a visual title in Dancing Script at 24px and weight 600.

Visitors should be able to understand the state of the owner's projects, explore their tasks and find supporting project information. The minimum experience is a conventional Kanban showing current progress. How to present changes over time remains undecided.

Project Garden will be the first project featured in the projects section of the owner's personal website. Repository instructions, documentation and code use English to reach an international audience, including recruiters. The interface supports English (default), Spanish and Catalan from this initial stage, with progressive translation through `next-intl` message catalogs.

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
- The application uses a shared layout for the project pages and sign-in, without separate public/private route groups. `/admin/login` is the intended administrative entry point; management belongs in the shared interface.
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

These colors are centralized in CSS and exposed as semantic Tailwind utilities. The base layout now uses the palette for its canvas, sidebar and brand mark. The main area is currently transparent over the canvas. The reference column tints do not establish default columns, fixed task states or automatic mappings from column names to colors. Existing project and task component colors will be migrated as their UI is reviewed.

Rounded cards, soft shadows and pastel labels guide future proposals. The owner selected Dancing Script for main titles, section headings and Kanban column headings, and Handlee for body text, task titles/content, controls, navigation and other interface text. The current base-layout prototype uses provisional drawer rounding, shadow and sidebar proportions for review. Card styling, illustrations, animations and detailed screen composition remain pending their own design review. No component library or additional dependency is adopted.

### Typography

The two fonts are loaded once through `next/font/google` in the root layout and shared across routes. Dancing Script uses its variable 400–700 range, with 700 for main titles and 600 for section/column headings. Handlee provides only 400; body and control text must use that real weight rather than simulated bold or italic.

The default body size is 16px with a 1.6 line height. Section and column headings use 24px; task titles use Handlee at 18px. Existing main-title sizes remain responsive, starting at 30px. Secondary text may use 14px; task metadata and column counts no longer use 12px. CSS/Tailwind variables centralize font roles, while semantic heading elements apply the heading family by default. Task titles explicitly retain the body family even when marked up as headings.

This task changes typography only. The initial screen stays blank, the personal logo and layout remain unchanged, and no new navigation or functionality is introduced. Browser review of font appearance, long headings, accent coverage and mobile wrapping remains necessary before visual acceptance. See [development typography conventions](development.md#typography) for variables and future-component rules.

### Current base-layout prototype

The owner requested a shared cozy shell inspired by the reference, with a left sidebar and a blank initial content area. `/` intentionally renders no project listing, heading, cards, columns, menus, search, notifications, avatar, language form or visible navigation. The sidebar contains only the Project Garden brand and the owner's personal logo, copied unchanged from the sibling `victor-portfolio` project in its original green variant. A keyboard-only skip link targets the empty, accessibly named main landmark.

The owner corrected the initial inset-panel prototype: the application must fill the viewport, preserve the warm ambient background and remove the cream content panel for now. The peach sidebar sits at the left edge with small top, bottom and left margins so its independent rounding and shadow remain visible. It occupies the viewport height minus those vertical margins and remains in view when retained content scrolls. The main content area is transparent over the shared background. On narrow viewports the sidebar remains on the left as a compact brand rail; its full brand text is visually hidden but available to assistive technology. Exact sidebar widths, spacing, radius, shadow and responsive treatment remain provisional for visual review.

The earlier project-list and board implementation remains uncommitted and outside the base-layout commit. In the combined working tree, the former home listing is preserved in `components/project-list.tsx` and is not mounted on any route. Existing `/projects/[slug]` routes and authentication behavior are preserved. The native language selector remains available on `/admin/login`; its absence on the blank initial screen does not remove cookie-based localization. Navigation and further content require a separate confirmed scope.

### Existing boundaries

- Keep Next.js App Router, strict TypeScript, Supabase PostgreSQL/Auth and one authorized administrator.
- Use Tailwind CSS; shadcn/ui is the preferred candidate for component tooling, with adoption and configuration still requiring confirmation.
- Keep a single application without an independent backend or additional ORM.
- Do not add public registration, multiuser collaboration, payments or microservices.
- Notifications and realtime functionality are outside the current scope.
- Consider responsive layouts, keyboard interaction, accessibility and loading, empty, unavailable and error states.
- Test database access rules before exposing new public content or enabling writes.

## Implementation and acceptance status

This inventory also describes preserved uncommitted board work. The base-layout commit contains the blank home, shared shell and existing authentication routes; it excludes the project-list and board implementation.

| Area | Current state |
| --- | --- |
| Project foundation | Phase 1 complete |
| Supabase integration, Auth and initial RLS | Phase 2 validated locally; owner account manually authorized locally |
| Public project listing and read-only boards | Former listing preserved as an unmounted component; existing board routes remain available directly; home is intentionally blank during base-layout review |
| Administration | Sign-in, authorization and sign-out exist; administration CRUD is not implemented |
| Project information | Existing schema has name, slug, description, publication, ordering and timestamps; objectives and repository link are not implemented |
| Columns | Currently stored per project; reusable definitions and propagation choices are not implemented |
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
4. Reusable column modeling, propagation choices and deletion behavior.
5. Task completion semantics, automatic date behavior and reopening rules.
6. Task ordering/movement interactions and deletion or archival behavior.
7. Comment visibility options, editing and deletion.
8. Presentation of project evolution, if brought into a later task's scope.

## Current work boundary

Interface internationalization is implemented. The owner subsequently approved removing the `(public)` route group and sharing the root layout with the sign-in page, keeping existing URLs and authentication behavior. This structure decision does not accept the remaining phase 3 navigation or visual design. The language selector is a provisional native form; shadcn/ui adoption, administration CRUD, role-aware board queries and database changes remain outside this adjustment. The existing `/admin` authorization placeholder is preserved until inline administration is implemented. Further UI work requires its own confirmed scope.

The cozy palette foundation is committed. The owner has now requested the base sidebar layout above, with the initial screen kept blank and without navigation. This task implements that provisional shell, preserves the previous listing outside the active home route and moves language selection to the existing sign-in page. It does not redesign the board, add navigation, change authentication or implement administration CRUD. The layout remains pending visual acceptance.

Successful tests do not imply acceptance of provisional product or design decisions. Phase 3 remains pending acceptance until the owner reviews those decisions. Future phases, deployments and remote operations require explicit confirmation.
