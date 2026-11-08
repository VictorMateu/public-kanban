# Local validation

The phase 2 and phase 3 results below were recorded on 2026-11-01, exclusively against local Supabase with PostgreSQL 17 and Docker on WSL2. No migrations or tests were run against a remote project. These are historical results, not evidence that every check was rerun during the documentation revision.

Technical checks do not constitute acceptance of navigation or design. The preserved phase 3 UI remains pending the owner's review. See [Product requirements](product.md).

## Phase 2: application and database checks

With dependencies installed:

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

Recorded result: 11 application tests passed, lint and type checks passed, and production builds succeeded with and without public local Supabase configuration.

In an empty local Supabase test instance, after starting Docker and Supabase:

```sh
npx supabase@2.122.0 migration up --local
npx supabase@2.122.0 test db --local
npx supabase@2.122.0 db lint --local
```

Recorded result: both migrations applied, none pending, 53 pgTAP tests passed and SQL lint reported no errors. The suite covers publication visibility, read/write permissions, the private administrator record, revocation, constraints, timestamps and cross-project integrity. Its fixtures are reverted with `ROLLBACK`.

The SQL suite requires an empty test instance. Its historical execution does not authorize recreating user fixtures or running it against the owner's existing local account and data. Review [database-operation rules](../AGENTS.md#database-operations-and-external-services) before rerunning it.

## Phase 2: integration evidence

A temporary local script, excluded from Git, completed 58 checks. They are not part of `npm test` or a versioned browser suite. The checks used real Auth, the Data API and Server Actions over HTTP:

- Public registration blocked; existing accounts could use password sign-in.
- Exact project, column and task visibility for anonymous access, another user and the administrator; drafts hidden from unauthorized identities.
- Writes rejected for anonymous access and the other user, permitted for the administrator.
- Tasks assigned to another project's column rejected.
- Incorrect passwords, unauthorized users and anonymous administrative requests rejected or redirected.
- Administrator sign-in, session persistence and responses with `Cache-Control: no-store`.
- Proxy renewal of an expired session and updated response cookies.
- Immediate UUID revocation with an otherwise valid JWT, and sign-out.

Two temporary users were created exclusively in local Supabase with explicit authorization and credentials kept in memory. They were removed with their temporary projects, columns, tasks and administrator authorization. Counts confirmed that those tables and `auth.users` were empty at that point. The owner's permanent local account was created and authorized manually afterwards.

## Checks when configuring an account or environment

| Case | Expected result |
| --- | --- |
| Request `/admin` without a session | Redirect to `/admin/login` |
| Incorrect password | Error without administrative access |
| Valid account without authorized UUID | Administrative access rejected |
| Authorized UUID | Access to `/admin` and ability to sign out |
| Reload and session renewal | Session retained and cookies updated |
| UUID revocation | Immediate permission loss |
| Sign-out | Redirect to sign-in and loss of access |
| Anonymous or unauthorized Data API access | Published content only; writes denied |

Without Supabase configuration, the home and sign-in pages returned HTTP 200, sign-in displayed an unavailable message without a form, and `/admin` redirected to sign-in. Sign-in responses included `Cache-Control: private, no-store`.

These cases describe the existing authentication implementation. Future inline administration and additional private records need their own confirmed access rules and tests.

## Phase 3: public project listing and board

Recorded application result: 16 tests passed, including SQL-compatible slug validation and due-date formatting with UTC, leap-year and invalid-value handling. ESLint, type checking and the production build passed.

`npm run test:public`, against the local production build and actual local Supabase, passed 10 tests: the parent group and its nine cases.

- Ordered published-project listing and board links; no draft content in HTML or RSC data.
- Ordered columns and tasks, descriptions, priorities, dates and empty columns.
- Escaped card text without interpreting content as HTML.
- Skip link, labeled board region and keyboard-focusable scrolling.
- Generic HTTP 404 for private projects and nonexistent or invalid slugs.
- Stable public responses with an invalid session cookie; the public client ignores request cookies.
- Projects without columns and columns without tasks.
- Unpublishing removes a project on the next request; publishing it again restores visibility.
- Empty-list state after fixture cleanup when no projects existed before the test.

Fixtures were removed by their specific UUIDs. Project, column, task, user and administrator counts were compared before and after. The owner's account and authorization remained intact. No schema, policies or pre-existing application data were changed.

A build with blank public configuration was also tested without modifying `.env.local`: home and detail pages returned HTTP 200 with unavailable messages, and sign-in offered no form. This is distinct from a connected database with no published projects.

## Limitations and pending acceptance

- Browser visual review and error-boundary hydration verification remain pending: the browser-access host was unavailable during the phase 3 checks.
- Responsive classes, markup and HTTP responses were inspected; this does not establish visual correctness or a complete accessibility audit.
- The owner's local account exists and is authorized; public HTTP tests preserve it.
- Local evidence does not validate a future remote project's settings or permissions.
- Phase 3 navigation, visual design and structure remain provisional and pending acceptance.
- Objectives, repository links, reusable column definitions, individual task visibility, comments and automatic actual completion dates are not implemented or covered by these results.
- Administration CRUD and later phases need explicit scope confirmation before implementation.

## Instruction and documentation revision — 2026-11-01

After applying the owner-reviewed instructions and English documentation, the following checks were rerun:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route type generation and TypeScript passed |
| `npm test` | All 16 application tests passed |
| `npm run build` | Production build passed with the existing local environment configuration |
| Documentation inspection | All eight documents checked; 29 local links and one heading anchor resolved; code fences balanced |
| Credential-pattern scan | No credential patterns found in the eight revised documents |
| Application preservation | SHA-256 comparison confirmed all 46 inspected application, configuration, migration and test files were unchanged from the start of this revision |
| `git diff --check` | Passed; Git reported only line-ending conversion notices |

No database migrations, database tests, HTTP integration tests or browser checks were rerun for this documentation-only change. Their previous results remain historical evidence, with the prerequisites and limitations above. No users, authorization records or application data were changed. No commits, pushes, deployments or remote connections were made.

## Interface internationalization — 2026-11-01

After integrating `next-intl` 4.14.9 with English, Spanish and Catalan, the final application checks passed:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route types and TypeScript passed |
| `npm test` | All 20 application tests passed |
| `npm run build` | Production build passed with existing local Supabase configuration |
| `npm run test:public` | All 18 HTTP tests passed against the production build on local port 3001 |
| Documentation and diff checks | Nine Markdown documents, 36 local links and six heading anchors checked; `git diff --check` passed |
| Credential-pattern scan | No credential patterns found in changed files; `.env.local` remains ignored |

Type generation and build ran under the real Windows user because the agent's restricted sandbox could not use SWC's native cache. The normal user environment completed those checks successfully. No project permission changes or extra dependencies were introduced as a cache workaround.

Unit coverage includes validated locale selection, English fallback within namespaces, translated authentication/error messages, ICU task-count plurals and date-only formatting without timezone shifts.

HTTP coverage includes:

- Unchanged home, project and sign-in URLs with locale cookies for all three languages.
- Localized HTML language, metadata, sign-in fields, task labels and plural counts.
- English default for missing or unsupported cookies, regardless of browser-language headers.
- Independent locale responses for concurrent visitors.
- Native Server Action preference changes, persistence, cookie attributes and rejection of unsupported values.
- Real localized invalid-sign-in feedback without user creation, permission grants or successful authentication.
- Existing publication visibility, ordering, text escaping, unavailable/empty distinctions and administrator-route redirects.

Temporary application fixtures were cleaned up by their own UUIDs. The suite compared project, column, task, user and administrator counts before and after, preserving existing users and authorization. No migrations, schema changes or RLS changes were executed. The SQL suite requiring an empty database was not rerun.

A final read-only count confirmed zero projects, columns and tasks, with one Auth user and one authorized administrator. The temporary HTTP test server was stopped after validation; the existing server on port 3000 was not replaced.

### Project 404 rendering limitation

Project 404 responses preserve HTTP 404, hide private data and contain the localized heading as a React element in the RSC payload. However, the initial HTML uses an empty error shell without the heading or HTML language attribute. A temporary static heading showed the same behavior, so replacing translated text alone did not resolve it. The final implementation retains the standard localization setup; diagnostic code was removed.

Tests explicitly inspect the React heading rather than accepting a matching string from the serialized message catalog. They do not claim that the heading exists in initial HTML or that the page works without JavaScript. Unknown-route 404 pages do contain localized HTML.

Browser visual review and hydration checks could not run because both native computer access and the browser-access host were unavailable. Resolving the project-404 initial response and reviewing the provisional language-selector design remain pending. Language-specific URLs, administration CRUD and role-aware board access are outside this iteration.

The [data-protection and cookie review](ideas.md#data-protection-and-cookie-compliance-review) is recorded for the pre-publication stage. No legal-compliance conclusion has been established.

## Isolated i18n commit validation — 2026-11-01

The internationalization changes were separated from the uncommitted public-board implementation. The selected Git index was exported to an ignored temporary directory and validated independently, using the original construction page translated in place. The pending project routes, board components, slug/date utilities and public-board tests were excluded.

For this isolated selection, lint, type checking and the production build passed; all 15 application tests and seven i18n HTTP tests passed. The HTTP suite checked the three language preferences, English fallback, request isolation, native cookie selection and localized invalid-sign-in feedback. It created no database fixtures or users.

The combined-working-tree results of 20 application tests and 18 HTTP tests above also include the pending public-board work and must not be confused with the isolated commit's suite. Next.js reported multiple lockfiles because the temporary export lived below the repository; this warning was specific to that validation arrangement.

Public-board translations remain with their uncommitted pages and components. The isolated commit retains the original construction-page layout and introduces no project-listing or board functionality.

## Shared application layout — 2026-11-08

The owner approved removing the `(public)` route group and using the root layout for project pages and sign-in. The existing URLs, authorization flow and `/admin` placeholder are preserved. The administrative layout now supplies only metadata and search-indexing restrictions. Main landmarks on sign-in, the placeholder and the generic 404 were updated to match the shared skip link; the language selector is rendered once in the root header.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Passed after regenerating obsolete development route types |
| `npm test` | All 20 application tests passed |
| `npm run build` | Production build passed with the existing local environment configuration |
| `KANBAN_TEST_URL=http://127.0.0.1:3001 node --test tests/i18n-http.test.mjs` | All seven HTTP tests passed against the temporary production server |

The HTTP suite now checks a single shared header, footer and language selector, plus a matching main landmark and skip link, on the home, sign-in and generic 404 pages in all three languages. Existing locale-cookie, Server Action, invalid-sign-in and authorization-redirect checks also passed. These are HTTP/markup assertions, not browser interaction or visual verification.

The restricted Windows environment could not load SWC's native cache. Type generation and build therefore ran under the real Windows user, without dependency or permission changes. The first type check under that user found obsolete references to `(public)` in `.next/dev/types`; only that generated directory was removed before successfully rerunning type generation and TypeScript.

Docker and local Supabase were unavailable. The database-backed `tests/public-http.test.mjs` suite and SQL tests were not run, and successful project-data rendering was not revalidated. The seven i18n HTTP tests created no database fixtures or users. No migrations, authorization changes or remote operations were performed.

The browser-access host was unavailable. A native Computer Use fallback found Chrome but stopped before visual inspection because it could not determine the current browser URL confidently enough to enforce its policy. Responsive appearance, keyboard focus, hydration and browser interaction remain unverified. The previously recorded project-404 rendering limitation remains pending; the RSC heading assertion does not establish initial HTML rendering.

The shared-layout structure is owner-approved; the remaining phase 3 visual and navigation acceptance is still pending. No commit or push was made.

## Cozy palette foundation — 2026-11-08

The supplied visual palette is centralized in `app/globals.css` as eight CSS variables and semantic Tailwind color roles. The body now uses cream and espresso; existing component colors, layouts, fonts and interaction styles were preserved. The reference images do not authorize their example features or fixed workflow states. Detailed component restyling remains pending review.

The results in the table below were recorded against the combined working tree, including the uncommitted public-board implementation. They are distinct from the isolated commit checks recorded afterwards.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 20 existing application tests passed |
| `npm run build` | Production build passed with the existing local environment configuration |
| In-memory PostCSS/Tailwind compilation | All 15 sampled semantic utilities, including an opacity modifier and a focus-visible variant, compiled successfully |
| Calculated palette contrast | Espresso against the seven light palette colors ranged from 6.00:1 to 10.32:1; white against honey was approximately 1.85:1 |

Type generation and build ran under the real Windows user to use the existing SWC native cache. The first ad hoc Tailwind check omitted the generated `:focus-visible` pseudo-class when matching the variant selector; the check was corrected and passed without a product-code workaround. No permanent tests were added for static palette declarations.

This was a palette-table, code and CSS-compilation review. Browser visual review, responsive appearance and keyboard-focus rendering were not performed; contrast calculations do not establish a complete accessibility audit. No database or HTTP suites were rerun for this CSS-only behavior change. No dependencies, database records, routes or authorization behavior were changed, and no commit or push was made.

### Isolated palette commit validation

Before committing only the visual foundation, the selected Git index was exported to an ignored temporary directory. The export contains the existing construction page and authentication routes with the new global palette; it excludes the uncommitted shared layout, project routes, board components, utilities, test changes and their separate documentation.

For this isolated selection, `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` all passed. There are 15 application tests in the selection, rather than the combined working tree's 20. The production build also passed without copying any environment files. Next.js warned about multiple lockfiles because the temporary export lived below the repository; this warning is specific to the verification arrangement.

The staged diff was reviewed for scope, whitespace, secrets, environment files and generated artifacts. No database, HTTP or browser checks were rerun during this commit preparation. The pending UI work was preserved outside the commit, and no push was performed.

## Blank cozy workspace prototype — 2026-11-08

The owner requested the reference-inspired base layout with a left sidebar and a blank initial content area, without navigation. `AppShell` now supplies a rounded cream panel, peach sidebar, palette-derived ambient background and shadows, a decorative sprout and the Portfolio Kanban brand. The home route renders only an accessibly named empty main landmark and performs no Supabase project query. The former home implementation is preserved in the unmounted `ProjectList` component; existing board routes and authentication remain available directly.

The sidebar widths, outer spacing, rounding, shadows and compact mobile rail are provisional design choices. They affect `components/app-shell.tsx` and the `.workspace-*` rules in `app/globals.css` and remain pending owner review. The root no longer renders the previous header, footer or language form; the language selector is retained once on the existing sign-in page.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 20 application tests passed |
| `npm run build` | Production build passed with the existing local environment configuration |
| `KANBAN_TEST_URL=http://127.0.0.1:3001 npm run test:public` | All 18 HTTP tests passed against the temporary production server and real local Supabase |
| `git diff --check` | Passed; only line-ending conversion notices were reported |

HTTP assertions verify the empty main area, localized main label, shared sidebar, skip-link target, absence of menus/forms/navigation on home, and absence of project content in home HTML/RSC even while fixture projects exist. The suite also covers locale selection from sign-in, invalid-sign-in feedback, authentication redirects, retained boards, ordering, dates, text escaping, draft privacy, missing projects and publication changes. These assertions do not constitute browser keyboard testing or visual verification.

Type generation, production build and HTTP/database access ran under the real Windows user. The public suite created only its identifiable temporary projects, columns and tasks, removed them by their UUIDs and verified matching population counts afterwards, including users and administrator authorization. No users, policies, schema, authorization records or pre-existing project data were changed. The SQL suite requiring an empty instance was not run.

The browser-access host remained unavailable, so visual comparison with the reference, responsive appearance, hydration and keyboard-focus rendering could not be checked. Responsive CSS, landmark semantics and focus treatment were reviewed in source. No animation or loading/data/error UI is added to the intentionally empty home; retained data views keep their existing states. No dependency, commit, push, deployment or remote connection was added by this prototype. Visual acceptance remains pending.

## Full-viewport layout correction — 2026-11-08

Following the owner's screenshot review, the centered cream panel and its width cap were removed. The ambient background now fills the viewport, with a transparent main content area and a separate peach drawer at the left. Small top, bottom and left margins retain the drawer's rounded border and shadow. Its height is the viewport minus the vertical margins; sticky positioning keeps it in view when retained content scrolls. The redundant inner shell wrapper was removed. The home remains empty and navigation-free.

The local branch was renamed from `feat/public-project-boards` to `feat/ui-design-base`, preserving its commits and pending work. No remote branch was changed and no commit or push was created.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 20 application tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3001 node --test tests/i18n-http.test.mjs` | All seven HTTP tests passed against the temporary production server |
| `git diff --check` | Passed; only line-ending conversion notices were reported |

HTTP checks cover the blank home, shared sidebar/main landmarks, locale behavior, sign-in form and authorization redirects. No data-access or authorization logic changed; the database-fixture HTTP suite and SQL tests were not rerun for this CSS/wrapper adjustment. No fixtures or users were created. Browser, responsive visual and keyboard-focus checks were not performed; the previously unavailable browser host was not retried. The viewport treatment follows the owner's correction, while exact drawer dimensions and appearance remain provisional for visual review.

## Personal logo and isolated layout commit ? 2026-11-08

The provisional sprout was replaced with the original green SVG from the sibling personal website at `victor-portfolio/public/brand/logo.svg`. The working copy was checked against the source with SHA-256. Its geometry and brand color were preserved, and the sidebar renders it at 32px using `next/image`. The SVG has an empty alternative because the adjacent application name identifies the brand, including on mobile through screen-reader text.

The selected index was exported into an ignored temporary directory and validated without the uncommitted project routes, project/task components, preserved listing, slug/date utilities, public-display tests, database HTTP suite or public-test script change. Project-specific 404 assertions remain outside the selected i18n HTTP suite. Related documentation distinguishes this selection from the combined working tree.

| Isolated check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 15 tests in the selected application passed |
| `npm run build` | Production build passed with the existing public local configuration loaded only into the process environment |
| `KANBAN_TEST_URL=http://127.0.0.1:3001 npm run test:public` | All seven selected HTTP tests passed |
| Logo HTTP check | HTTP 200 with `image/svg+xml`, matching the local asset; no scripts or external SVG references |

The seven HTTP tests include the personal logo in the shared sidebar, blank home, locale cookies, language selection on sign-in, invalid-sign-in feedback and authorization redirects. These checks created no database fixtures or users. No environment files were copied into the export or selected for Git. The temporary export produced Next.js multiple-lockfile warnings; no dependency or framework setting was changed to suppress them. Staged text was normalized to repository LF endings before the final diff review.

Browser visual, responsive and keyboard-focus checks were not performed; the existing browser-access limitation remains. The selected diff was checked for unrelated files, generated artifacts, whitespace and credential patterns. The pending board work was preserved outside the commit, and no push was performed. Committing the prototype does not establish final visual acceptance.
