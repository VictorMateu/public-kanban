# Future ideas

This document records future product ideas and deferred maintenance. The required maintenance section below records owner-requested follow-up work; the remaining ideas are not approved requirements, architectural decisions or authorization to implement features. See [Product requirements](product.md) for the defined product direction and current boundaries.

Before implementing an idea, propose its value, scope, alternatives, data/security impact and validation. The owner decides whether to promote it into a requirement and a scoped task. Important confirmed decisions may warrant an ADR.

## Required code-structure and maintainability follow-up

On 2026-11-14, after accepting the first responsive Overview presentation, the owner requested that all four improvements identified in the code review be recorded as necessary follow-up work for another thread. Resume this work after the more complex implementation tasks and the separate data-model work have finished. This request authorizes documenting the backlog; it does not authorize performing these refactors during the current UI task or establish a new architecture.

The observations below describe the code at Overview commit `3a31cbc`. Before starting, read the current instructions and documentation, inspect Git status and re-evaluate each item against the latest implementation. Preserve other threads' changes. Propose a concrete scope, alternatives and validation before implementing; architecture, security, dependency and visual decisions remain subject to the owner's confirmation.

### 1. Decouple presentation contracts from database rows

- **Current issue:** project, task and column types are exported from query modules as direct Supabase table-row aliases. Components consume those types, and the queries select all columns. Database changes can therefore propagate into presentation contracts, and the data boundary is broader than each view requires.
- **Affected starting points:** [project queries](../lib/projects/queries.ts), [task queries](../lib/tasks/queries.ts), [column queries](../lib/columns/queries.ts), [project card](../components/projects/project-card.tsx), [task card](../components/tasks/task-card.tsx) and future [Overview queries](../lib/overview/queries.ts).
- **Necessary improvement:** once the schema is settled, define small explicit contracts for the data each view needs, select the required fields and map persistence results at the data-access boundary where necessary. Keep Supabase-generated types within infrastructure/data access. Do not create a generic repository framework or duplicate models without a demonstrated need.
- **Completion criteria:** presentation imports its data contracts independently of query implementations; queries return the documented fields; existing public-visibility and session-independent access behavior is preserved. Add meaningful mapping/contract tests and run the relevant authorized public HTTP checks. A schema-only field addition should not automatically expand a view's contract.

### 2. Separate board data composition from rendering as behavior grows

- **Current issue:** [ProjectBoard](../components/projects/project-board.tsx) both fetches columns/tasks and renders the board, including grouping tasks by column. This is manageable for the current read-only board but becomes harder to test and maintain as editing, filtering and state rules are introduced.
- **Affected starting points:** [ProjectBoard](../components/projects/project-board.tsx), the [project route](../app/projects/[slug]/page.tsx), and the column/task query modules.
- **Necessary improvement:** revisit the final board after the complex functionality is implemented. Keep server-side loading/orchestration distinct from a presentation component receiving explicit typed props. Put nontrivial grouping, filtering and lifecycle rules in focused, independently testable functions rather than embedding them in JSX or spreading them across views. Choose the smallest useful separation; current data loading does not by itself require a use-case or repository layer.
- **Completion criteria:** the board view can render from explicit inputs without initiating database access; any extracted rules have behavior-focused tests; loading, empty, unavailable/error and existing interaction states remain correct. Verify public visibility, keyboard access and responsive behavior after the refactor.

### 3. Complete visual-token consistency and extract repeated UI patterns

- **Current issue:** the board, task cards and parts of the project route still use earlier slate/indigo/white styles while the accepted Overview and shared shell use the cozy palette's semantic tokens. Repeated panel and control class lists can also drift as screens evolve.
- **Affected starting points:** [global tokens](../app/globals.css), [ProjectBoard](../components/projects/project-board.tsx), [TaskCard](../components/tasks/task-card.tsx), the [project route](../app/projects/[slug]/page.tsx), and existing [shared components](../components/shared/).
- **Necessary improvement:** migrate the remaining reviewed screens to the established semantic tokens, preserving meaningful priority/state distinctions and visible focus. Extract small shared panel/control patterns only when actual repetition and matching behavior justify them. Confirm any new visual mapping with the owner; this item does not approve a component library, dependencies or a redesign.
- **Completion criteria:** affected screens consistently use the approved visual tokens, with intentional exceptions documented. Review mobile/desktop, long translated content, keyboard focus and the relevant state/priority distinctions. Reuse must simplify the call sites without introducing an overly configurable universal component.

### 4. Make metric appearance independent of array order

- **Current issue:** [OverviewMetrics](../components/overview/overview-metrics.tsx) assigns the total and completed card backgrounds through `index === 0` and `index === 2`. Reordering the metrics could silently apply the wrong visual meaning.
- **Affected starting point:** [OverviewMetrics](../components/overview/overview-metrics.tsx).
- **Necessary improvement:** define explicit metric configuration with a stable key, translated label and semantic visual variant. Associate appearance with the metric's identity while retaining the shared project/task rendering and compact task layout. Base the configuration on the eventual agreed lifecycle definitions.
- **Completion criteria:** reordering metrics does not change their intended appearance; localized labels, accessible values and responsive layouts are preserved. While data integration remains pending, values must continue to communicate unavailable data rather than fabricated zeroes. Validate reordering behavior proportionately, without tests that only copy the implementation.

### Handoff and validation

Reassess these four items after the other threads finish: some may already have been resolved or superseded. Record the actual changes and remaining work in the existing development/validation documents. Keep changes focused and run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` after implementation, plus relevant authorized integration checks and UI review. Do not run database suites against the owner's data without checking prerequisites and authorization. These maintenance items do not authorize database redesign, new dependencies, deployment or unrelated refactoring.

## Initial system tasks or project templates

Optionally create a reusable starting set of tasks when initiating a project, such as architecture, structure or initial decisions.

Open questions:

- Which initial tasks are useful across projects?
- Should creation be optional, selectable or based on templates?
- How should task copies relate to future template changes?

No task set, template model or automatic creation behavior has been selected.

## Optional task types and derived project information

An optional task type could identify decisions, stack choices or other project information. A project-information view could derive sections from those tasks instead of maintaining duplicate plain-text content.

Open questions:

- Which types are needed and how are they selected?
- Which task content becomes project information?
- How would private tasks or comments be excluded?

The current information requirement is description, objectives and a repository link. Task types and derived views are outside the current implementation scope.

## History and development updates

Explore a combination of current-state Kanban, relevant change history and owner-written updates.

Completing an important task, reaching a milestone or releasing a version could optionally prompt the owner to write a message about the changes.

Open questions:

- Which events warrant history or an update prompt?
- Should history be recorded automatically, curated manually or both?
- How are milestones, versions and important tasks identified?
- What content is public, and how can the owner edit or hide it?

No event model, history-retention policy, release system or automatic publication behavior has been selected.

## AI-assisted update drafts

If the project evolves in that direction, an AI integration might draft change messages for the owner to review.

This remains a future possibility. No provider, dependency, external connection or data transfer has been approved. A proposal would need to cover usefulness, cost, privacy, input data and the owner's review before publication.

## Data protection and cookie compliance review

Before public deployment, review which data-protection and cookie rules apply to the actual application, hosting and intended audience. The absence of public forms or public sign-in does not settle that review.

Include the language-preference cookie and the administrator's authentication cookies in the review. Document each cookie's purpose, contents, duration and access, then determine whether information, consent, controls or other privacy documentation are required under the applicable rules.

Also inspect any personal-data processing introduced by hosting, request logs or future external services. No legal classification, exemption or compliance conclusion has been established. This is a pending pre-publication review, not authorization to add analytics, tracking or a consent-management dependency.
