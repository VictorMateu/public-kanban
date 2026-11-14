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
- The owner can create, read, update, delete, publish and hide projects.
- Visitors can access only published content. Unpublished projects remain private.

The owner selected a presentation-only summary for the home page, with an introduction, project/task metrics and an activity area. The separate Projects route remains the project listing entry point. Navigation between project information and board views remains open.

### Administration

- A single owner manages the application.
- The owner edits through the same board visitors use, with administration controls available after authorized sign-in.
- The application uses a shared layout for the project pages and sign-in, without separate public/private route groups. `/admin/login` is the intended administrative entry point; management belongs in the shared interface.
- Authorization is enforced by the server and database, independently of which controls are shown.
- The owner selected Overview as the landing page after sign-in and sign-out. The legacy `/admin` route checks authorization and redirects an authorized owner to Overview; anonymous visitors are redirected to sign-in. This does not implement administration CRUD.

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

The typography choices do not themselves define navigation or functionality; those decisions are described below. Browser review of font appearance, long headings, accent coverage and mobile wrapping remains necessary before visual acceptance. See [development typography conventions](development.md#typography) for variables and future-component rules.

### Current base-layout prototype

The owner requested a shared cozy shell inspired by the reference, with a left sidebar. The sidebar now includes the Project Garden brand, the owner's unchanged personal logo from the sibling `victor-portfolio` project, and the selected Overview/Projects navigation. The logo links home. `/` now presents the owner-selected responsive Overview composition described below. It renders pending metric values and an activity placeholder, without querying or serializing project/task data. A keyboard-only skip link targets the main landmark.

The owner corrected the initial inset-panel prototype: the application must fill the viewport, preserve the warm ambient background and remove the cream content panel for now. The peach sidebar sits at the left edge with small top, bottom and left margins so its independent rounding and shadow remain visible. It occupies the viewport height minus those vertical margins and remains in view when retained content scrolls. The main content area is transparent over the shared background. Below 64rem in the current responsive prototype, the sidebar becomes a top bar with the brand and an icon-only circular toggle with translated accessible labels. The button opens a floating panel over the content, containing the same navigation and language selector without a decorative image or video. Opening the panel does not change the content position. A gentle fade, small slide and scale animate its entrance; reduced-motion preferences disable the animation. Exact sidebar widths, spacing, radius, shadow and responsive treatment remain provisional for visual review.

The owner subsequently requested larger sidebar elements. The working prototype now uses a 304px desktop drawer, a 40px logo, 30px brand title, 20px navigation text and 24px navigation icons, with increased link padding and spacing. Below the initial 48rem breakpoint (now 64rem for tablet layouts), the owner subsequently requested a collapsible menu instead of the initial 80px icon rail; expanded links retain their full visible labels. These proportions await visual review rather than constituting final design acceptance.

The owner also requested a small looping cartoon of himself working at a laptop and sipping a hot drink at the bottom of the sidebar. The original eight-pose sheet uses the portfolio portraits as identity references. Generated typing/drinking poses were added, then reduced to brief gestures and long rests after the owner requested calmer motion. The owner subsequently reported no visible animation and explicitly requested video conversion and testing. The current prototype uses two transparent, silent WebM clips with motion-compensated intermediate frames and occasional drinks at clip boundaries. After further reports of a visible cut, typing was revised into a slower continuous cycle with a stable head/body and localized hand/steam movement; the full drinking gesture is retained. The mug has no visible chocolate or stains; steam indicates warmth. A discreet pause/play control remains usable when reduced-motion preferences suppress autoplay. The decoration stays at the bottom of the drawer and is hidden on compact/short viewports. Chrome playback and handoffs can now be inspected through the owner-requested MCP connector; resemblance, perceived naturalness and the revised loop still require owner review. This does not authorize task CRUD implementation.

The former home listing in `components/projects/project-list.tsx` is now mounted at `/projects` and adapted to the shared palette. Existing `/projects/[slug]` routes are preserved. At the owner's request on 2026-11-14, a circular user icon now appears at the upper right of the content area, outside the sidebar only after the existing server verification confirms the administrator. The owner subsequently requested the sign-out disclosure described below. Sign-in and sign-out invalidate the shared layout to refresh the account control. Auth failures omit the control without blocking public browsing; public data queries remain anonymous. This display does not extend session-refresh coverage beyond the existing `/admin` proxy matcher.

The same adjustment restores the native language form beneath the animation. After the owner requested a cozier appearance, the current prototype presents EN/ES/CA as three rounded buttons in a cream capsule, with a honey background identifying the selected language. Each button submits its locale directly, without a separate Apply step. The options form a horizontal capsule on desktop and inside the expanded mobile menu. On short desktop viewports the form remains available while the illustration is omitted. Language validation, preference cookies and unchanged URLs are preserved. Exact icon placement, spacing and selector appearance form a working prototype pending owner review; no dependencies, schema changes or CRUD are included. The account disclosure was requested separately and is described below. Further content requires a separate confirmed scope.

### First-version navigation — selected; KPI definitions pending

The owner selected two primary entries: **Overview** at `/` and **Projects** at `/projects`, with the logo also linking home. An explicit Overview entry makes the destination easier to discover than relying only on the logo. The logo-only alternative was considered. The selected navigation is implemented with translated labels, active-page indication and full labels inside the mobile disclosure; visual acceptance remains pending.

The Projects page reuses the preserved public listing and its anonymous Supabase queries. The owner approved an initial presentation-only Overview: a title, short introduction and personal-website link; four project metrics (total/open/completed/canceled); four equivalent task metrics; and an activity area with task/project and month/day selectors. Tasks by month is the default. All eight values display an em dash with an accessible pending label. The chart area contains no simulated observations, dates or numerical axes. Future exact counts must use the public client/RLS rather than list lengths, because the Data API caps responses at 1,000 rows.

The owner subsequently requested adapting the summary to the available screen so it can be read without vertical scrolling. The working prototype now bounds spacing and chart height by the viewport, keeps project counts in four columns when the content has at least 34rem, and distributes the activity and task panels through the remaining height, capped at 28rem so tall displays do not stretch the panels indefinitely. The personal link sits beside the introduction at that width. Below 64rem of viewport width, the existing top-bar disclosure replaces the desktop drawer, including its static session indicator and menu logout. Narrow phones and enlarged text retain document scrolling to preserve readable text, complete content and touch targets. This refinement does not impose a one-screen constraint on growing project lists or boards. The owner then requested preserving compact desktop proportions and revising the mobile composition. Below 34rem of content width, project/task metrics now precede the activity card, the repeated application eyebrow is omitted, headings are smaller and sections have consistent side padding and spacing. At least 20rem of content width allows labels/values to sit side by side within metric cells; narrower cells keep them stacked. Activity selectors use equal-width full rows on narrow phones, or two groups alongside each other once 22rem of content width is available. The mobile plot has a compact minimum height and does not stretch to fill the screen. The owner subsequently clarified that large displays should enlarge the complete interface rather than only the panel height. The provisional revision scales the rem-based type, controls, sidebar and cards together when both viewport dimensions allow it, with an 88rem summary width bound. Compact windows keep the base scale; the 28rem panel-height bound scales with the rest of the interface. Mobile retains its own readable composition and normal scrolling. The owner approved the current proportions and requested additional breathing room above the desktop summary. The prototype adds bounded top padding to the summary at the desktop breakpoint; that spacing refinement remains pending visual review. This approval does not establish acceptance of the remaining UI or data integration.

A separate thread is defining the data model. The displayed lifecycle labels are a presentation choice and do not establish database fields, column semantics or completion rules. Creation/completion dates, reopened/canceled behavior and historical aggregation remain pending that work. The Overview query boundary contains TODOs and returns only an explicit pending state; it makes no Supabase calls. No completion state is inferred from column names and no private owner totals are included. Future inline administration also requires a confirmed session-refresh and authorization plan for the public routes.

No additional primary entry is recommended for the first version until it has defined content. Owner sign-in could be a small secondary drawer link to the existing route if selected; updates/history can be considered later under the already-open product decisions. These are proposals, not implementation authorization.

### Current supporting-page review

The owner requested login, generic 404 and project-specific 404 to follow the cozy palette and typography, initially without a language selector. These pages now use palette-based surfaces, borders, action styles and visible focus treatment. A shared custom `PageMessage` also supplies generic error-page presentation. The 2026-11-14 adjustment restores the language selector in their shared sidebar; existing locale-cookie behavior is preserved.

The Overview uses a two-column project-metric grid on narrow content widths. Container queries expand it to four columns and place the activity area beside compact task metrics when at least 40rem of content space is available. The personal website URL comes from the existing portfolio configuration. The owner accepted this first Overview presentation, including its responsive treatment, on 2026-11-14. Real metrics and activity integration remain outside this acceptance. The known project-404 initial-HTML limitation remains open despite the updated presentation. Styling and passing HTTP assertions do not establish hydration, responsive visual correctness or final design acceptance.

### Owner account disclosure and sign-in landing

On 2026-11-14, the owner requested returning to Overview after sign-in and opening a small cozy disclosure from the existing administrator icon to sign out and inspect the public view. The desktop account control remains outside the sidebar at the upper right and is rendered only after server-side administrator verification. It opens on mouse hover or click and by keyboard. The owner subsequently rejected a separate mobile account dropdown: below the current 64rem navigation breakpoint, the session sphere belongs in the main top bar as a noninteractive indicator, and sign-out belongs inside the expanded main navigation panel below the language selector. Mobile has no external account row or avatar dropdown. Both responsive variants retain the same server-side administrator verification. The panel overlays the page and uses rounded cream surfaces, existing palette tokens and a short entrance animation with reduced-motion support. Escape, outside pointer actions and focus leaving close it. The sign-out action retains pending/error feedback, and both successful authentication transitions refresh the shared layout before returning to Overview. An authorized visit to the login page or legacy administration route also returns to Overview.

A future Settings entry has no current feature scope. Mobile settings access was initially discussed for the account disclosure. That mobile disclosure has since been replaced by a static indicator and sign-out in the main navigation panel, so revisit future settings placement against this corrected design. Whether desktop needs settings at all, and whether to place them in the account disclosure or the main navigation, remain open decisions. No settings screen, placeholder link or new primary navigation item is implemented. The exact disclosure wording, spacing and motion remain pending the owner's visual review.

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
| Public project listing and read-only boards | Listing available at `/projects`; existing board routes preserved; Overview has a responsive presentation-only summary; metrics and activity remain pending |
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

Interface internationalization is implemented. The owner subsequently approved removing the `(public)` route group and sharing the root layout with the sign-in page, keeping existing URLs and authentication behavior. This structure decision does not accept the remaining phase 3 navigation or visual design. The language selector is a provisional native form; shadcn/ui adoption, administration CRUD, role-aware board queries and database changes remain outside this adjustment. The legacy `/admin` route now checks authorization and redirects an authorized owner to Overview; inline administration remains unimplemented. Further UI work requires its own confirmed scope.

The name, base layout and typography are committed. Earlier iterations reviewed code structure and security, implemented the owner-selected sidebar and Projects page, enlarged the sidebar elements, adapted login/404/error presentation and removed the visible language selector. The owner authorized committing that work by responsibility and approved production-secure Auth cookies plus HTTPS Supabase origins with explicit local HTTP exceptions. The current 2026-11-14 scope restores the sidebar language selector, adds the verified administrator icon described above and adapts the mobile navigation to the owner-requested disclosure. Decorative media mounts only after the browser confirms a desktop viewport at least 64rem wide and 42rem high. No schema, dependency or administration-CRUD change is included. The owner subsequently approved implementing the responsive Overview presentation without data logic. The owner accepted this first responsive Overview presentation. Database definitions and query integration remain pending. The current account-control follow-up returns successful sign-in/sign-out to Overview and adds the administrator-only sign-out disclosure; its visual acceptance remains pending.

Successful tests do not imply acceptance of provisional product or design decisions. Phase 3 remains pending acceptance until the owner reviews those decisions. Future phases, deployments and remote operations require explicit confirmation.
