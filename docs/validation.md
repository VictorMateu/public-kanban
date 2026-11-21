# Local validation

## Desktop summary top spacing - 2026-11-14

The owner approved the current interface proportions and requested more space above the summary. `overview.module.css` now uses `padding-top: clamp(1.5rem, 4svh, 3rem)` for desktop viewports at least 64rem wide and 50rem tall. This moves the summary down while keeping its established scale, widths and internal spacing. Mobile and short windows retain their previous spacing. The new top spacing remains pending visual review; the owner's approval covers the preceding proportions only.

`npm run lint`, `npm run typecheck`, all 41 `npm test` cases and `npm run build` passed. The initial browser regression caught vertical overflow in the Catalan 1280x720 case when the extra padding also applied to short windows. Restricting the additional padding to sufficiently tall desktop windows resolved that failure. The rebuilt production version then passed all 35 viewport/locale cases in `KANBAN_TEST_URL=http://127.0.0.1:3004 node work/overview-proportions-qa.mjs`, including explicit desktop top-padding and unchanged phone-spacing assertions, compact desktop fit, keyboard/menu checks, client navigation and 200% text reflow. A large-desktop screenshot was visually inspected. No browser exceptions or console errors were observed. `git diff --check` passed.

The desktop matrix reserves space with a layout-only account-row fixture; live administrator authentication was not tested. The previous entry's limitations for populated data pages remain. QA scripts/screenshots stay untracked under `work/`. No new dependencies, queries, database operations, commits or pushes were introduced. The temporary production server was stopped and the development preview remains on port 3003.

## Proportional large-screen scaling and mobile preview inspection - 2026-11-14

The owner clarified that larger screens should enlarge the entire interface, including width, typography and controls. The provisional layout now scales the rem-based shell and summary together only when both viewport dimensions allow it. Root sizing is bounded between 100% and 200% of the browser font preference; the summary is bounded at 88rem. The wide panel row remains bounded at 28rem of the current scale. This supersedes the preceding default-size desktop limit: panels no longer grow only vertically while their text, controls and width stay small. Narrow/short viewports retain the base scale and normal document scrolling. Mobile main/card padding, heading sizes, stacked sections and hidden illustration remain in place; activity labels do not split inside words.

The shared development preview was inspected before and after updates. Its accessible automation snapshot timed out twice, so visual captures used isolated Chrome after reporting that limitation. Direct evaluation in the shared preview observed an old global stylesheet while the updated CSS module was already loaded; full navigation loaded the current stylesheet. After navigation, the 390px shared preview had 16px main gutters, 12px project-card padding, 28px section headings, no repeated application eyebrow and no horizontal overflow. The exact missing-server-component-style state shown in the owner's screenshot could not be reproduced. Stale development styles are an observed preview issue, not a proven complete explanation of that screenshot; no CSS Module workaround or toolchain/dependency change was introduced.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Passed |
| `npm test` | All 41 tests passed |
| `npm run build` | Passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | Eight production HTTP tests passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node work/overview-proportions-qa.mjs` | 35 production viewport/locale cases, client navigation, keyboard, menu and enlarged-text assertions passed |
| `git diff --check` | Passed |

The browser matrix covered English, Spanish and Catalan with widths from 320px through 3840px, including the supplied 534px mobile size. At 1920x1080, 2560x1440 and 3840x2160, root sizing was approximately 18.29px, 24.38px and 32px, and main width was approximately 1554px, 2072px and 2816px. Compact 1366x768 and 1280x720 windows retained the 16px base. Assertions verified proportional width/type growth, the scale-aware panel cap, desktop alignment, mobile spacing/order, main/card padding, no clipped text or horizontal overflow, eight pending values, 44px-minimum filter targets and no decorative media below 1024px. The tested desktop/tablet summary sizes fit their viewport; narrow/short screens scroll. Desktop sizing used a layout-only 3.75rem account-row fixture, which does not authenticate an administrator.

Production screenshots at 2560px and 390/534px mobile widths were visually inspected. Client navigation from Overview to Projects and back retained mobile padding. Keyboard filter activation, visible focus, menu overlay geometry, Escape focus restoration, outside dismissal, reduced motion and absence of filter data requests passed. At 200% root text in a short window, content reflowed without horizontal scrolling and the final status remained reachable. No browser exceptions or console errors were observed. The local QA scripts/screenshots remain untracked under `work/`; they are not committed application tests. The temporary production server was stopped after checks; the development preview remains on port 3003. Live administrator authentication and populated project/board appearance at the new desktop scale remain unverified. No database suites, users, migrations, remote operations, dependencies, commits or pushes were introduced. Visual acceptance remains pending owner review.

## Bounded desktop proportions and mobile summary composition - 2026-11-14

The owner reported that large displays stretched the activity/task panels excessively and rejected the mobile presentation. The wide panel row is now capped at 28rem (448px at the default root size), retaining the compact desktop proportions instead of consuming arbitrary viewport height. Mobile uses 1rem side gutters and 1.25rem section gaps, a smaller heading/description and no repeated application eyebrow. Project/task metrics appear before activity in the DOM and mobile layout; CSS grid areas preserve the desktop activity-left/task-right arrangement. From 20rem to below 34rem of content width, metric labels and pending values share a row, with a stacked fallback for narrow cells. Activity controls form full-width rows on narrow phones and two equal groups from 22rem. Button sizing accounts for longer translated labels. The mobile plot has a 7.5rem minimum and the section stack no longer flex-grows. No data logic, dependencies, authentication or schema changes were added. These visual adjustments remain pending owner review and supersede the previous unbounded panel growth/mobile composition.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed after removing unused helpers from the local diagnostic script |
| `npm run typecheck` | Passed |
| `npm test` | 41 tests passed |
| `npm run build` | Passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | Eight production HTTP tests passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node work/overview-proportions-qa.mjs` | 34 production browser viewport/locale cases plus client-navigation, keyboard and enlarged-text assertions passed |
| `git diff --check` | Passed |

The isolated Chrome matrix covered 320-2560px widths and English, Spanish and Catalan. It added 534x796 cases matching the supplied mobile capture, common 360/375/390/430px phone widths and 1920x1080/2560x1440 displays. Assertions verified the 448px wide-panel height cap, desktop panel alignment, mobile metric-before-activity order and section spacing, main/card padding, compact mobile plot, no clipped text or horizontal overflow, all pending values, 44px filter buttons and no decorative media below the navigation breakpoint. Existing one-screen sizing assertions still passed for the tested desktop/tablet sizes. Desktop sizing reserved a layout-only 60px account row; it did not authenticate an administrator. Production screenshots at large desktop and 390/534px mobile sizes were visually inspected.

A mobile client-side round trip from Overview to Projects and back retained main/card padding. Keyboard filters, visible focus, no filter fetches, menu overlay geometry/Escape/outside dismissal and reduced motion passed. The 200% root-text check retained reflow and access to the final status. The initial local diagnostic script triggered lint warnings for unused helper functions; they were removed and lint passed on rerun. No browser exceptions or console errors were observed. Local QA scripts and screenshots remain untracked under `work/`, outside the committed test suite. Narrow/short screens retain normal document scrolling. Live administrator session behavior was not tested in this visual-only follow-up. No database suite or remote operation ran. The temporary production server was stopped, and the development preview remains on port 3003.

## Viewport-aware Overview and tablet navigation - 2026-11-14

The owner requested that the UI adapt to screen dimensions and avoid scrolling down to read the current summary. Overview now uses bounded viewport-height spacing, card padding, headings/values and chart minimum height. Its activity/task panels grow into available space. At 34rem of available content width, project metrics use four columns, task metrics form a vertical list and the personal link sits beside the introduction. Below that width, sections stack with two-column metrics. The existing top-bar disclosure now applies below 64rem of viewport width; the shared shell, session controls and illustration visibility/mount query use the same threshold. This supersedes the 48rem threshold in earlier validation entries. No scroll lock, clipping, simulated observations, database logic or dependency was introduced. Short windows, narrow phones, enlarged text and future growing lists may still scroll normally. The revised proportions and tablet breakpoint remain pending owner visual review.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | 41 tests passed |
| `npm run build` | Passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | Eight production HTTP tests passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node work/overview-viewport-qa.mjs` | 25 production browser viewport/locale cases plus keyboard/reflow checks passed |
| `node work/mobile-session-qa.mjs` | Seven isolated account/sidebar component viewport/locale cases plus desktop interaction checks passed |
| `git diff --check` | Passed |

Isolated headless Chrome checked the actual anonymous production Overview from 320px to 1900px wide, including the 1023/1024px navigation boundary and English, Spanish and Catalan. Desktop sizing assertions additionally inserted a layout-only 60px account row to reserve the same space as authenticated controls; this did not authenticate a user or change application authorization. The complete summary fitted 1900x905, 1440x900, 1366x768, 1280x720 and 1024x768 in the tested locale combinations. The latter three sizes were checked in all three languages. The tablet summary also fitted 768x1024 in all languages, plus 820x1180 and 1023x768 in the tested locales. Assertions found no horizontal page overflow or clipped text, retained all eight pending values and 44px activity-filter targets, and observed no illustration asset requests below 1024px. Screenshots at desktop, compact desktop and tablet sizes were visually inspected. Small-phone and short landscape cases retained document scrolling. A 640x360 layout with root text enlarged to 200% reflowed without horizontal scrolling, and its final status remained reachable.

Keyboard entity/period selection, visible focus, no filter data requests, menu overlay geometry, Escape focus restoration, outside dismissal and reduced motion passed. The separate component fixture used actual sidebar/account components and an intentionally failing logout action: static top-bar status/menu logout passed at 320, 360, 390, 768 and 1023px; desktop account behavior passed at 1024 and 1440px. It also checked pending/error feedback and retry focus. No browser exceptions or console errors were observed. The local `work/` QA scripts/screenshots remain untracked and are not part of the committed test suite. Live administrator cookie round-trip and authenticated server rendering were not tested. No database suites, user creation, schema changes or remote operations were performed. The temporary production server on port 3004 was stopped; the owner's development preview on port 3003 remains running.

## Mobile session indicator and navigation logout correction - 2026-11-14

The owner rejected the separate mobile account dropdown and requested a static session sphere in the top bar with sign-out inside the main navigation disclosure. Below 48rem, the server-verified shell now supplies the noninteractive indicator beside the navigation toggle and the shared sign-out form below the language selector. The external account row is hidden, so it adds no mobile content spacing. From 48rem upwards the previous account dropdown remains available, while the mobile status and logout are hidden. The brand scales down below 360px to accommodate the controls. A shared account icon avoids duplicate artwork; session/authorization and redirect behavior are unchanged.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Passed |
| `npm test` | All 41 tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | All eight cases passed, including absence of account controls and the static mobile indicator for anonymous visitors |
| `node work/mobile-session-qa.mjs` | Isolated responsive component fixture passed |
| `node work/overview-qa.mjs` | Anonymous Overview/sidebar regression matrix passed |
| `git diff --check` | Passed |

The focused Chrome fixture bundles the actual sidebar, account icon, desktop account disclosure and shared logout form, with real catalogs/styles and a deliberately failing logout action. Mobile checks passed at 320px (English), 360px (Spanish) and 390px (Catalan): no horizontal overflow or brand/status overlap, static indicator outside buttons/links and keyboard order, no action on indicator activation, no visible external account trigger, touch opening without moving content, a visible 44px-minimum logout target, pending/error feedback, retry focus and Escape focus restoration. A mobile screenshot was visually inspected. Desktop checks at 768px and 1440px retained account opening, keyboard focus, hover continuity, click pin/unpin, outside dismissal, reduced motion and logout failure handling. No browser exceptions or console errors were observed. These local fixture scripts are not part of the committed test suite and do not establish live administrator authentication or logout.

No database records, users, dependencies or schema changes were introduced. Live owner-session verification and visual acceptance of this corrected mobile arrangement remain pending. The earlier account-disclosure evidence below records the prior mobile design and is superseded by this correction for placement and interaction only.

## Overview authentication landing and account disclosure - 2026-11-14

The owner requested returning to Overview after sign-in and a cozy administrator-only account disclosure with sign-out, including touch access on mobile. Successful sign-in and sign-out now revalidate the shared root layout and redirect to `/`. Already-authorized requests to the login page and legacy `/admin` route also redirect to Overview; the legacy route still requires administrator authorization. The existing sign-out form moved into `components/auth` and is mounted through the server-verified shared shell. No settings feature, dependencies, schema changes or session-refresh matcher changes are included. Settings placement is documented as deferred work in the existing product/ideas documents.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Passed |
| `npm test` | All 41 tests passed, including seven new action-flow cases |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | All eight production HTTP cases passed |
| `node work/account-menu-qa.mjs` | Isolated component browser fixture assertions passed |
| `node work/overview-qa.mjs` | Existing anonymous Overview/sidebar responsive assertions passed |
| `git diff --check` | Passed |

The action tests execute the actual action module using the installed TypeScript compiler with framework and Supabase-client adapters replaced in memory. They retain the real credential/administrator-authentication function. They verify successful owner sign-in and sign-out refresh the layout before redirecting to Overview; non-administrator sign-in cleans up its session; failed/unavailable authentication does not redirect; and failed/unavailable logout reports an error instead of claiming a public session. These are isolated unit assertions, not live Auth or cookie round-trip tests.

The account browser fixture bundles the actual account disclosure and sign-out components with the installed tooling, real message catalogs and styles, a temporary isolated Chrome profile and a deliberately failing test action. It adds no application route or authorization bypass. Checks passed at 320px (English), 390px (Spanish), 768px (Catalan) and 1440px (English): touch/click opening, viewport bounds, 44px minimum logout target, unchanged content geometry, keyboard activation/Tab order, visible focus, Escape and focus restoration. Desktop checks covered hover opening, pointer travel into the panel, hover dismissal, click pin/unpin, outside dismissal, reduced motion and pending/error/retry-focus behavior. Disabling the submit button initially caused focus loss to close the panel; the implementation now keeps feedback visible for that specific blur and restores focus after a failure. No browser exceptions or console errors were observed. Mobile and desktop fixture screenshots were visually inspected. The local browser scripts/artifacts under `work/` remain outside the committed test suite.

The HTTP cases verify anonymous visitors receive no account controls on Overview or login and retain localized invalid-sign-in handling, locale isolation and protected-route redirects. The anonymous Overview/sidebar matrix again passed at 320-1440px across the three locales. Local Supabase was available, but no real administrator session or successful end-to-end login/logout was used: live cookie changes, authorized HTML, the already-authorized login redirect and the authorized legacy-route redirect remain pending a manual owner-session check. No users, fixture records, migrations or administrator assignments were created. The database-backed public fixture suite was not run. Visual acceptance of this disclosure remains pending the owner's review.

## Responsive presentation-only Overview - 2026-11-14

The owner approved the first Overview implementation while another thread defines the database. The page now contains an introduction and personal website link, four project metrics, four task metrics, and an activity panel with entity and month/day controls. Every metric remains an em dash with an accessible pending label. The activity area has no sample values, chart marks, dates or numeric axes. The server-only Overview query returns only a pending status and records future data work as TODOs; it does not access Supabase.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings, including the final local browser harness |
| `npm run typecheck` | Passed |
| `npm test` | All 34 application tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | All eight HTTP tests passed against the production build |
| `node work/overview-qa.mjs` | Isolated headless Chrome responsive and keyboard assertions passed |
| `git diff --check` | Passed |

The browser matrix covered English at 320, 360, 390, 768, 1024 and 1440 CSS pixels, plus Spanish and Catalan at 320, 390 and 768 pixels. Automated assertions checked horizontal overflow, text/control bounds, two or four project columns according to the content width, 44px minimum selector height, all eight pending values and the document language. Mobile cases contained no videos and requested no illustration assets. Mobile (Spanish, 390px) and desktop (English, 1440px) screenshots were visually inspected.

Additional Chrome assertions checked entity selection with Enter, period selection with Space, visible keyboard focus, selected-button states, updated accessible activity descriptions and no Fetch/XHR requests from those controls. The mobile menu preserved the main content geometry, closed with Escape and restored toggle focus, dismissed on an outside pointer action and disabled its animation with reduced motion. No browser exceptions or console errors were observed. These checks used an isolated temporary profile, not the owner's browser session.

The HTTP cases assert translated Overview content, the personal link, eight pending values, the initial activity description and the existing locale/security response behavior. The public-data integration assertion was updated for the pending Overview but its suite was not run: it inserts database fixtures, and this task excludes database work. No users, database records, migrations or dependencies were created or changed. Real counts, lifecycle definitions, activity queries and data-driven loading/error states remain pending. The owner accepted the first responsive Overview presentation on 2026-11-14; this does not approve database integration or the rest of phase 3. The existing local development preview on port 3003 was left running; the temporary production server on port 3004 was stopped after verification.

## Floating mobile menu follow-up - 2026-11-14

The owner rejected the mobile panel pushing the content and requested an overlay with a cozy animation and no visible Menu text. The panel is now absolutely positioned below the top bar, with a bounded height and internal scrolling. The header and content retain their layout dimensions when it opens. A circular cream button with rounded strokes replaces the text label; translated open/close accessible names remain. The icon changes to a close symbol. The panel entrance uses a 280ms opacity/translation/scale animation with a slight rotation; reduced-motion preferences disable it and the icon transition. The existing palette and panel shadow are reused. The skip link stays above the overlay. Desktop retains its static flex panel and disables the entrance animation.

Outside pointer presses and focus leaving the sidebar dismiss the mobile panel; Escape returns focus to the toggle. The overlay is non-modal, with no focus trap or blocked background controls. No mobile illustration or replacement media was added. This presentation remains provisional for owner review.

`npm run lint`, `npm run typecheck`, `npm test` (34 passed), `npm run build`, `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` (eight passed) and `git diff --check` passed. HTTP coverage additionally checks that the toggle contains a decorative SVG without visible text while retaining its translated accessible name. The compiled stylesheet was checked for the reused shadow token. These checks do not establish browser geometry, focus behavior, animation appearance or reduced-motion behavior after hydration; no browser pass was performed in this follow-up. The development preview remains available on port 3003. No commit or push was made.

## Mobile navigation disclosure - 2026-11-14

The owner requested a collapsible mobile menu containing the existing navigation and language selection, without the decorative media. Below 48rem the shell now uses a top bar with the visible brand and a translated Menu button. The shared panel starts collapsed, expands in document flow, closes on link activation and supports Escape with focus returned to the toggle. Desktop retains the sidebar. The language capsule stays horizontal, and all new labels are translated in English, Spanish and Catalan. Appearance and spacing remain provisional until owner review.

The illustration now mounts only after the client confirms both a width of at least 48rem and a height of at least 42rem. Initial HTML contains no video or decorative poster; initial mobile rendering does not create those media elements. Shrinking from desktop unmounts the player but cannot undo prior downloads. No replacement image or dependency was added. The mobile disclosure requires JavaScript; the language form still uses the existing native Server Action.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 34 application tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | All eight HTTP cases passed against the temporary production server |
| `git diff --check` | Passed |

HTTP assertions now verify the initially collapsed disclosure, its translated accessible name and matching panel identifier, one shared navigation/language form, and the absence of decorative media in initial markup. Existing locale submission, cookie, authorization redirect and invalid-sign-in checks also passed. These HTTP assertions do not execute client interactions, measure downloads after hydration or establish responsive geometry, focus visibility, touch behavior or desktop animation playback. No browser interaction or visual pass was performed for this revision; those checks remain pending in the development preview at port 3003. No database fixture suite, data change, user creation, commit or push was performed.

## Administrator indicator placement follow-up - 2026-11-14

At the owner's request, the verified administrator icon was moved from the sidebar to the upper right of the shared content area. Its own row reserves space above route content rather than overlaying it. The icon keeps its existing server authorization check, translated label and 44px size. No account-menu behavior was added.

`npm run lint`, `npm run typecheck`, `npm test` (34 passed), `npm run build` and `git diff --check` passed. No additional HTTP or browser verification was performed for this placement-only change; owner review in the existing preview remains pending.


## Local login preview enabled — 2026-11-14

At the owner's request, `docker desktop start` started Docker and the existing local Supabase containers resumed. Auth and PostgreSQL reported healthy. The worktree's ignored `.env.local` was configured from the original checkout's existing local URL and publishable key; values were not printed. No migrations, resets, users, administrator assignments or application-data changes were performed. A read-only query confirmed one existing user and one administrator record.

The Auth health endpoint returned HTTP 200. `http://localhost:3003/admin/login` returned HTTP 200 with both email and password fields after the development server picked up its configuration. The preview remains running for the owner to sign in. These checks establish service availability and form rendering; successful credential sign-in, session renewal and the authenticated user icon remain pending owner review. Application checks were not rerun for this service/configuration-only operation. `git diff --check` passed.

## Cozy language capsule follow-up — 2026-11-14

The owner subsequently requested removing the dot beneath the selected language. The dot and its reserved spacing were removed; the honey background and `aria-pressed` remain. `npm run lint`, `npm run typecheck`, `npm test` (34 passed), `npm run build` and `git diff --check` passed after this presentation-only adjustment. No additional HTTP or browser pass was performed; visual review remains pending in the development preview.

The owner rejected the initial dropdown's appearance and requested a cozier selector. `LanguageSwitcher` now renders three native submit buttons inside a cream capsule. Honey fill, a small dot and `aria-pressed` identify the active locale; full language names come from the catalogs. Each button submits its locale directly to the existing action. The component remains server-rendered and requires no JavaScript for submission or new dependencies. The capsule stacks vertically on the compact rail, with 44px minimum button height and visible focus styling. This is a provisional visual choice awaiting owner review in the existing development preview on port 3003.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 34 application tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | Seven passed; invalid-sign-in case explicitly skipped because this worktree has no Supabase configuration |
| `git diff --check` | Passed |

The HTTP suite verifies one form containing all three labeled options, exactly one selected locale, translated public/login/unavailable states, native submissions for all three languages, cookie persistence, unsupported-locale rejection and unchanged authorization redirects. It supports the documented configuration-unavailable login state rather than assuming credentials are configured. An initial Catalan assertion failed because the unavailable message's apostrophe was HTML-escaped; the assertion was corrected and the suite rerun successfully.

No browser responsive, keyboard or focus verification was performed for this follow-up. CSS and HTTP checks do not establish visual acceptance. Supabase configuration and the service remain unavailable here, so actual authenticated-session and database checks were not run. No users, fixtures, schema, account features, commits or remote operations were introduced.

## Sidebar session indicator and language selector — 2026-11-14

The owner requested a user icon at the upper left when signed in and a language selector beneath the animation. The shared Server Component now renders a labeled circular icon only when the existing `getAdministrator` check confirms both identity and database authorization. Auth errors omit the icon so public browsing can continue. Sign-in/sign-out invalidate the root layout to refresh the indicator. Public project queries, the `/admin` session-refresh matcher, RLS, dependencies and schema remain unchanged.

The preserved native language form is mounted below the animation, using palette roles, EN/ES/CA choices and an explicit Apply button. Its compact mobile layout uses a check icon with a translated accessible name. Both controls retain a 44px minimum height and visible focus styling. The form remains mounted when the decoration is hidden. Placement and appearance are a working prototype pending owner review.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 34 application tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3003 node --test tests/i18n-http.test.mjs` | All eight HTTP tests passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3003 node --test --test-name-pattern 'cookie preference renders' tests/i18n-http.test.mjs` | Three locale cases passed after adding private/no-store response assertions |
| `git diff --check` | Passed |

HTTP assertions cover one shared selector across public/login/unknown routes, selected locale, placement after the videos, absence of the administrator icon for anonymous visitors, unchanged empty Overview content and no preference cookie on reads. Native form submissions persist all three supported locales with the expected cookie attributes, reject unsupported values and do not grant access or set Auth cookies. Invalid-sign-in feedback remains localized.

Local Supabase was not listening on port 54321. Database-backed project requests reported connection failures; the passing interface cases do not establish successful project-data rendering. No database suites, fixtures or users were created. Actual authorized icon rendering, login/logout display updates, expired-session behavior, browser responsive appearance, keyboard interaction and focus visibility remain unverified in this revision. Source review and HTTP assertions are distinct from browser verification and visual acceptance. No account menu, new dependency, migration, commit, push or deployment is included.

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

## Typography integration — 2026-11-08

Dancing Script and Handlee are each instantiated once through `next/font/google` in `app/layout.tsx`. Their generated variables are attached to the root HTML element and mapped to semantic Tailwind families in `app/globals.css`. Dancing Script supplies headings, including section and Kanban column headings. Handlee supplies body text, controls, the sidebar brand and task content; task headings explicitly use the body family. Actual available weights are respected, with font synthesis disabled. Existing colors, layout geometry, routes, content and behavior were preserved; text-size and weight adjustments are limited to the selected typographic hierarchy.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 20 existing application tests passed in the combined working tree |
| `npm run build` | Production build passed with both Google font families |
| `KANBAN_TEST_URL=http://127.0.0.1:3001 node --test tests/i18n-http.test.mjs` | All seven HTTP tests passed |
| Generated CSS and font HTTP inspection | Both semantic families, heading defaults and the task font override were present; four WOFF2 files returned HTTP 200 with WOFF2 signatures |
| `git diff --check` | Passed; only line-ending conversion notices were reported |

The compiled font faces declare Dancing Script's real 400–700 range and Handlee's real 400 weight, with `font-display: swap`. The four files comprise three Dancing Script Unicode subsets and one Handlee asset, rather than duplicate loader declarations. Font URLs in the delivered CSS point to local `/_next/static/media/` assets; no Google Fonts CSS/domain references remain in those stylesheets. This inspects generated CSS and HTTP responses, not browser-computed rendering.

Type generation and build ran under the real Windows user for SWC's native cache. No new dependency, permanent test, database fixture, migration, authorization change, commit or push was introduced. The database-backed public-board HTTP suite and SQL tests were not rerun for this typography-only integration.

Browser discovery reported the browser-access host unavailable. Visual legibility, actual accented-glyph rendering, 200% zoom, responsive text wrapping, focus rendering and hydration remain unverified. Heading semantics, source font assignments and inherited form-control typography were reviewed in code. The existing blank-home and data-view loading/empty/error behavior is unchanged. Typography conventions are documented in [Development](development.md#typography), with the selected design responsibilities in [Product](product.md#typography).

### Isolated typography commit validation

The typography-only index was exported to an ignored temporary directory before committing. The nine selected files contain the shared font loading, semantic CSS roles, typography changes to already-versioned UI components and the relevant documentation. Project/task component-specific adjustments remain with the uncommitted public-board implementation; their typography conventions are documented for later integration. No board routes, new board components, utility modules, package/script changes or board tests are included.

For this isolated selection, `npm run lint`, `npm run typecheck`, `npm test` (15 tests), `npm run build` and `KANBAN_TEST_URL=http://127.0.0.1:3001 npm run test:public` (seven tests) all passed. The 20-test combined-working-tree results above include the pending board work and are separate evidence. Build/start used the existing public local configuration in process memory without copying environment files. Next.js reported multiple lockfiles due to the nested temporary export; no configuration or dependency workaround was introduced.

The selected diff was reviewed for scope, whitespace, generated artifacts and credential patterns. Existing pending files were checked for preservation. No database fixtures, users, browser checks or remote operations were introduced during commit preparation. Visual acceptance remains pending, and no push was performed.

## Project Garden name and sidebar title — 2026-11-08

The owner selected Project Garden as the application name and requested the heading font for the sidebar title. `Common.appName` in the English source catalog now supplies the shared name through the existing English fallback. The sidebar, application/admin/project metadata, sign-in description and retained project-list heading consume that key. Sign-in descriptions interpolate the name in all three languages. The sidebar title uses `font-heading text-2xl font-semibold` (Dancing Script at 24px/600); ordinary interface text remains Handlee.

Current documentation and the project-name labels in the root instructions were updated. Historical ADR and validation wording was preserved. The npm name, locale cookie, Supabase project/container identifiers, routes, logo and local data were retained.

Lint, type checking and all 20 application tests passed. The rename passed the seven existing i18n HTTP tests, and an additional HTTP check confirmed the new sidebar name and page titles on home/sign-in in English, Spanish and Catalan without old branding or unresolved interpolation placeholders. The production build passed again after the sidebar's font adjustment. No new tests, dependencies, database operations, commits or pushes were introduced. Browser visual review was not performed; the typography and layout remain pending visual acceptance.

### Isolated Project Garden name commit

Before committing the rename, the twelve selected files were exported to an ignored temporary directory. The selection contains the shared brand name, existing-route metadata/sign-in text, sidebar title treatment and relevant documentation/instruction labels. Uncommitted project routes, project-list/board components, utilities, package script changes and project-specific tests remain excluded.

The isolated selection passed `npm run lint`, `npm run typecheck`, `npm test` (15 tests), `npm run build` and `KANBAN_TEST_URL=http://127.0.0.1:3001 npm run test:public` (seven tests). Public local configuration was loaded only in process memory; no environment file was copied or selected. Next.js reported multiple lockfiles because the verification export was nested below the repository. The selected diff was reviewed for scope, whitespace, credential patterns and generated files. Existing pending work was preserved, and no push was performed.

## Structure, security and supporting-page review — 2026-11-08

The Garden rename was committed separately as `824aa1b`. Subsequent review changes remain uncommitted. Two agents independently reviewed architecture and security in read-only mode; the primary agent applied the owner-requested UI work and small English-language comment/internal-error corrections. No architecture, authentication policy, database schema or dependency was replaced.

### Implemented UI scope

The owner explicitly selected Overview plus Projects, with the logo also linking home. The new `/projects` route mounts the existing published-project list, using its anonymous, session-independent queries and RLS. `SidebarNavigation` uses the pathname for translated active-page labels and `aria-current`; it has no auth or data access. The compact mobile rail retains accessible text labels and focus treatment. Overview content is still empty: no KPI definition, count query or sample value was invented.

Login, generic 404, project-specific 404 and the error boundary now use shared palette/font roles and `shadow-panel`. `PageMessage` is a custom presentation component reused for the message pages, including error announcements. The login form retains its labels, autocomplete, pending/disabled behavior and Server Action. No language selector is rendered. Existing locale cookies and translated responses still work. The prior language-form submission HTTP case was replaced by a selector-absence/read-only-cookie case because that form is no longer mounted; it is not evidence of a current language-selection UI.

### Final application checks

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 20 application tests passed |
| `npm run build` | Production build passed, including `/projects` |
| `KANBAN_TEST_URL=http://127.0.0.1:3001 npm run test:public` | All 20 HTTP tests passed against local production Next.js and real local Supabase |
| `git diff --check` | Passed; only line-ending conversion notices were reported |

The HTTP suite now verifies Overview's empty content, the real published-project listing and its ordering/privacy, listing empty state, translated navigation and current-page semantics, retained boards, escaping, publication changes, missing/private projects, locale isolation and invalid-sign-in feedback. Fixture cleanup uses only the run's UUIDs and verifies matching population counts, including existing users and administrator authorization. The suite created no users and changed no existing authorization. These are HTTP/markup checks, not browser interaction or screenshot comparisons.

### Security checks and open findings

- `node --test tests/auth.test.ts tests/env.test.ts`: all 11 focused tests passed; they are a subset of the application suite and use client doubles for auth logic.
- `npm audit --omit=dev --json`: zero known production dependency vulnerabilities. The first sandbox attempt failed on network/cache restrictions; the real-user retry succeeded without installing/updating dependencies.
- Read-only local SQL in `BEGIN READ ONLY`/`ROLLBACK` confirmed RLS on projects, columns, tasks and the private administrator table; installed policies matched the migrations. Anonymous insertion is denied; application roles cannot create objects in `public` or access `private`; `is_admin` is restricted to authenticated execution, uses `SECURITY DEFINER` and has an empty search path. No records were changed by this inspection.

| Priority / scope | Finding and next proposal |
| --- | --- |
| P2 before deployment | Auth clients do not force `Secure` cookies; propose coherent deployed-HTTPS cookie options across server/proxy/browser, preserving local development. Browser-readable cookies are part of the current Supabase SSR design and were not changed automatically. |
| P2 configuration hardening | Supabase URL validation accepts non-loopback HTTP. Propose HTTPS with an explicit loopback development exception and validation tests. This requires unsafe deployment configuration; it is not a request-controlled URL bypass. |
| P2 at scale | The Data API caps responses at 1,000 rows while retained list queries do not paginate; large boards may be partial. Use exact counts for future KPIs and confirm pagination or a product limit. No current truncation was demonstrated. |
| P2 rendering/accessibility | Project-specific 404 still returns its heading only in RSC, not initial HTML. A fresh HTTP inspection reproduced this; the generic 404 and login do have initial HTML headings. Styling does not resolve the limitation. |
| Future admin scope | Session refresh currently matches `/admin/:path*`. Confirm coverage and server checks before adding owner-only controls/private counts to Overview or Projects. Current public reads ignore admin cookies. |

No administrator bypass or private-project exposure was found in the inspected code, installed policies or exercised public cases. This is not a complete security certification. A real successful owner login, renewal and revocation were not re-exercised; their earlier evidence remains historical. The SQL suite that requires an empty database was not run. No remote environment, production TLS/headers or live rate limits were validated. Proposed policy/transport changes require owner confirmation before implementation under the repository's existing rules.

### Visual verification and acceptance

Native Computer Use discovered Chrome but stopped before UI inspection because it could not determine the current browser URL confidently enough to enforce policy. No other browser-control path was used after that stop. Consequently, responsive appearance, actual keyboard focus, font rendering and hydration remain unverified; source semantics/focus styles were reviewed. The navigation structure is owner-selected, but visual acceptance and KPI definitions remain pending. The temporary test server is stopped after validation. No commit after the Garden rename, push, deployment, migration or user/administrator change was made.

## Approved transport hardening and larger sidebar — 2026-11-08

The owner approved the two security proposals and requested commits separated by responsibility. The server, proxy and browser clients now share Auth cookie options requiring `Secure` in production. Development/test retain HTTP cookie support. Supabase configuration now accepts HTTPS origins or HTTP on explicit loopback hosts (`localhost`, `127.0.0.1`, `[::1]`); remote/LAN HTTP and deceptive hostname suffixes are rejected. ADR 0002 records the subsequent approved transport decision without changing the historical RLS decision.

Six new adapter tests exercise cookie creation and deletion in the installed Supabase SSR server/browser clients for production, development and test. Auth responses are explicit test doubles; they do not create users or contact a real Auth service. They assert the secure flag and preserved path, SameSite and browser-readable defaults. URL tests cover each allowed loopback host and rejected unencrypted destinations. These are configuration/adapter checks, not proof of browser cookie delivery or a successful real owner session.

The enlarged sidebar uses a 19rem desktop width and 5rem mobile rail, retaining the 48rem breakpoint, full-height placement and ambient background. Its logo is 40px, brand title 30px, navigation text 20px and icons 24px; spacing and link areas are larger. Proportions remain provisional for owner visual review. The board's existing "All projects" action now returns to `/projects`, matching the selected navigation; the HTTP suite checks that actual action destination separately from the sidebar link.

| Final check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 27 application tests passed |
| `npm run build` | Production build passed, including both project routes |
| `KANBAN_TEST_URL=http://127.0.0.1:3001 npm run test:public` | All 20 HTTP tests passed with real local Supabase |

The first type check of the new test rejected a union of overloaded client factories; explicit factory calls corrected the test typing. The added return-link assertion initially included the decorative arrow in its text match; it was corrected to exclude the `aria-hidden` span, then all HTTP cases passed. These were test implementation issues, not skipped failures. The production server was restarted after the final application build and stopped after validation.

HTTP fixtures are identified by this run's UUIDs and cleanup removes only those records. Population checks passed for projects, columns, tasks, users and administrator authorization; no users or existing authorization were changed. No migration, dependency installation, remote connection, deployment or push was performed. The empty-database SQL suite and a successful real owner login/renewal were not run. Production authentication requires HTTPS; local production HTTP checks exercise public pages and invalid-input feedback only.

Responsive layout, semantics, accessible labels and focus utilities were reviewed in source and HTTP markup. No new browser inspection was attempted after the recorded Computer Use policy stop, so visual appearance, actual keyboard behavior and hydration remain unverified. The project-specific 404 initial-HTML issue and response pagination limit remain open; no unrelated architecture or rendering workaround was introduced. KPI definitions and final visual acceptance remain pending.

The approved changes were committed by responsibility: `c09cb54` for transport security, `07c7b22` for internal English comments/errors and `8eee801` for navigation, public project views and supporting-page/sidebar UI. The related product, development and verification records are kept in a separate documentation commit. Staged diffs were reviewed for scope, whitespace, credentials, environment files and generated artifacts. No push was requested or performed.

## Sidebar cartoon prototype — 2026-11-08

The owner requested a looping cartoon at the bottom of the drawer before moving to task CRUD. The built-in image tool generated eight aligned working/sipping poses from the personal portfolio portraits. A subsequent owner correction removed the visible chocolate/stains and added subtle steam. The selected transparent sheet is served from `public/illustrations/sidebar-working-v1.webp` (1774×887, 275,674 bytes). The final edit prompt and implementation conventions are recorded in Development.

`SidebarIllustration` selects sprite cells through a 12-second discrete CSS loop, with a translated pause/resume button. Reduced-motion preferences produce a still frame with no animation control. The decoration/control are hidden on compact-width and short-height layouts, and the drawer can scroll vertically when needed. The illustration is excluded from the accessibility tree; its control retains an accessible name and focus outline. Geometry, frame pacing and resemblance are provisional until owner review.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 27 application tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3001 node --test tests/i18n-http.test.mjs` | All seven HTTP tests passed |
| Ad hoc asset/CSS HTTP check | Asset returned 200 with WebP content type and alpha; compiled CSS contains sprite timing, pause state and reduced-motion treatment |

The HTTP assertions allow the new sidebar button while preserving the empty main content and verifying the control's initial translated accessible label. The Catalan assertion initially failed because its apostrophe was HTML-escaped; escaping the expected label corrected the test, and the suite then passed. Initial markup assertions do not establish that clicking or keyboard activation actually pauses/resumes the animation. No tests mirroring the static sprite keyframe positions were added.

The browser integration reported that its access host was unavailable. Browser visual review, actual pause/resume interaction, reduced-motion emulation and responsive screenshots have not been completed. Source and compiled-CSS checks are distinct from browser verification. The database-fixture HTTP suite and SQL suite were not rerun for this decorative change; no users or database records were created or changed. The temporary production server was stopped. No dependencies, commits, push, deployment or CRUD implementation were introduced; branch/design acceptance remains pending owner review.

### Sidebar placement follow-up

Following owner feedback, the brand and navigation now form one non-shrinking top group, with the illustration separated at the bottom of the flex drawer. Desktop bottom padding was reduced from 3rem to 1rem, and the pause control stays inside the scene rather than extending below it. This is a source-level placement correction awaiting visual confirmation.

`npm run lint`, `npm run typecheck`, `npm test` (27 tests), `npm run build` and `KANBAN_TEST_URL=http://127.0.0.1:3001 node --test tests/i18n-http.test.mjs` (seven tests) passed after the correction. The temporary server was stopped. No database suites, native/browser automation, dependencies, commits or remote operations were added in this follow-up.

The owner asked about pause requirements and continuous motion. WCAG 2.2.2 was checked against the W3C explanation: this nonessential automatic loop lasts over five seconds alongside other content, so a pause/stop/hide mechanism is appropriate; reduced-motion handling is separate. Tool discovery found image generation but no video generation. Layered continuous animation versus a separately sourced video clip has been presented for owner choice. The current sprite animation remains unchanged; no improvement in motion smoothness or video generation is claimed.

## Calmer sidebar animation and edge treatment — 2026-11-13

The preserved intermediate-frame work introduces a reusable canvas-based `SpriteAnimation` and a tested timeline for typing/drinking. The original eight-pose reference remains in the tree. The image tool produced a 16-cell typing sheet and a 32-cell reach/lift/sip sheet; these are generated poses, not optical-flow interpolation or proof of perfect temporal consistency. The drinking clip retraces the reach/lift path to return the mug, and both clips render the same separate poster at their boundary. Five timeline tests cover boundary-only switching, randomized rescheduling, frame-rate-independent progression, stationary clocks and invalid timing. These tests do not exercise browser rendering or judge pose quality.

The owner then requested no square lines, a subtler cozy appearance, less keyboard movement and a video comparison. Inspection found nontransparent pixels at several atlas-cell edges, which can contribute to visible sampling seams. The canvas now samples 1.5px inside each cell, while a spatial alpha mask softens only the scene perimeter. There is no temporal crossfade. The scene is capped at 15rem and the pause control no longer has a filled circular background at rest; its target and visible focus treatment remain.

Typing now uses four small poses, with two brief bursts separated by 4-, 3- and 4-second rests. Drinking targets 35–65 seconds of active typing and waits for a loop boundary; its sip hold is 1.25 seconds. Repeated cells are not repainted. The unused twelve typing poses were removed from the active atlas, preserving the larger sheet as a reference. Active files retain alpha and total 490,062 bytes, down from 668,914 bytes. No browser CPU/battery improvement or video-size comparison is claimed from those byte counts alone.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 32 application tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3002 node --test tests/i18n-http.test.mjs` | All seven HTTP cases passed |
| Ad hoc HTTP asset/CSS check | All three active assets returned 200, with expected dimensions and alpha; the compiled edge mask and reduced-motion CSS were present |
| `git diff --check` | Passed with line-ending conversion notices only |

The browser integration again reported an unavailable access host. Visual edge removal, perceived calmness, actual pause interaction and responsive appearance remain unverified in a browser; source/HTTP checks are not screenshot acceptance. The temporary test server on port 3002 was stopped. Its project-list requests logged `ECONNREFUSED` because local Supabase on port 54321 was unavailable. The seven interface/i18n cases still passed, but they do not establish successful database-backed project rendering. Database-fixture and SQL suites were not rerun with that prerequisite unavailable. No users, database records, dependencies, commits, push, external video service or CRUD functionality were changed.

For more natural human motion, a newly generated temporally consistent short clip is a candidate for a later visual comparison. Converting the same generated drawings to video would preserve their inconsistencies. No video exists in this repository to compare size, playback cost, transparency or loop quality; no video-performance claim is made.

## Native video conversion and playback revision — 2026-11-13

The owner reported no animation and explicitly requested video conversion and testing. The prior source spent over 90% of each typing cycle at rest and delayed its first gesture by four seconds; that explains an apparently stationary interval but was not established as the only issue in the owner's browser. The old reduced-motion CSS also hid the manual playback control. The new native player repeats a moving typing clip and leaves manual play available when motion preferences or autoplay restrictions suppress automatic playback.

The canvas player, its frame clock and five associated tests were replaced by `VideoIllustration`, `video-sequence.ts` and three native-cycle sequencing tests. Two muted inline videos remain mounted, with one visible at a time. Native completion events repeat typing or trigger a drink after 15–30 seconds of completed typing playback; drinking completion returns to typing. Manual pause, tab visibility and viewport visibility control playback. Reduced-motion preferences suppress automatic movement until explicit opt-in. The shared transparent poster is retained on media errors. No frame-by-frame React updates or custom canvas animation remain in the active path.

No installed FFmpeg was found, and the Windows Python launcher could not execute during tool discovery. A portable FFmpeg 9.0.2 package from gyan.dev, linked by ffmpeg.org, was downloaded into ignored `build/video-tools/` and checked against the publisher's SHA-256. An initially slow ZIP download was cancelled; the smaller verified 7z archive was used. No package.json, lockfile, system installation or external video-generation service was added.

Source PNG sequences were sampled at 16fps, with a common starting/ending pose. Original alpha masks were merged with palette-matted color planes, then motion-compensated to 48fps using FFmpeg `minterpolate` in `mci` mode and encoded as WebM/VP9 with alpha and no audio. This is estimated motion interpolation, not a generative-video model or a guarantee against facial/hand warping. The decoded quarter-second stills were inspected; full-motion naturalness remains a separate visual check.

| Encoded file | Duration | Decoded frames | Distinct decoded frames | Bytes |
| --- | --- | --- | --- | --- |
| `typing-v4.webm` | 2.209s | 106 | 95 | 107,186 |
| `drinking-v4.webm` | 5.459s | 262 | 222 | 264,560 |

Both streams are 224×224 at 48fps. Complete libvpx decoding succeeded, with alpha spanning 0–255. Compared with each first frame, the quarter-second frame changed 14,244 and 7,672 visible pixels respectively under the ad hoc threshold, confirming that the encoded media contains early movement. These are decoder/pixel assertions, not proof that a particular browser is playing. Active videos plus the poster total 384,516 bytes, versus 490,062 bytes for the prior selection; CPU and battery usage were not benchmarked.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 30 tests passed, including three video-sequence cases |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3002 node --test tests/i18n-http.test.mjs` | All seven cases passed with native video markup and initial play labels |
| Full FFmpeg/ffprobe validation | Both clips fully decoded; codec, frame rate, dimensions, audio absence, alpha and early changes passed |
| HTTP media checks | Both files returned 200 as `video/webm`, had valid WebM headers and supported 32-byte requests with HTTP 206 |

The browser inventory and an in-app browser attempt both reported an unavailable browser access host. Actual browser `currentTime` progression, pause interaction, perceived fluidity and cross-browser alpha handling have not been verified. Source review and decoded stills do not constitute full-motion visual acceptance. VP9 alpha compatibility requires review in target browsers; errors retain the poster rather than claiming successful animation.

Local Supabase remained unavailable, so the interface suite's passing cases are not evidence of database-backed project rendering. No database suites, fixtures or users were introduced. The temporary production server was stopped. Existing sprite sheets were preserved as references. No commit, push, deployment or CRUD implementation was performed.

## Sidebar loop and hand correction — 2026-11-13

The owner continued to see a cut after the native-loop playback revision. The owner-requested Chrome DevTools MCP connection subsequently became available, allowing direct checks of the local production page. Chrome telemetry confirmed actual typing, drinking and return playback, with roughly 2–3ms seeking/waiting events on native typing wraps in the initial sample. This did not establish the cause of the perceived cut. Decoded frames also showed whole-body alignment changes and a nearly stationary tail in the preceding typing asset.

The typing candidate was re-encoded as a three-second cyclic sequence, interpolating three repeated pose cycles and retaining the middle one so both ends have real temporal context. A shared resting drawing stabilizes the head, torso and desk. The first spatial-mask candidate (`typing-v5.webm`) left part of the original hand visible and admitted laptop movement; the owner correctly identified a doubled hand and stretched computer. It was superseded by `typing-v6.webm`, whose opaque hand region covers the complete resting hand, with feathering outside its silhouette and an explicit screen/keyboard exclusion. Enlarged browser frame comparisons at 0, 0.1, 0.2, 0.4 and 0.8 seconds were inspected before selecting v6. These comparisons address the reported duplicated contour; they are not proof that every intermediate frame is artifact-free.

The selected typing asset is 49,382 bytes, 224×224, 48fps, 144 frames and three seconds long, with no audio. Full decoding succeeded and alpha spans 0–255. An ad hoc premultiplied-RGB difference check measured a mean difference of 0.725 across the wrap versus a maximum adjacent-frame difference of 0.839 within the clip (0–255 channel scale). Thus the encoded wrap was not an exceptional frame jump in that check; it does not quantify perceived naturalness. Sampled fixed-screen and keyboard regions changed by at most 0.125 and 1.937 mean channel levels from their initial decoded image, respectively, including codec variation. The full drinking asset remains unchanged. Active videos plus poster total 326,712 bytes; older assets remain as references and are not loaded by the component.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed without warnings |
| `npm run typecheck` | Route generation and TypeScript passed |
| `npm test` | All 34 application tests passed |
| `npm run build` | Production build passed |
| `KANBAN_TEST_URL=http://127.0.0.1:3002 node --test tests/i18n-http.test.mjs` | All seven cases passed against the final v6 selection |
| Chrome desktop, 1440×900 | Actual component changed typing → drinking → typing; manual pause held `currentTime` stable |
| Keyboard | Five Tab presses reached the pause control with a visible solid outline; Enter paused both videos and updated the accessible label; target was 44×44px |
| Reduced motion | Reload with the preference enabled kept playback paused at zero; explicit play advanced the video and updated the label |
| Chrome mobile, 390×844 | Screenshot inspected; illustration/control hidden, both videos paused, document width equalled viewport width, and navigation retained accessible labels |

Chrome screenshots and enlarged frame comparisons were inspected. The inspection tools expose stills and playback telemetry rather than continuous visual perception; owner review of naturalness, anatomy and the revised loop remains pending. Other browsers and battery/CPU usage were not tested. The interface suite again logged local Supabase connection failures, so it does not validate database-backed project rendering. No database suites, users, records, application dependencies, commits or remote operations were added. The local production preview on port 3002 is left running for owner review.

## Animation resource cleanup — 2026-11-13

The owner requested keeping only important animation resources and explicitly preserving the image sequences used to create the videos. `public/illustrations/` now contains only the two active videos and their fallback poster. Four source sheets were moved unchanged to `assets/sidebar-illustration/`. All 228 original color/alpha PNG inputs remain in the existing ignored `build/video-input/typing/` and `build/video-input/drinking/` directories, with the shared anchor and encoding recipes also retained locally. SHA-256 comparisons before and after cleanup confirmed that every source sheet and input PNG remained unchanged. The source sheets are available for Git tracking; ignored local inputs are not included by a normal commit.

Removed only discarded typing videos, diagnostic decoded stills, repeated copies of the cyclic typing inputs, an obsolete verification script, FFmpeg download archives and extracted temporary binaries. Removed files totalled 396,329,473 bytes. Playback components, sequence logic, tests, selected assets and animation timing were unchanged. This cleanup does not constitute visual acceptance of the animation.

`npm run lint`, `npm run typecheck`, `npm test` (34 tests) and `npm run build` passed after cleanup. A local production HTTP check confirmed all three active assets returned 200 with their expected MIME types and exact byte lengths, a video byte-range request returned 206 with 32 bytes, and all six obsolete/moved public URLs returned 404. No additional browser visual pass or database suites were run for this file-only cleanup. `git diff --check` passed with line-ending conversion notices only. The local production preview on port 3002 was restarted and remains available for review. No commit was made.

## Component folder organization — 2026-11-13

At the owner's request, the 13 component/CSS files were grouped into `layout`, `illustrations`, `projects`, `tasks` and `shared` folders. Relative imports and current documentation paths were updated; CSS modules remain beside their components. Rendering, Server/Client Component boundaries, navigation, styles, video sources and sequence logic were preserved. No barrel exports, wrappers or dependencies were introduced.

`npm run lint`, `npm run typecheck`, `npm test` (34 tests), `npm run build`, `KANBAN_TEST_URL=http://127.0.0.1:3002 node --test tests/i18n-http.test.mjs` (seven tests) and `git diff --check` passed. A Chrome desktop screenshot was inspected after reload; browser checks confirmed one sidebar/navigation, its 304px width, both video elements, visible typing playback advancing and the pause label. Responsive, keyboard and reduced-motion checks from the preceding revision were not repeated for this file-only reorganization. Local Supabase remains unavailable, so the HTTP results do not establish database-backed rendering; database suites were not run. The production preview on port 3002 was restarted for review. No commit was made.

### Commit handoff

The owner subsequently authorized committing the pending work by responsibility: `f075749` contains component organization and import updates; `f4734ed` contains the sidebar animation, source sheets, runtime media, controls, translations and tests. The related development, product and validation documentation is recorded in a separate commit. Staged diffs were reviewed for scope, whitespace, credentials and generated/environment files; the animation CSS's redundant final blank line was removed. Ignored local source PNGs and encoding recipes remain outside Git and were preserved. No push was requested or performed. Visual acceptance remains pending owner review.

## Project CRUD preparation — 2026-11-14

The owner requested starting project CRUD interactively in the `feat/project-crud` worktree, raising unresolved product and security decisions before implementing them. `lib/projects/input.ts` prepares validation for the existing name, slug and description fields. It returns typed field errors, trims the name, preserves nonempty description text, represents absent/empty descriptions as null and excludes identity, publication, ordering and timestamp fields. It rejects duplicate fields, file inputs and null bytes; text lengths count Unicode code points to match PostgreSQL. Slug validation reuses the existing URL contract. Database uniqueness still needs enforcement and error handling in future mutation actions.

Six new input tests passed. `npm ci --no-audit --no-fund`, `npm run lint`, `npm run typecheck`, `npm test` (40 tests) and `npm run build` passed in the worktree without Supabase configuration. Installation reported the existing ESLint support warning and three dependency lifecycle scripts lacking npm approval; no dependencies or lockfile changes were introduced. These checks do not establish successful database writes or a usable CRUD interface.

No UI, authentication, query, schema or policy behavior changed. No Supabase instance was contacted, and no HTTP integration, SQL suite, browser or visual checks were run. No records, users, administrator authorization, migrations, commits, pushes or deployments were changed. The input validator is not connected to a Server Action yet. The first pending owner decision is whether this CRUD increment uses existing project fields or also models objectives and the repository link. Shared-route session handling and deletion behavior still need concrete proposals before the corresponding implementation.

## Zod adoption and strict typing — 2026-11-14

The owner explicitly selected Zod and prohibited `any`. `npm view zod version` returned 4.6.7; `npm install --save-exact zod@4.6.7 --no-audit --no-fund` declared that exact version as a direct runtime dependency. The existing lockfile already contained the same version transitively; no unrelated dependency upgrade was made. npm again reported three dependency lifecycle scripts without approval; no script approval or workaround was added.

Project details now use a strict Zod schema and inferred input/output types, with output compatibility checked against the Supabase insert type. Existing six input tests continue to pass; a seventh rejects untrusted object shapes, type coercion and extra protected fields at the schema boundary. The schema preserves the existing validation behavior, including Unicode code-point length limits. The form adapter still does not authorize or write data.

`strict` remains enabled; `noUncheckedIndexedAccess` is now enabled. Type-aware ESLint rejects explicit `any` and unsafe assignments, arguments, calls, member access and returns. In-memory negative samples passed through the real ESLint configuration triggered all six rules; no invalid fixture file was written. `npm run lint`, `npm run typecheck`, `npm test` (41 tests) and `npm run build` passed without Supabase configuration. `git diff --check` passed with line-ending conversion notices only.

An exploratory `npx tsc --noEmit --noUncheckedIndexedAccess --exactOptionalPropertyTypes` failed on existing Supabase RPC/cookie and environment type contracts. `exactOptionalPropertyTypes` was not enabled in this increment to avoid unrelated authentication and SDK changes. Checked index access alone passed and is enabled; this does not weaken TypeScript strict mode or the prohibition of `any`.

The typing policy and dependency decision are recorded in AGENTS.md, development/product documentation and the dated update to ADR 0001. No UI, database schema, policies, authentication behavior or existing data changed. No database, HTTP integration, browser or visual checks were run for this input/configuration change. No commits, pushes, remote connections or deployments were made. Project CRUD actions/forms and the previously raised field-scope decision remain pending.
## Rich project content implementation — 2026-11-14

The owner confirmed Tiptap, JSONB content and private Supabase Storage with controlled Next.js delivery. The decision is recorded as a dated accepted update in ADRs 0001/0002, preserving their historical scope. Tiptap React, PM and StarterKit were installed at exactly 3.34.0. The application has not adopted an image-processing dependency; Sharp 0.35.5 is proposed for the next upload increment. npm repeated the three existing unapproved lifecycle-script notices; no script approvals, unrelated upgrades, commits or pushes were made.

The protected /admin working prototype supports draft creation, project selection, rich description/objectives, optional HTTPS repository, detail updates and separate publish/hide actions. All actions verify the administrator, validate allowlisted fields and rely on RLS. Updates reject stale updated_at values. Public rich text is rendered with semantic React nodes; card summaries and metadata use plain text. Image binaries are read through /project-images/:id with an explicit authorized preview mode and non-cacheable responses. Image upload and project deletion are not exposed.

### Application checks

- npm run lint: passed with zero warnings after the final source changes.
- npm run typecheck: passed; the production build also completed its TypeScript check.
- npm test: 47 tests passed. New coverage includes the actual Tiptap schema/JSON round trip, default link attributes, formatted hard breaks, nested lists, Unicode/text/byte/node/depth limits, cycles, executable links, arbitrary image sources/attributes, duplicate marks, optional content and forged/duplicate form fields.
- npm run build: passed using public local Supabase configuration supplied only to the validation process. No environment file was created or printed. The controlled image route and existing pages were generated as dynamic routes.
- git diff --check: passed; Git reported LF-to-CRLF conversion notices only.

An initial editor round-trip test caught a missing nullable title attribute on Tiptap links; the explicit schema was corrected and the test passed. Regenerating database types correctly returned SQL TEXT CHECK priorities as string rather than a literal union; task reads now narrow them with Zod instead of asserting a narrower generated type. The temporary formatter invocation first failed due to Windows shell quoting, then ran successfully through stdin using the existing TypeScript printer; no formatter dependency was added.

### Database validation and local application

The running local Storage version exposes operation-aware policy helpers. Before applying the migration, a transaction applied its DDL/backfill plus access assertions and rolled everything back. A unique pre-migration legacy fixture included whitespace, a newline and supplementary Unicode; its original text, name, slug, ordering, publication and timestamps were compared with the migrated row. The owner instance had no existing project rows at this check, so migration preservation evidence is from that explicit fixture, not an assertion about a populated project collection.

The focused tests/project-content-db.sql assertions passed in that transaction and again against the migrated schema. They cover anonymous/unauthorized/admin access, pending/unattached images, authorized private preview, signing/listing denial, hiding, removal of saved references and database constraints. They create no users and do not modify administrator authorization. All fixture rows and temporary functions roll back. This standalone test remains outside supabase/tests so it does not change the original pgTAP suite's disposable-database prerequisites.

After those checks, npx supabase@2.122.0 migration up --local applied only 20261114000100_project_rich_text.sql. npx supabase@2.122.0 db lint --local reported no schema errors. No remote migration, reset or deletion of existing data was performed. Types were regenerated from the actual migrated public schema through the same pinned CLI, then formatted with the already installed TypeScript printer. Older migration files were not edited.

### HTTP integration

A temporary local production server on port 3015 ran npm run test:public: 24 tests passed with no skips, including the existing public-page and localization suites. Tests run sequentially to preserve shared population checks. The new typed HTTP test uses the existing local administrator and a short-lived, memory-only local token; no credentials are printed, persisted or sent off loopback, and no users are created.

A unique 1-pixel WebP was uploaded through Storage with administrator authorization. Assertions verified real byte-for-byte downloads, private preview, denial of draft reads even with administrator cookies on the public path, semantic rich-text rendering, no signed redirects, denial of signed-URL generation for both anonymous and administrator clients, and immediate rejection of the same URL after hiding. The object was removed through Storage first, followed only by its specific fixture asset/project IDs. Data, user and administrator counts matched their initial values. The temporary production server was stopped.

HTTP tests did not exercise project Server Action submissions or a browser editor session. No browser, responsive-layout, focus, keyboard interaction or visual acceptance review was performed. Provisional /admin placement, scoped system-font typography, toolbar presentation, image upload/normalization/lifecycle and final shared-route administration remain pending. Deletion still needs the owner's descendant/file behavior decision. These successful checks do not mark the CRUD phase or UI as accepted.

## Shared project administration and Sharp uploads - 2026-11-14

The owner confirmed that /admin is only for authentication, project creation
opens from Projects, and project/task administration belongs in the shared
visitor-facing views. Sharp 0.35.5 was accepted as a direct dependency.
The project listing now includes owner-only draft access and a create-form
button; details expose editing/publication with private previews. The
existing session proxy covers these routes while private reads/actions
continue independent server authorization and RLS. Task mutations are not
implemented by this increment. No new migration was needed for these
follow-up changes.

### Final application and database results

- npm run lint: passed with zero warnings.
- npm run typecheck: passed.
- npm test: 53 tests passed, no skips. New image cases verify real JPEG/PNG/
  WebP processing, orientation, resize without enlargement, metadata removal,
  invalid/signature-spoofed/truncated input, input byte/pixel limits, bounded
  streamed multipart parsing and rejection of a real two-frame WebP.
- npm run build: passed with public loopback Supabase configuration supplied
  only to the child process; no environment file or credential was printed.
- npm run test:public: 27 tests passed, no skips, against the final production
  build on temporary loopback port 3015. The temporary server was stopped.
- tests/project-content-db.sql through local psql with ON_ERROR_STOP=1:
  access assertions passed and the transaction rolled back.
- npx supabase@2.122.0 db lint --local: no schema errors.
- npm audit --omit=dev --json: zero production vulnerabilities. Installation
  reported seven moderate findings in the full dependency tree; this result
  does not claim a clean development-dependency audit and no automatic audit
  fixes or dependency upgrades were performed.

HTTP coverage now exercises owner listing/detail access to a draft and its
board content; public HTML/RSC excludes private fixture data. /admin sends
an authorized owner to Projects. The tests submit actual Next Server Action
requests to create, edit, publish and hide a separate fixture project,
verify redirects to its validated slug, reject unauthorized/stale writes
and cross-project image references, and confirm protected publication and
position fields cannot be set by the details form. The upload Route Handler
rejects unauthenticated/cross-origin/spoofed/nonexistent-project requests;
a real PNG upload becomes a ready WebP asset, strips metadata, remains
private before a saved reference, and supports authorized preview.
Existing signed-URL denial and immediate-hide assertions also pass.

Only test-specific objects and fixture IDs were removed, objects before
asset rows. Unique fixture project descendants were removed through their
existing parent cascade. Counts for projects, assets, columns, tasks, users
and administrator authorization matched the starting state. No users were
created and no administrator registry or existing user data was changed.
The original empty-database/user-creating pgTAP suite was not run.

Initial validation caught missing shared-view bindings and a TypeScript
parameter property incompatible with Node strip-only tests; these were
corrected. HTTP checks caught an Origin comparison using Next's internal
hostname instead of the browser-facing Host; matching now checks the
canonical Origin, Host and protocol and still fails closed. The test wire
encoder was corrected to send referenced form fields before the root part,
and assertions were aligned with Next's streamed 200 response plus
x-action-redirect. All final checks above ran after those corrections.

### Limits and acceptance

The form now supplies expanded/collapsed semantics, a controlled region,
loading/status/error messages, labels and focus on the opened heading.
These are implementation/static and HTTP checks. No browser, responsive,
keyboard, focus or visual interaction verification was performed; toolbar,
inline-form presentation and scoped rich-text typography await owner review.
Real HTTPS owner login and expired-session renewal remain deployment checks.

Sharp processing runs only on the server. Upload default limits and the
measured Windows package footprint are recorded in development.md; no
production-artifact size or CPU/memory benchmark is claimed. Failure-path
compensation is implemented but was not tested with injected Storage/network
faults. Successful uploads abandoned before a document save, or removed
from documents, retain private files; broad cleanup and project deletion
still need an explicit lifecycle decision. Navigating away can discard
unsaved changes. No commits, pushes, remote migrations or deployment were
performed. Validation does not mark the CRUD phase or UI accepted.

## Commit and review preparation - 2026-11-14

The owner requested commits, a WIP designation for UI work, and a review
URL. The logic/storage changes and the shared UI were committed separately;
the UI commit retains WIP status and does not establish visual acceptance.

Fresh verification before committing:

- `npm run lint`: passed with no warnings.
- `npm run typecheck`: passed.
- `npm test`: 53 passed, zero failures or skips.
- `npm run build`: passed with local public Supabase configuration supplied
  through the child process environment.
- `npm run test:public`: 27 passed, zero failures or skips, against a
  temporary production server at 127.0.0.1:3015. The suite used the existing
  local administrator, created no users, cleaned up its specific fixtures
  and verified unchanged population counts. That server was stopped.
- `git diff --check` and staged whitespace checks passed. Changed files and
  each staged code group were inspected for credential literals, unsafe
  typing, generated artifacts and environment files; none were found.

A separate development server was then started on loopback port 3015 for
the owner's interaction review. HTTP smoke checks returned 200 for
/projects and /admin/login, and 307 from /admin to /admin/login without a
session. The rendered projects response did not show unavailable-database
feedback. The development server remains running for review. No browser,
responsive, keyboard/focus or real HTTPS login verification is claimed.

Remote publication could not be prepared against an existing environment:
the repository and main checkout have no linked hosting project or remote
Supabase project, available Supabase configuration is loopback-only, and
no deployment credentials are configured. The local URL is explicitly a
local review environment. No push, remote migration, user creation or
remote deployment has been performed in this preparation step.

## Project sign-out control correction - 2026-11-15

The owner requested removing the extra sign-out button from Projects,
because main already owns shared session controls. Only its import and
listing markup were removed; main was inspected but not merged.

- npm run lint and npm run typecheck: passed.
- npm test: 53 passed, no failures or skips.
- npm run build: passed with process-local public Supabase configuration.
- Read-only local HTTP checks: /projects and /admin/login returned 200.
  With the existing administrator's short-lived, memory-only local test
  session, Projects returned 200 with its creation control and without
  the extra sign-out control. No users or fixtures were created.
- git diff --check: passed. No browser or visual review was performed.

Docker Desktop was restarted because its engine was stopped. The existing
Supabase containers resumed without a reset or migration. The local
development server was restarted on http://127.0.0.1:3015/projects for
owner review. No remote deployment or merge from main was performed.

## Project modal and left alignment - 2026-11-15

The owner requested left alignment for the project creation button and a
modal form. ProjectManagement now uses a native dialog for creation and
editing; no dependency, database or authorization changes were made.

- npm run lint: passed without warnings.
- npm run typecheck: passed.
- npm test: 53 passed, no failures or skips.
- npm run build: passed with local public Supabase configuration injected
  through the process environment.
- git diff --check: passed.

An ad hoc browser integration check ran with the installed Edge in headless
mode, through Node's built-in WebSocket/CDP support, without installing a
browser-testing dependency. The command was
`node "$env:TEMP/project-garden-modal-check.cjs"`. It used a temporary,
isolated browser context and the existing local administrator. The context
and browser were closed, and the temporary profile was removed.

The final browser assertions passed for keyboard opening, the accessible
heading reference, initial heading focus, Tab/Shift+Tab containment, Escape
and button dismissal, opener focus restoration, and body-scroll restoration.
At 1440x1000, 390x844 and 320x640, the dialog fitted the viewport without
horizontal overflow, scrolled internally, and kept its close control visible.
The creation button matched the main content's left edge.

An intercepted save request verified that the close control was disabled
and Escape could not dismiss the busy dialog. Before forwarding it, the
test removed the required name so server validation rejected the request
without creating a project. The dialog remained usable after the validation
response and could close again. A read-only database check found zero rows
with the test slug. No users, project fixtures, schema changes or migrations
were created by these checks. Publication/upload pending guards were not
individually exercised in this browser check.

Early browser checks exposed native focus navigation reaching browser chrome
and a non-cancelable native close request; explicit focus cycling and busy
Escape/closedby guards resolved those assertions. The keyboard test driver
was also corrected to send Enter's text event and wait for hydration.
These automated layout/input assertions are not manual visual review,
screen-reader testing, physical-device testing or cross-browser validation.
Owner visual acceptance remains pending. The local review server remains
available at http://127.0.0.1:3015/projects.

## Cozy modal and rich-text refinement - 2026-11-15

The owner requested right-aligned actions, a gentle modal entrance, a header
X, bottom Close action and a visual review of the rich-text fields. The
prototype now has a fixed action footer, CSS-only entry/backdrop animation,
grouped icon controls, a warm field shell and localized empty-writing hints.
No dependency, schema or authorization change was introduced.

- npm run lint: passed without warnings.
- npm run typecheck: passed.
- npm test: 53 passed, no failures or skips.
- npm run build: passed with process-local public Supabase configuration.
- git diff --check: passed.

The ad hoc headless Edge/CDP check ran as
`node "$env:TEMP/project-garden-cozy-modal-check.cjs"`. It used an isolated
temporary context and the existing local administrator, then closed the
browser and removed its profile. At 1440x1000, 390x844 and 320x640 it verified
right alignment, viewport fit, no horizontal overflow, a scrolling form
body, and a visible right-aligned footer. Desktop and 390px screenshots
were also inspected for the warm surfaces, spacing and grouped controls.

Browser assertions verified the configured entrance animation, disabled
dialog/backdrop animations under prefers-reduced-motion, translated names
and titles on icon controls, 44px targets, and actual bold text editing.
Keyboard opening, initial heading focus, Tab/Shift+Tab cycling, Escape
from within the editor, bottom-button dismissal and focus/scroll restoration
passed. Escape capture was adjusted after the editor-focused dismissal
check exposed reliance on native close-request behavior.

The footer submit button was exercised through its native form association.
An intercepted pending request verified disabled close controls and blocked
Escape. The required name was removed before forwarding, so server
validation rejected it without creating a project; closing worked again
after the response. A read-only database check found zero rows for the
test slug. No users, project fixtures or migrations were created. The full
database/HTTP fixture suites were not rerun for this presentation change.

These checks are not physical-device, screen-reader or cross-browser
validation. Exact styling remains WIP pending owner visual review. The
local review URL remains http://127.0.0.1:3015/projects.


## Responsive project creation action - 2026-11-15

The owner requested the creation button beside the introduction on large
screens and at full content width below it on small screens.

- npm run lint: passed, no warnings.
- npm run typecheck: passed.
- npm test: 53 passed, no failures or skips.
- npm run build: passed with process-local public local Supabase configuration.

The focused ad hoc check ran as
`node "$env:TEMP/project-garden-responsive-header-check.cjs"` in
headless Edge with an isolated context and the existing local administrator.
Assertions passed at widths 1,440, 1,024, 900, 768, 640, 390 and 320px:
the action aligns beside the description from 1,024px, fills the content
width below that breakpoint, and causes no horizontal page overflow.
Screenshots at 1,440px and 390px were inspected. Keyboard modal opening,
initial heading focus, Escape dismissal and opener focus restoration passed.
The anonymous header was checked at 1,440px and 390px without management
controls or overflow. No users, records or migrations were created.

This focused review does not repeat the full editor/save integration suite
or constitute cross-browser, physical-device or screen-reader validation.
The layout remains WIP pending owner visual review.

## Project schema and form adapter separation - 2026-11-15

Moved the existing Zod project detail/content/identity schemas and inferred
payload types to lib/projects/schemas.ts. FormData parsing, field error
mapping and action response types remain in lib/projects/input.ts. Updated
action, form and test imports without changing validation or visibility.

- npm run lint: passed, no warnings.
- npm run typecheck: passed.
- npm test: 53 passed, no failures or skips, including existing input and
  rich-content validation coverage.
- npm run build: passed with process-local public local Supabase configuration.
- git diff --check: passed.

Visibility was inspected in the creation/publication actions, schema default,
public/administrator queries, project page and RLS policies. New projects
default to unpublished; saving content preserves visibility and the separate
publication action changes it. This was a source inspection, not a new
database/HTTP integration run. No database operations or browser UI review
were required for this module-only refactor.

## Visibility switch and board-focused detail - 2026-11-15

- npm run lint: passed, no warnings.
- npm run typecheck: passed.
- npm test: 54 passed, no failures or skips. Added coverage for explicit
  true/false publication, missing/duplicate/file values, rejected coercions
  and combined content/publication errors.
- npm run build: passed with process-local public local Supabase configuration.
- git diff --check: passed.

A temporary local production server at 127.0.0.1:3016 ran the equivalent of
node --test --test-concurrency=1 tests/project-content-http.ts
tests/public-http.test.mjs with explicit local public Supabase configuration.
Result: 18 passed, 2 skipped, no failures. The skipped post-cleanup empty
states require an empty owner database; existing projects were preserved.
The suites verified authenticated publication on creation, redirect without
edit=1, content/visibility updates, stale-write rejection, unauthorized
writes, public/draft access, board data, image-route access/normalization
and the absence of former rich-content detail sections. Only identifiable
fixtures created by those tests were removed. User/admin and table counts
were checked before/after; no users, migrations or remote operations ran.
The temporary production server was stopped after the suites.

The ad hoc headless Edge/CDP check ran as
`node "$env:TEMP/project-garden-visibility-browser-check.cjs"` against the
local review server. At 1440x1000, 390x844 and 320x640 it checked modal/page
overflow, a labelled 44px switch, keyboard switching, reduced motion,
creation defaulting to private, public creation without modal reopening,
a compact board-focused detail, saved name/publication initial values in
editing, cancellation without a visibility write and hiding on save.
Desktop/mobile board screenshots were visually inspected. Its exact
created project was removed and before/after population counts matched.
The isolated browser context/profile was closed and removed.

Creation image staging remains a proposal awaiting owner confirmation;
it was not implemented or tested. No new dependency or schema/policy
change is included. Full screen-reader, physical-device and cross-browser
review remain unperformed; UI acceptance remains pending.

## Project information modal and visible title - 2026-11-15

- npm run lint: passed, no warnings.
- npm run typecheck: passed.
- npm test: 54 passed, no failures or skips.
- npm run build: passed with process-local public local Supabase configuration.
- git diff --check: passed.

Local production HTTP checks ran with node --test --test-concurrency=1
tests/project-content-http.ts tests/public-http.test.mjs against a temporary
127.0.0.1:3016 server. Final result: 18 passed, 2 skipped, no failures.
The first run exposed an obsolete public-board assertion requiring the
Read only badge; it was updated to assert the requested removal. The
skipped empty-after-cleanup checks require an empty database. Authorization,
draft HTML/RSC privacy, board data, image access and fixture population
preservation passed. Only this run's fixtures were removed; the temporary
production process was stopped. No users or migrations were created.

The ad hoc headless Edge check ran as
`node "$env:TEMP/project-garden-information-browser-check.cjs"`. At
1440x1000, 390x844 and 320x640 it verified a visible title, adjacent labelled
44px information icon, no Read only badge, rich description/objectives and
repository inside the modal, viewport fit, internal scrolling, heading
focus, Tab/Shift+Tab cycling, Escape/footer closure and opener restoration.
Visitors had no edit action; the existing administrator could view an
empty private information state and open editing. Anonymous access to
the same private project returned 404. Desktop/mobile modal screenshots
were inspected. Two exact temporary project fixtures were removed and
before/after project/asset/column/task/user/administrator counts matched.

The existing project-garden-cozy-modal-check.cjs browser regression also
passed after sharing ProjectDialog: keyboard opening, editor-focused
Escape, focus/scroll restoration, responsive footer, animation/reduced
motion, bold editing and dismissal blocked during an intercepted save.
The request was made invalid before forwarding, so it created no project.
No cross-browser, physical-device or full screen-reader review is claimed.

The status/is_hidden migration and access semantics are still proposals
in ADR 0001, not implementation or applied migration. Visual acceptance
remains pending. The local review server remains at 127.0.0.1:3015.

## Edit inside information and undecorated trigger - 2026-11-15

- npm run lint: passed, no warnings.
- npm run typecheck: passed.
- npm test: 54 passed, no failures or skips.
- npm run build: passed with process-local public local Supabase configuration.
- git diff --check: passed.

The ad hoc isolated headless Edge check ran with
`node "$env:TEMP/project-garden-information-edit-check.cjs"`. It passed
at 1440x1000, 390x844 and 320x640: the information trigger has zero border
and transparent background with a 44px target; visitors have no edit
control; the administrator sees Edit project only in the information
footer. Editing keeps the same native dialog, focuses its new heading,
loads the existing shared form with initial values and keeps keyboard
focus contained. Escape from the editor restores focus and body scroll.
Closing and reopening returns to information. Explicit edit=1 opens the
editor; saved=1 keeps it closed. The mobile footer screenshot was inspected.

The first temporary-script run matched the sidebar illustration instead
of the information icon; the selector was scoped to main. The subsequent
browser run detected that reopening could retain editor mode while the
native close event was pending. Resetting mode synchronously on dismissal
fixed the issue; the final complete browser run passed. Two exact temporary
project fixtures were cleaned and before/after project, asset, column,
task, user and administrator counts matched. No users or migrations were
created. Anonymous private-project access still returned 404.

This adjustment did not rerun the full HTTP integration suite. No full
screen-reader, physical-device or cross-browser review is claimed. The
working appearance remains pending owner acceptance, and status/hidden
semantics remain proposals. Local review stays at 127.0.0.1:3015.

## Larger information section headings - 2026-11-15

Description and Objectives headings changed from 20px to 24px. npm run
lint, npm run typecheck, npm test (54 passed), npm run build and git diff
--check passed. The build used process-local public local Supabase values.
The targeted headless Edge check, project-garden-information-headings-check.cjs,
verified both computed heading sizes at 1440x1000, 390x844 and 320x640,
modal fit/scrolling and keyboard/focus behavior. The desktop screenshot
was inspected. Exact temporary fixtures were cleaned and population counts
were preserved. Full HTTP integration was not rerun for this typography
change; owner visual acceptance remains pending.

## Creation images, private draft retries and browser multipart - 2026-11-15

- npm run lint: passed with no warnings.
- npm run typecheck: passed.
- npm test: 60 passed, no failures or skips.
- npm run build: passed with process-local public local Supabase configuration.
- git diff --check: passed.

Unit checks cover the shared 32 MiB file budget, invalid/oversized files,
preview URL revocation, preserving rich content while resolving local
references, sequential uploads, partial failure/retry, reusing successful
IDs, stable creation identity after a lost initial response and validation
before writes. A regression test uses a mixed-case WebKit multipart
boundary and verifies exact file bytes survive parsing.

The local production HTTP run used node --test --test-concurrency=1
against tests/project-content-http.ts and tests/public-http.test.mjs at
127.0.0.1:3016. Result: 18 passed, 2 skipped, no failures. The skipped
empty-state assertions require an empty database. New Server Action
assertions cover unauthorized draft saves, forbidden publication through
the draft action, draft 404, idempotent initial retry without a second row
or timestamp change, foreign assets, stale writes and refusal to turn a
published project into a draft. Existing project CRUD, HTML/RSC privacy,
image processing/access and population preservation checks also passed.

The ad hoc isolated headless Edge test ran via
project-garden-local-integration.cjs and project-garden-creation-images-check.cjs.
At 1440x1000, 390x844 and 320x640 it checked previews in both fields, modal
fit and Tab containment. Cancelling before Save created no database data
and revoked the preview URL. Real image requests were paused to assert
private project/image access during upload and pending Escape protection.
After both uploads the selected publication applied, saved images became
public and the detail stayed closed. Injecting a 503 on the second upload
kept a private draft with the first image saved, preserved name/slug and
showed the retry explanation. Retry used that same project and uploaded
only the remaining image. The mobile preview screenshot was inspected.

Early browser runs exposed invalidImage responses, also reproduced without
network interception. Blob.type was lowercasing the browser's case-sensitive
boundary. Preserving Content-Type on Response fixed the real browser
multipart regression. The final full browser run passed after the fix.
Temporary diagnostics were removed. Exact project/asset/object fixtures
were removed and population counts preserved. No users, schema changes,
remote operations or automatic cleanup were introduced. Temporary
production servers were stopped; the existing local review server remains.

Visual acceptance remains pending. Full screen-reader, physical-device
and cross-browser review were not performed. Lost upload responses may
leave private unreferenced assets; general cleanup remains a separate
pending decision. Browser decoding memory can exceed the 32 MiB file budget.


## Image persistence and file-picker cancellation regression - 2026-11-15

The reported image-saving problem prompted real browser creation, reload,
information-modal and edit checks. Inserted images persisted and decoded
correctly in both rich-text fields, including a further upload during edit.
A separate reproducible loss was found: reselecting an unchanged file emits
an actual trusted, bubbling input `cancel` event. ProjectDialog interpreted
it as dialog cancellation, closed the form and discarded staged content.
The regression assertion failed before the fix with "File chooser
cancellation must not dismiss the project form". The handler now ignores
cancellation events originating at descendants.

Added `npm run test:images`, backed by tracked TypeScript browser tests and
Zod-validated Chromium protocol helpers, without new dependencies. The test
asserts the native input event occurred, the modal and staged image survive,
and explicit Escape still closes the form and releases the blob URL. It also
checks both-field creation, private state while requests are paused, 1440px,
390px and 320px modal fit, Tab containment, reload/decoded image dimensions,
reopening the editor, text edits and an additional uploaded image, anonymous
published reads, private/public access after saving visibility, and partial
upload failure/retry with the same draft and previously uploaded asset.

Checks on the corrected production build using local Supabase:

- `npm run lint`: passed, no warnings.
- `npm run typecheck`: passed.
- `npm test`: 60 passed.
- `npm run build`: passed with local public Supabase configuration.
- `node --test tests/project-images-browser.ts`: 6 passed (parent plus five
  browser scenarios), in isolated headless Edge through the temporary local
  integration runner on port 3016 (Edge 157.0.4341.46).
- `npm run test:images`: the same 6 assertions also passed against the
  existing development/review server on port 3015 after the fix.
- Existing HTTP suites: 18 passed, 2 skipped because their empty-database
  preconditions do not hold on this populated instance.

All temporary fixture objects/rows were removed; existing population counts
were preserved. No users, schema changes, remote operations or dependencies
were introduced. These are automated browser/HTTP checks; manual visual,
physical-device and cross-browser acceptance remain pending. A selected file
still requires Insert image before Save; selection alone is not a persisted
rich-text node. This check establishes the confirmed cancellation regression,
not that every possible image failure has been reproduced.


## Direct upload execution and stronger regression assertions - 2026-11-15

A fresh tab in the shared review browser was used on port 3015 with the
existing administrator session. A generated 1200x630 PNG was selected through
the file input, given alternative text and inserted using the UI. Creation
rendered its local preview, then saved the private project and a ready WebP
asset. Opening information decoded it at 1200x630. During editing, clicking
Insert with empty alt produced invalidAlt and zero POST requests. Supplying
alt and clicking again produced POST /project-images HTTP 201 and a second
image node. Saving, navigating afresh and opening information decoded both
images. Database inspection confirmed two owned ready assets, each 1446
bytes at 1200x630, referenced by the saved description document. Only that
UUID-named temporary project's Storage objects/rows and generated file were
removed; the original project and administrator remained. The test tab closed.

This does not reproduce the owner's remaining insertion failure. The prior
file-picker cancellation fix addresses a separate confirmed regression.
No additional production behavior has been changed speculatively.

The tracked browser suite now dispatches actual pointer clicks after checking
hit testing instead of invoking DOM click(), and observes upload POST/status
events. Added checks cover invalid alt without a POST, a real 400 response
for corrupt PNG bytes without a new asset or document node, preserved file
and alt after rejection, and correction followed by exactly one successful
201 upload and visible/saved image. Creation asserts both upload responses
are 201. Partial retry asserts the sequence 201,503,201. Three new isolated
client-transport tests use mocked fetch; they do not claim Storage coverage.

Checks:

- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- `npm test`: 63 passed.
- `npm run test:images` on the development review server: 7 passed (parent
  and six browser scenarios).
- On the local production build on port 3016, the browser suite and both
  existing HTTP suites ran sequentially: 25 passed, 2 skipped (empty-database
  requirements). Command: `node --test --test-concurrency=1
  tests/project-content-http.ts tests/public-http.test.mjs
  tests/project-images-browser.ts` through the temporary local server runner.

Initial runs of the new test failed because its expected English message
contained a misencoded dash. The assertion now reads the source message
catalog; those failures were in the test expectation, not the application.
All final assertions above passed and fixture population checks passed.
The browser remains Edge/Chromium; other engines and the owner's exact
failing file/interaction have not been verified. Debug boundaries are
recorded in docs/development.md. No dependencies, schema/security changes,
users or remote operations were introduced.


## Image Enter-key submission and pending selection fix - 2026-11-20

Read-only inspection initially found the original test project with zero image
references and no project_assets rows. In the shared browser, a unique private
fixture was created using the existing public 224x224 WebP illustration as an
upload source. Selecting it, entering alternative text and pressing Enter
submitted the entire project, redirected and created no asset/image reference.
The enclosing form's implicit submit caused the omission. A new tracked
regression failed before the fix: "Enter inserts into the editor without
submitting the project" timed out while the other six browser scenarios passed.

The alternative-text input now handles Enter as image insertion; project submit
capture rejects pending file selections in either editor. Explicit feedback
and a local Discard selection button distinguish pending selection, creation's
local preview and editing's completed upload. Required-alt labels/help/errors
are translated in English, Spanish and Catalan. No server, schema, dependency
or Storage policy changes were required; visual feedback remains provisional.

After the fix, the shared browser's editing Enter path returned POST
/project-images 201, followed by a preview GET 200 and a decoded 224x224 image
in the editor. The completed upload message appeared. Saving the project
persisted its reference; read-only database/Storage inspection confirmed the
owned ready asset and decoded WebP bytes. The manual fixture and its exact
object/asset were removed, preserving the original project/user/administrator.
All agent-opened review tabs were closed. Some subsequent preview automation
clicks/snapshots timed out; manual post-navigation visual confirmation through
that tool was inconclusive. Independent headless browser tests verified decoded
images after saving/reloading and information-modal opening.

The expanded browser suite checks real Enter events in creation and editing,
blank alternative-text focus/aria-invalid, no implicit project mutation, blocked
Save while either field has a pending selection, focus on that selection,
explicit discard, staging/upload messages and saved image decoding. Existing
actual-upload/rejection/retry and anonymous/private-access checks remain.

Validation:

- npm run lint and npm run typecheck: passed.
- npm test: 63 passed.
- npm run test:images on development port 3015: 8 passed (parent plus seven
  browser scenarios); the pre-fix keyboard regression failed as described.
- Local production HTTP and browser suites, run sequentially on port 3016:
  26 passed, 2 empty-database checks skipped. Fixture population checks passed.
- npm run build: the first attempt compiled and typechecked but exited with
  SecurityFatalError for the installed Next.js 16.4.3 security advisory.
  Repeating the command completed with exit 0 and retained the upgrade warning.
  Dependency upgrades were not performed and need owner review/confirmation.

No existing data was deleted or repaired. Earlier selections that never reached
insertion/upload cannot be recovered from Storage and need selecting again.
The confirmed Enter/unsaved-selection omission is fixed; visual acceptance and
the separate Next.js security-version review remain pending.

## Image acceptance and project scope clarification - 2026-11-20

The owner reported that the corrected image flow works correctly. This records
acceptance of the reported insertion/upload behavior and supersedes its pending
owner check in the preceding entry; it does not imply acceptance of all UI or
completion of project management.

Documentation now records no project deletion, mandatory cancellation reasons,
Active / in development as the new/existing default, hidden cards that remain
listed while visitor detail access is blocked, and deferral of the common column
set to task CRUD without column CRUD. Four columns remains provisional because
the final count/labels were explicitly left open.

Read-only review found only is_published in the current project schema and no
project-deletion action. Current public full-row queries and publication-only
RLS do not yet enforce the newly requested hidden boundary. ADRs 0001/0002
contain the concrete schema/security proposals awaiting confirmation. No
application code, database permissions/data, migrations, dependencies, services
or browser state changed. Documentation checks: git diff --check passed. The
application suites were not rerun for this documentation-only update; the prior
entry contains the last actual application/browser results.

## Lifecycle, cancellation and listed hidden projects - 2026-11-20

The owner confirmed the concrete schema/security/reason plan and requested its
implementation. Local migrations 20261120000100 and 20261120000200 are applied;
the generated Supabase types were refreshed from that local schema. Existing
migrations remain unchanged. The first new migration initially failed to parse
because position needed quoting in the RPC RETURNS TABLE declaration; its
transaction rolled back, the unapplied file was corrected and application then
succeeded. No existing data was removed.

Implemented:

- Four lifecycle states with Active / in development as the new/existing default.
- Cancelled requires a nonblank plain-text reason up to 2,000 Unicode code points.
  The shared form retains it on reopening; information shows it only if cancelled.
- Published hidden cards stay listed without visitor navigation or description.
  A fixed public RPC projection prevents private content from entering listing
  HTML/RSC. Full project, descendant and asset RLS block hidden public access;
  existing controlled image delivery/Storage permissions follow that boundary.
- Owner access and previews remain separately authorized. Authenticated project
  DELETE is denied; no deletion UI, task CRUD or column CRUD was added.
- English, Spanish and Catalan controls/help/status labels are present. The common
  column set remains deferred to task CRUD; count and values are still undecided.

A real database regression rejected the first POSIX whitespace implementation:
a BOM-only reason was accepted by SQL while JavaScript trim rejected it. The
already-applied migration was preserved. A second migration adds an explicit
JavaScript whitespace set to the CHECK, and the failing regression now passes.

Actual checks:

- npm run lint: passed without warnings.
- npm run typecheck: passed.
- npm test: 67 passed, zero failed/skipped.
- npm run build: initial attempts compiled/typechecked but exited with the known
  Next.js 16.4.3 SecurityFatalError. Repeating the same command passed with the
  advisory warning retained. No dependencies, upgrade agents or guard changes
  were introduced; the Next.js security update remains a separate pending task.
- tests/project-management-db.sql through local docker/psql with ON_ERROR_STOP:
  passed after the regression fix. Tests use unique fixtures in a rolled-back
  transaction and the existing administrator, never create users, and verify
  status/defaults/reason limits/whitespace, projection, descendants, direct
  Storage access, owner management and project DELETE denial.
- tests/project-content-db.sql through local docker/psql: passed and rolled back.
- Final production HTTP/browser run on temporary loopback port 3016:
  node --test --test-concurrency=1 tests/project-content-http.ts
  tests/public-http.test.mjs tests/project-images-browser.ts: 28 passed,
  zero failed, two existing empty-database checks skipped. A local temporary
  runner supplied only the public local config and stopped its own server.
  Tests exercise actual Server Actions, every publication/hidden combination,
  API/HTML/RSC/image/Storage denial, owner previews, form cancellation/reopening,
  no hidden-card navigation and visibility restoration.
- Isolated Edge checks covered the shared modal at 320/390/1440px, keyboard focus
  containment and image behavior; the new hidden cards were checked at 390/1440px.
  These are automated DOM/interaction assertions, not owner visual acceptance.
- Exact fixture cleanup preserved the before/after population:
  [1,2,0,0,1,1] for projects/assets/columns/tasks/users/administrator registry.
  The original project and two assets remain, and the project is active.

The empty-database pgTAP suite was not run; its DELETE expectation was updated
for disposable-database use. No remote migration, deployment, new user or broad
file cleanup occurred. The new form/card presentation remains pending owner
review. The existing project-404 initial-HTML limitation remains outside this
increment.

Final review checks: git diff --check passed. Public-schema types were generated
with --schema public and formatted with the existing TypeScript printer, keeping
the generated diff focused; lint and typecheck passed again afterward. The local
development review server was restarted at http://127.0.0.1:3015/projects and
returned HTTP 200. Its initial launch also stopped for the existing Next.js
security advisory; repeating the same command started the server with the warning
retained. The generated AGENTS.md block was preserved.

## Strict CI and security pipeline — 2026-11-14

The owner approved GitHub Actions validation, low-severity vulnerability blocking, CodeQL, Gitleaks, Dependency Review, weekly Dependabot proposals and documentation, with deployment explicitly deferred. The SQL suite's two fixture users and temporary administrator authorization were approved only on a fresh disposable CI database. [ADR 0004](adr/0004-strict-ci-and-security.md) records this accepted policy; the [development guide](development.md#continuous-integration-and-security) describes operation and the still-pending GitHub activation.

### Implemented scope

- `.github/workflows/ci.yml` defines application checks, isolated Supabase database/RLS/HTTP checks and the final `CI gate`.
- `.github/workflows/security.yml` defines a complete lockfile audit, PR Dependency Review, all-fetched-history secret scanning, security-extended CodeQL for JavaScript/TypeScript and Actions, and the final `Security gate`. Security also runs daily at 04:23 UTC after activation on the default branch.
- `.github/dependabot.yml` proposes weekly npm/Actions updates without automatic merges. Actions use full commit pins; Supabase/Gitleaks release archives have hardcoded publisher-verified SHA-256 checksums.
- `scripts/ci/check-codeql.ts` blocks every emitted SARIF finding and missing/malformed/failed analyses. Seven new application-suite tests cover this policy, multiple runs/files, CLI exit status and non-disclosure of invalid report content.
- No application dependency, lockfile, migration, schema, RLS policy, project content, UI or environment file was changed. No commit, push, remote configuration or deployment was performed.

### Local automated evidence

Environment: Windows, Node.js 24.22.1 and npm 11.19.1. These are local assertions, not a GitHub-hosted run.

| Command/check | Actual result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | Passed; 395 packages installed. Existing ESLint 9.39.5 unsupported-version warning remains; no dependency upgrade was attempted. |
| `npm run lint` | Passed without warnings. |
| `npm run typecheck` | Route generation and strict TypeScript passed. |
| `node --test tests/ci-security.test.ts` | Seven focused tests passed. |
| `npm test` | All 41 tests passed, including the seven new CI gate tests. |
| `npm run build` | Production build passed without Supabase environment configuration, after the same script-disabled installation used by CI. |
| `actionlint -color` (1.7.12) | Both workflows passed. The temporary Windows binary was checksum-verified from the official release; no application dependency was added. ShellCheck was not installed, so this is not a ShellCheck result. |
| One-off YAML/Bash validation harness | Parsed both workflows and Dependabot with the already-installed transitive `js-yaml` parser; all 22 shell snippets passed Git Bash syntax checks. No YAML dependency was added. |
| One-off aggregate-gate harness | 101 assertions exercised application status combinations and security failure/cancellation/skip behavior across PR, push, merge-group, scheduled and manual events using Bash `-e -o pipefail`. No failed or unexpectedly skipped prerequisite was accepted. These harness assertions are separate from `npm test`. |
| One-off public-configuration export harness | Five synthetic status payloads exercised the actual workflow shell/Node export boundary. A valid loopback publishable key exported exactly two public variables; remote origins, missing/newline-bearing keys and malformed JSON failed without exporting configuration or logging the private fixture marker. No Supabase operation or remote connection was made. |
| `npm audit --package-lock-only --ignore-scripts --include=dev --audit-level=low` | **Failed as intended by policy:** seven moderately affected packages, from the single advisory detailed below. |
| `npm audit --package-lock-only --ignore-scripts --omit=dev --audit-level=low` | Passed: zero reported production-dependency vulnerabilities at check time. This does not replace the blocking full audit. |
| `gitleaks git --log-opts="--all" --redact=100 --no-banner --no-color --ignore-gitleaks-allow --exit-code=1 .` (8.30.1) | **Failed:** one pre-existing documentation-prose false positive in 60 scanned commits. Scan matches were fully redacted; no credentials were disclosed and no exception was applied. |
| `gitleaks dir --redact=100 --no-banner --no-color --ignore-gitleaks-allow PATH` | Separate scans of `.github`, `scripts/ci` and `tests/ci-security.test.ts` passed with zero findings. This does not waive the historical blocker. |
| `git diff --exit-code -- package.json package-lock.json supabase` | Passed: dependency manifests, lockfile and database files are unchanged. |
| `git diff --check` | Passed. |

### Initial blockers before the authorized follow-up

The following records the initial state. The later [follow-up](#ci-blocker-follow-up--2026-11-14) supersedes the historical secret-scanner blocker with the owner-approved exact exception; dependency remediation remains pending.

1. **Dependency advisory:** `GHSA-g3hv-75wg-m249` describes potential denial of service through glob-parts amplification in minimatch. The locked chain includes `eslint-config-next@16.4.3 → typescript-eslint@8.72.0 → @typescript-eslint/typescript-estree@8.72.0 → minimatch@10.2.6`. npm reports seven affected development-tooling packages, not seven distinct advisories. The full audit remains blocking. No `npm audit fix`, override, lockfile refresh or package upgrade was applied; a reviewed dependency remediation requires owner confirmation.
2. **Historical secret-scanner false positive:** Gitleaks rule `generic-api-key` matches ordinary validation prose, not a credential, at fingerprint `9ce4e58f4a3b72e5da4fc2f76ae79472f51d82e6:docs/validation.md:generic-api-key:137`. Finding metadata was inspected from a fully redacted report; the surrounding documentation identified ordinary prose rather than a credential. Scanning all history intentionally preserves this failure until the owner approves a precise, reviewed false-positive policy. No baseline, ignore file, broad path exclusion, history rewrite or inline waiver was added.

These findings mean the security pipeline is implemented but **not green or accepted as activated**. The recommended next step is owner review of dependency remediation and, separately, the exact historical false-positive exception, followed by an authorized push/PR and GitHub setup. Do not weaken the approved threshold to mask the blockers.

### Checks not performed and hosted activation pending

- Docker reported an existing `supabase_db_portfolio-kanban` instance and its associated local services. It was not started, stopped, reset or used for tests. Authorization was limited to disposable CI fixtures; no users, administrator registry or owner data were modified locally or remotely.
- Database lint, migrations, pgTAP/RLS and `npm run test:public` were therefore not executed in this task. Their hosted success remains unverified. The existing local configuration/fixtures were inspected, not treated as CI evidence.
- CodeQL extraction/query execution, SARIF upload and Dependency Review were not run against GitHub. The SARIF parser tests use explicit fixtures; they are not evidence of a vulnerability-free CodeQL analysis. Binary/action pins and the existence of the Actions security-extended suite were checked against official upstream sources.
- Required-check rulesets, code scanning advanced setup, dependency graph/alerts/security updates, secret scanning/push protection, fork/Dependabot behavior and daily scheduling still need owner-account activation and an actual first hosted run. No credentials were requested or remote settings changed.
- No browser, responsive, keyboard, screenshot or manual accessibility pass was performed: this change does not alter the application interface. Previous visual acceptance remains pending and unaffected.
- Vercel deployments, remote migrations, production credentials and deployment approvals remain outside this task. Successful local validation does not establish hosted enforcement, complete security coverage or product acceptance.

## CI blocker follow-up — 2026-11-14

The owner authorized continuing the reported blocker corrections. The exact historical Gitleaks exception was applied first; dependency inspection then revealed a new major-version compatibility choice. The proposal below records that earlier state; the later explicit approval and applied override are recorded in the subsequent section.

### Applied historical exception

The root `.gitleaksignore` contains exactly the previously identified commit/file/rule/line fingerprint, with no path glob, rule exclusion or baseline. The secret job explicitly uses that file, requires its presence, still refuses `.gitleaks.toml` overrides and keeps built-in rules, full fetched-history scanning, redaction, ignored inline allow comments and failure exit status. [ADR 0004](adr/0004-strict-ci-and-security.md#subsequent-owner-approved-false-positive-correction--2026-11-14) records the narrow owner-approved amendment to the original no-ignore-file restriction.

| Check | Actual result |
| --- | --- |
| `gitleaks git --log-opts="--all" --redact=100 --no-banner --no-color --verbose=false --ignore-gitleaks-allow --gitleaks-ignore-path .gitleaksignore --exit-code=1 .` | Passed: 70 fetched commits scanned, no unignored findings. The only exception is the approved historical prose fingerprint. |
| Temporary Gitleaks regression fixture | A newly generated synthetic generic-API-key pattern at `docs/validation.md:137` failed with exit 1 both with an empty ignore file and with the approved ignore file. The matching rule and line were asserted from redacted reports. This confirms that new findings at the same relative path/rule/line are not exempt. No fixture repository commits or real credentials were used; its specific temporary directory was removed. |
| `actionlint -color` (1.7.12) | Both workflows passed after the exception change. |
| `npm run lint` | Passed without warnings. |
| `npm run typecheck` | Route generation and strict TypeScript passed. |
| `npm test` | All 41 tests passed. |
| `npm run build` | Production build passed. |
| `npm audit --package-lock-only --ignore-scripts --include=dev --audit-level=low` | Still fails with seven affected development-tooling packages from the minimatch advisory; no severity waiver applied. |
| `git diff --exit-code -- package.json package-lock.json supabase` | Passed: application dependencies, lockfile and database files remain unchanged. |
| `git diff --check` | Passed. |

These are local checks. The temporary scanner fixture is separate from the 41 application tests; no database or GitHub-hosted integration suite was executed.

### Historical dependency remediation proposal, before explicit approval

Registry inspection with `npm view typescript-eslint dist-tags --json` reported stable `8.72.2` and canary `8.72.3-alpha.8`. `npm view @typescript-eslint/typescript-estree@latest version dependencies.minimatch engines --json` confirmed that stable 8.72.2 still requires `minimatch ^10.2.2`. Stable `8.72.3` was not available. The installed chain remains at 8.72.0 with minimatch 10.2.6.

`npm view minimatch@11.0.1 version engines --json` confirmed the advisory's patched release and compatibility with Node.js 24. `npm audit fix --package-lock-only --ignore-scripts --dry-run --json` reported no changes and retained seven affected packages with exit 1. The upstream parent range does not accept minimatch 11, so an ordinary supported-range update is insufficient.

The concrete proposal is an exact `minimatch@11.0.1` override only beneath `@typescript-eslint/typescript-estree`, changing `package.json` and its generated lockfile. This is a temporary cross-major compatibility override in development tooling, not an approved application-stack upgrade. It needs explicit confirmation of that choice, then a clean script-disabled install, lint, typecheck, all tests, production build and complete low-threshold audit. The alternative is to await a compatible stable upstream parser release while keeping the audit blocking. No prerelease, broad override, forced fix or dependency change was applied.

Hosted execution, branch protection/required checks and account-level security activation remain pending. No local/remote users, administrator authorization, application data or services were changed. No application repository commit, push, deployment or Vercel connection was performed. Previous UI acceptance is unaffected.

## Approved minimatch override — 2026-11-14

After reviewing the compatibility proposal, the owner explicitly approved applying the narrow override and documenting its reasons. `package.json` now pins `minimatch@11.0.1` only below `@typescript-eslint/typescript-estree`, and npm regenerated the lockfile with lifecycle scripts disabled. This addresses the advisory without lowering the full low-severity audit gate. The installed parser's declared major-10 range is intentionally overridden; it is not a normal supported-range patch update.

The reason, alternatives, cross-major compatibility risk and removal criteria are recorded in [ADR 0004](adr/0004-strict-ci-and-security.md#subsequent-owner-approved-dependency-override--2026-11-14) and the [development guide](development.md#approved-temporary-minimatch-override). Earlier failed audit results and the previously unchanged manifests describe the historical pre-override checks, not the final state.

| Check | Actual result |
| --- | --- |
| `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | Passed with npm 11.19.1 / Node.js 24.22.1. No direct dependency pins changed. |
| Lockfile scope inspection | Only the parser-scoped minimatch changed version, from 10.2.6 to 11.0.1. npm added its `@isaacs/nonrecursive-glob-match@1.1.0` dependency and six bundled optional-package metadata entries beneath the existing `@tailwindcss/oxide-wasm32-wasi` package. An isolated regeneration from the original lockfile, without `node_modules`, reproduced the same eight added/changed entries and no removals. No unrelated existing package version changed. |
| `npm ci --ignore-scripts --no-audit --no-fund` | Passed: clean script-disabled installation, 396 packages. npm still reports the previously documented ESLint 9.39.5 unsupported-version warning; it was not upgraded. |
| `npm ls minimatch --all` | Passed: `@typescript-eslint/typescript-estree@8.72.0` resolves `minimatch@11.0.1 overridden`; unrelated consumers retain 3.1.5. |
| `npm audit --package-lock-only --ignore-scripts --include=dev --audit-level=low` | Passed: found 0 vulnerabilities across the complete lockfile, including development dependencies. No advisory exclusion or severity waiver. |
| `npm run lint` | Passed without warnings, exercising the parser with the overridden dependency. |
| `npm run typecheck` | Route generation and strict TypeScript passed. |
| `npm test` | All 41 tests passed; no failures or skipped tests. |
| `npm run build` | Production build passed after the clean script-disabled installation. |
| `actionlint -color` (1.7.12) | Both workflows passed. ShellCheck was not available; this does not assert ShellCheck validation. |
| `git diff --check` / `git diff --exit-code -- supabase` | Passed: no whitespace errors or database-file changes. |

The historical Gitleaks scan and its synthetic regression fixture remain recorded in the preceding section; the override does not change the scanner, its configuration or that approved exception. No database/HTTP integration suite was rerun against the owner's existing instance. Actual GitHub-hosted execution, CodeQL/Dependency Review availability and required-check configuration remain unverified until an authorized push and hosted run. No commit, push, deployment, Vercel connection, user creation, administrator change or application-data operation was performed. Local validation exercises the installed toolchain but does not guarantee exhaustive cross-major compatibility or absence of unknown vulnerabilities.

## GitHub activation and PR publication — 2026-11-15

The owner explicitly requested commits, push, a PR and GitHub Actions activation. The approved CI/security changes were committed as `c057152` after updating the unpublished branch onto `main`. [PR #5](https://github.com/VictorMateu/public-kanban/pull/5) targets `main` from `ci/security-pipeline`. A concurrent animation PR then advanced `main` to `212ac32`, causing a documentation-only conflict that prevented PR workflows from starting. Merge commit `770cb88` preserves both validation histories and the upstream animation work without rewriting the published branch. No unrelated feature work was added.

### Local validation after integration

- `npm ci --ignore-scripts --no-audit --no-fund` passed with Node.js 24.22.1 / npm 11.19.1 (396 packages). The known ESLint 9.39.5 unsupported-version warning remains unchanged.
- After merging the newer `main`, `npm run lint`, `npm run typecheck`, `npm test` (48 passing, none skipped), `npm run build` and `npm audit --package-lock-only --ignore-scripts --include=dev --audit-level=low` all passed. The complete audit reported zero vulnerabilities.
- Local `actionlint -color` passed. ShellCheck is not installed locally; this does not establish a ShellCheck run.
- Before publication, Gitleaks passed the staged diff and all fetched history (77 commits at that point), with full redaction and only the approved historical fingerprint exception. `git diff origin/main...HEAD --check` passed after integration; no environment files, generated artifacts or unrelated application changes were added by this PR.
- Local database/HTTP suites were not run against the owner's instance. No browser/UI validation was repeated because this PR does not change the interface; existing visual acceptance is unaffected.

### Remote configuration read-back

| Setting/check | Observed result |
| --- | --- |
| Repository permissions | Public repository; current authenticated user has administrator access. |
| Actions permissions | Enabled, `allowed_actions: selected`, `sha_pinning_required: true`; GitHub-owned actions allowed, verified marketplace actions disabled, additional patterns empty. |
| Workflow token | Default `read`; workflow creation/approval of PRs disabled. |
| Dependabot | Vulnerability-alert endpoint enabled; automated security fixes enabled and not paused. The default branch still reports the existing minimatch advisory `GHSA-g3hv-75wg-m249`; it was not dismissed. |
| Secret scanning | Scanning and push protection already enabled; retained without broad exceptions. |
| Main ruleset | ID `27306411`, active, no bypass actors; API reports current administrator bypass as `never`. PRs/resolved threads and an up-to-date branch are required; force pushes/deletion blocked. |
| Required checks | `CI gate` and `Security gate`, each bound to GitHub Actions app ID 15368. |
| CodeQL merge protection | CodeQL required with both security and alert thresholds set to `all`. Default setup is `not-configured`; advanced analysis comes from the versioned workflow, not a duplicate default setup. |
| Initial hosted execution at `770cb88` | Both workflows started on the PR. Application checks, full Dependency audit, Dependency review and Secret scan succeeded; both CodeQL language jobs and Database/HTTP checks were still running when inspected. These partial results do not establish successful aggregate gates or the final PR head. |

Initial hosted runs: [CI](https://github.com/VictorMateu/public-kanban/actions/runs/43697957730) and [Security](https://github.com/VictorMateu/public-kanban/actions/runs/43697957724). Settings were read back from GitHub rather than inferred from YAML. Final hosted outcomes, including the current head's aggregate gates, remain pending. Daily security and weekly version updates need the configuration merged to `main`; fork/Dependabot workflow behavior is not yet validated. Automatic merging is disabled. No merge, deployment, Vercel connection, production-secret configuration, remote migration or owner-data operation was performed.

## First hosted failures and diagnostic follow-up — 2026-11-15

The completed runs for `cc0726f` failed, rather than establishing a green activation: [CI](https://github.com/VictorMateu/public-kanban/actions/runs/43698135235) and [Security](https://github.com/VictorMateu/public-kanban/actions/runs/43698135232). Both aggregate gates correctly propagated their prerequisite failures; their conditions and the main-branch ruleset were not relaxed.

- The disposable integration runner successfully started Supabase, applied/checked migrations, passed database lint and pgTAP/RLS, safely exported public configuration and built the application. Cleanup also succeeded. The HTTP suite reported 20 passing tests and two failures: one obsolete nested assertion and its enclosing test. The assertion still required a blank Overview after fixture cleanup despite the approved pending-metrics presentation. The corrected assertion requires a main landmark, eight pending metrics and no fixture names in either HTML or React payloads. It no longer depends on an empty owner's database. The existing empty-project-list test retains its prerequisite.
- JavaScript/TypeScript analysis and upload succeeded, but the local SARIF gate counted ten results and failed. The processed Code Scanning API reported zero results/alerts for that merge ref, so those APIs alone cannot identify or dismiss the local results. Actions-language analysis, dependency audit/review and secret scanning passed. The gate now logs only rule ID, file URI and start line for each result to enable investigation on the next hosted run; it still blocks every result. It does not log messages, snippets or code flows. A CLI regression test checks that source/message fixture markers remain absent from logs while finding metadata and failure status are retained.

Local checks for this follow-up passed: `node --test tests/ci-security.test.ts` (seven tests), `node --check tests/public-http.test.mjs`, `npm run lint`, `npm run typecheck`, `npm test` (48 passing), `npm run build` and the full development-inclusive low-threshold audit (zero vulnerabilities). No local database or HTTP fixture operations were performed. The corrected fixture assertion and ten CodeQL results still require the next hosted run; no finding exclusion, severity waiver, new dependency or production-code change was introduced.

## CodeQL findings identified; parser proposal pending approval — 2026-11-15

The diagnostic run for `c17510f` identified all ten local SARIF results in [JavaScript/TypeScript analysis](https://github.com/VictorMateu/public-kanban/actions/runs/43698683428/job/132764764670). They are confined to HTML-processing helpers in the HTTP tests, not application implementation files:

- `js/bad-tag-filter`: script-removal regular expressions at `tests/i18n-http.test.mjs:29`, `tests/i18n-http.test.mjs:224` and `tests/public-http.test.mjs:37` (three results).
- `js/incomplete-multi-character-sanitization`: those same script filters, tag removal at `tests/i18n-http.test.mjs:72`, comment removal at `tests/public-http.test.mjs:94`, and span/comment removal at `tests/public-http.test.mjs:114` (seven results).

These helpers inspect server output and do not sanitize content for the application. Nevertheless, ad hoc removal can mishandle malformed/nested markup and undermine assertions. The proposed root correction is a test-only HTML parser rather than scanner exclusions or progressively more complex filtering regexes. CodeQL's own bad-tag-filter guidance recommends a well-tested parser over custom HTML filtering. No alert was dismissed or gate relaxed. The failed Security gate correctly reflects the JavaScript/TypeScript gate; other security jobs passed. The same head's Database and HTTP checks and CI gate now pass, confirming the earlier Overview assertion correction in the disposable hosted environment.

The concrete proposal is to add exactly `parse5@8.1.1` as a development dependency (registry-reported MIT license, dependency `entities ^9.0.0`), regenerate the npm lockfile and replace the affected filtering with read-only parsed-tree inspection in both HTTP suites. A shared test helper and meaningful parser regression tests would cover script content, malformed/nested markup, comments, escaped text and visible link labels, while preserving independent checks of raw HTML and React payloads for private-data leakage. No parser would be used to sanitize production content or execute scripts. Risks include dependency maintenance and changes in test interpretation; keeping parser use restricted to tests and retaining raw-response assertions limits scope.

Alternatives are a custom HTML tokenizer or a narrowly reviewed scanner exception. The former adds avoidable parsing/maintenance risk; the latter leaves brittle assertions in place. Neither is recommended. Dependency adoption requires the owner's explicit confirmation under repository instructions, so no parser, lockfile change or implementation has been applied for this proposal. If approved, validation will include parser regressions, lint, typecheck, all application tests, build, full low-threshold dependency audit and fresh hosted HTTP/CodeQL checks. Earlier local checks remain historical evidence, not validation of this unapplied proposal.

## Owner-approved test-only HTML parser — 2026-11-15

The owner subsequently approved adding the dependency proposed above. That explicit decision supersedes the historical pending-approval state. `parse5` is pinned to `8.1.1` in `devDependencies`; npm added only its `entities@9.0.0` transitive package to the generated lockfile. Existing dependency versions, the minimatch override, production code, workflows, security thresholds and Supabase files are unchanged.

Both HTTP suites now use `tests/helpers/html.ts` rather than regex removal of scripts, comments, tags or hidden spans. The helper parses before inspecting, preserves the original response, and never executes scripts. The inspection serialization omits script/style/template payloads and comments; decoded-text inspection ignores hidden decorative spans so labels cannot be satisfied by their arrows or SVG titles. Original HTML/React-payload leakage and escaped-owner-content assertions remain independent. This helper is test instrumentation, not a production HTML sanitizer or a full browser visibility model. [ADR 0004](adr/0004-strict-ci-and-security.md#owner-approved-test-only-html-parser--2026-11-15) records the accepted dependency choice, alternatives and consequences.

| Local command/check | Actual result |
| --- | --- |
| `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | Passed; existing pins preserved, exactly two development package entries added. |
| `npm ci --ignore-scripts --no-audit --no-fund` | Passed; 398 packages installed with lifecycle scripts disabled. The known ESLint unsupported-version warning remains. |
| `npm ls parse5 entities --all` | Passed: parse5 8.1.1 resolves entities 9.0.0. |
| `node --test tests/html.test.ts` | Seven parser regressions passed: script non-execution/exclusion, mixed-case and malformed script endings, comment handling, escaped owner content, nested hidden link/icon decoration, payload-only catalogs, and entity/quoted-attribute semantics. |
| `npm run lint` / `npm run typecheck` | Passed without lint warnings; route generation and strict TypeScript passed. |
| `npm test` | All 55 tests passed, none skipped. |
| `npm run build` | Production build passed. |
| `npm audit --package-lock-only --ignore-scripts --include=dev --audit-level=low` | Passed: zero reported vulnerabilities, including both new development packages. No finding exclusion or severity waiver. |
| `KANBAN_TEST_URL=http://127.0.0.1:3017 node --test tests/i18n-http.test.mjs` | Against a temporary loopback production server, eight HTTP cases passed and one invalid-sign-in-feedback case was explicitly skipped because local Supabase configuration is absent. Locale rendering, native language submission, shared layout, metadata and media/range assertions passed with the parsed inspection copy. The temporary server was stopped afterwards. |
| `node --check tests/public-http.test.mjs` / `actionlint -color` | Passed. ShellCheck was not available locally. |
| `git diff --check` / `git diff --exit-code -- supabase .github scripts/ci/check-codeql.ts` | Passed: no whitespace errors or changes to database files, workflows or the strict SARIF gate. |

No local database-backed fixtures or owner-data operations were performed. Fresh hosted database/HTTP, CodeQL and aggregate-gate results remain pending for the parser change; earlier passing runs do not establish its hosted outcome. No browser/visual pass, merge, deployment or Vercel connection was performed.

## Successful hosted parser verification — 2026-11-15

GitHub's completed results were inspected for PR #5 at exact head `b1750dbc24f1251946c9c8b6e90a772fc935d38b`. All ten check runs succeeded, including required `CI gate` and `Security gate`; the PR was open, mergeable and `CLEAN` when inspected. This is actual GitHub-hosted evidence for the parser correction, superseding the preceding pending-run state without erasing earlier failures.

| Hosted control | Verified result |
| --- | --- |
| [CI workflow](https://github.com/VictorMateu/public-kanban/actions/runs/43700237126) | Successful Application checks, Database and HTTP checks and CI gate. |
| Disposable Supabase | Migration/policy step passed; database lint reported no schema errors; pgTAP passed all 53 assertions; cleanup succeeded. No owner's instance was used. |
| Production HTTP integration | All 22 tests passed, zero failed and zero skipped. The Supabase-dependent sign-in-feedback case ran here, unlike its explicitly skipped local run. |
| [Security workflow](https://github.com/VictorMateu/public-kanban/actions/runs/43700237119) | Successful dependency audit, Dependency Review, Secret scan, both CodeQL languages and Security gate. |
| CodeQL local SARIF gates | JavaScript/TypeScript and Actions each logged `CodeQL gate: 0 finding(s).` The earlier ten test-filter results are resolved without exclusions, severity changes or an existing-alert baseline. |
| Additional code-scanning check | GitHub's CodeQL check also succeeded; this alone was not substituted for the strict SARIF gate. |

This evidence is pinned to the tested code commit; later commits, including this documentation-only record, still require their own required checks. No application/dependency/workflow change accompanies this evidence update, so the already-recorded local checks were not repeated solely for prose. Daily security and weekly version updates remain conditional on merging to the default branch. Fork/Dependabot PR behavior, future advisory changes and browser/visual acceptance remain outside these assertions. No merge, automatic merge, deployment or Vercel connection was performed.

## Shortened drinking hold and lighter media — 2026-11-14

The owner reported a frozen-looking sip and then requested a smoother, cozy animation without excessive browser work. Before adjustment, a 90-second Chrome observation captured three complete drinks without a permanent playback stall. Decoded stills and the original PNG inputs identified 21 identical sip poses, not a stopped media clock. The adjustment is confined to the drinking asset, its source/duration declaration, HTTP media coverage and documentation. The native player, typing clip, poster, styling, pause/visibility behavior and drink scheduling are unchanged.

The new `drinking-v5.webm` was regenerated from the original color/alpha PNGs rather than transcoding the compressed v4 file. Eighteen identical sip poses were omitted while three were retained; gesture movement was not accelerated. Offline motion interpolation targets 30fps and the final output is trimmed to 122 frames, avoiding the previous long cloned tail. The same resting source drawing is retained at both endpoints. The original drawings and PNG inputs were read without modification; the v4 clip and conversion recipe remain in ignored local build directories, not public runtime paths.

The existing documented portable FFmpeg 9.0.2 was temporarily downloaded again from Gyan and verified against its published archive SHA-256: `60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba`. No application dependency or lockfile was changed.

| Drinking asset | Duration | Frame rate | Decoded frames | Bytes |
| --- | --- | --- | --- | --- |
| Previous v4 | 5.459s | 48fps | 262 | 264,560 |
| Selected v5 | 4.066s | 30fps | 122 | 173,879 |

Full libvpx decoding succeeded. The selected clip is 224×224, has no audio and retains alpha spanning 0–255. In an ad hoc adjacent-frame check on premultiplied RGB, using a mean channel difference below 0.025 on the 0–255 scale as the near-static threshold, the longest run was approximately 0.067s in v5 versus 0.521s in v4. This threshold describes encoded image differences, not perceptual naturalness. The decoded first frame exactly matches typing's first frame in that comparison; the final frame differs by approximately 0.0023 mean channel levels. Decoded contact sheets and the desktop sidebar screenshot were inspected. Active videos plus poster total 236,031 bytes. Smaller media and fewer frames are not a measured CPU/battery benchmark, and both clips retain existing preload behavior.

| Check | Result |
| --- | --- |
| `npm ci` | Existing lockfile installed; reported seven moderate audit findings and the already documented ESLint deprecation; no dependency fixes or upgrades attempted |
| `npm run lint` | Passed, including a rerun after adding the HTTP media assertion |
| `npm run typecheck` | Passed |
| `npm test` | All 34 application tests passed |
| `npm run build` | Passed without Supabase environment configuration |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test tests/i18n-http.test.mjs` | Four passed and four failed: the three locale route cases reached their sign-in form assertions, and invalid-sign-in coverage also failed because this worktree has no Supabase configuration and intentionally renders the unavailable-sign-in state; not a successful authentication/integration validation |
| `KANBAN_TEST_URL=http://127.0.0.1:3004 node --test --test-name-pattern='sidebar videos' tests/i18n-http.test.mjs` | Passed; both active videos return WebM/EBML data and exact 32-byte range requests return 206 with the correct content range |
| Chrome, production build, 1440×900 | A 75-second instrumented window contained two complete v5 drinks and a partial third; each complete drink delivered all 122 frame callbacks, with maximum within-clip callback gaps of 47ms and 37ms; both returned to typing and no drinking `waiting`, `stalled` or media-error events occurred in the window |
| Keyboard and manual pause | Five Tab presses reached the translated control, with a 44×44px target and solid 2px focus outline; Enter paused both videos and their clocks stayed fixed over 700ms; Enter resumed |
| Compact viewport | At an emulated 390×844 viewport, the illustration is hidden, both videos are paused and there is no horizontal overflow |
| Reduced motion | Reloading with the preference enabled held both clips paused at zero; explicit play resumed playback |
| Media failure | A deliberately unavailable video URL replaced the video elements with the loaded, visible, decorative 224px fallback poster and changed the control to Resume |

Hidden-tab behavior was not rerun in this adjustment. Other browsers, mobile hardware, sustained CPU use, energy consumption and network throttling were not benchmarked. No database suites, users, records, remote services, migrations, commits or deployments were introduced. The complete interface HTTP suite remains limited by missing local Supabase configuration. Implementation and local checks do not constitute visual acceptance; the owner still needs to review the shortened sip and 30fps motion.

### PR integration validation

The owner subsequently requested commits and a pull request. The animation change was rebased onto `main` at `72a7ccd`, preserving its newer navigation, account controls, language form and viewport-based illustration mounting. Conflicting HTTP assertions were resolved in favor of the existing main-branch contract: initial server HTML must not contain decorative media. The new WebM/range-request case was retained. The development and product documentation preserve the newer sidebar and authentication decisions alongside this media adjustment.

After integration, `npm run lint`, `npm run typecheck`, `npm test` (41 passing tests), `npm run build` and `git diff origin/main...HEAD --check` passed. Against a fresh local production server, `KANBAN_TEST_URL=http://127.0.0.1:3005 node --test tests/i18n-http.test.mjs` passed eight cases and skipped one sign-in-feedback case because Supabase is not configured. Main's existing unavailable-sign-in handling and test prerequisite checks account for the difference from the earlier pre-integration HTTP failures; no authentication changes were added by this branch. The browser checks above were performed before this rebase and were not repeated during the commit/PR handoff. Visual acceptance and real CPU/battery measurements remain outstanding.


## Project branch integration with main - 2026-11-20

The owner requested commits and updating the feature branch with main. Project
lifecycle/security, WIP interface and decision documentation were committed
separately. The feature branch integrates origin/main at
fbded6468d9726b770c8499136751d76bb631f8f using a merge, preserving its session
controls, Overview navigation, responsive shell, HTML parser and CI policy.
Project controls, editor dependencies, management tests and migration history
are retained. No push, hosted CI run, remote migration or deployment was made.

Conflicts in auth navigation preserve main: successful login/logout and the
authorized /admin entry return to Overview. Public-board tests retain the
approved HTML parser and the removed Read only tag. The merged lockfile retains
the approved editor/image packages alongside main dependency updates and the
parser-scoped minimatch override. No new direct library was selected. The
Node type update exposed an untyped compileFunction invocation in main
auth-action tests; its known harness arguments now have an explicit signature,
without suppressions or any.

The rich-project HTTP suite now explicitly skips when the local database has
no registered administrator, as in disposable CI. This preserves the ban on
automatic user creation. Its full owner/upload paths ran locally with the
existing administrator; the absent-administrator skip branch was reviewed but
was not exercised by modifying the populated instance.

Actual integrated-branch checks:

- npm install --package-lock-only --ignore-scripts and
  npm ci --ignore-scripts --no-audit --no-fund: passed.
- npm run lint and npm run typecheck: passed. The first lint run exposed the
  compileFunction typing issue above; the corrected run passed.
- npm test: 88 passed, zero failed or skipped.
- npm run build: passed on the first run with Next.js 16.4.6, without the
  earlier 16.4.3 SecurityFatalError or advisory warning.
- npm audit --audit-level=low: zero reported vulnerabilities.
- npx supabase@2.122.0 db lint --local --fail-on warning: passed.
- tests/project-management-db.sql and tests/project-content-db.sql through
  Docker psql with ON_ERROR_STOP: passed in rolled-back transactions.
- Production HTTP/browser checks using the local temporary runner on port 3016:
  tests/project-content-http.ts, tests/public-http.test.mjs,
  tests/i18n-http.test.mjs and tests/project-images-browser.ts: 38 passed, zero
  failed, one empty-project-list assertion skipped because existing data remains.
  This includes all three locales, auth routing, images, cancellation and hidden
  visitor access. These are automated assertions, not owner visual acceptance.
- Fixture cleanup retained population [1,2,0,0,1,1] for projects/assets/columns/
  tasks/users/administrator registry.

The empty-database pgTAP suite was not run on the populated owner instance.
Hosted checks and the remaining owner visual review are pending.


## Local acceptance and publication preparation - 2026-11-20

The owner accepted the local project-management increment and requested pushing
the branch and creating a PR to main, then requested an architecture/structure
summary in README before publication. README now describes the implemented
routes, rendering boundaries, Server Actions, Zod validation, domain queries,
Supabase authorization/RLS, image lifecycle, localization and directory roles.
This documents the current design without changing its architecture or adopting
a dependency. The acceptance scope is recorded in product.md.

The local sign-in issue was configuration: main had an ignored .env.local but
this worktree did not. The worktree now has only the two validated public values
for the same existing loopback Supabase instance. Next was restarted, the
unauthenticated login response contained its email/password form instead of the
unavailable state, and Projects returned HTTP 200 without a data-unavailable
state. No password was requested or automated successful password sign-in
claimed. The environment file remains ignored and is excluded from commits.

Documentation-only handoff checks: git diff --check and README local path/link
checks passed. Application, database and browser checks were not repeated for
these prose changes; the preceding integration entry records their actual
results. Hosted validation of the feature branch remains pending.


## PR 11 CodeQL browser-helper findings - 2026-11-21

Security run 44893871529 at feature head 1ce1854 completed its analyses but
blocked publication with two JavaScript/TypeScript findings:

- js/bad-code-sanitization in tests/project-images-browser.ts: JSON.stringify
  values were interpolated into JavaScript sent to the test browser.
- js/file-access-to-http in tests/support/image-browser.ts: data read from
  DevToolsActivePort contributed to an outbound WebSocket URL.

Both locations are test infrastructure. The run's dependency audit, dependency
review, secret scan and Actions CodeQL checks passed; the aggregate security
gate failed because the JavaScript/TypeScript findings were nonzero. No result
was dismissed, excluded or downgraded, and the blocking policy is unchanged.

The browser helper now communicates over inherited CDP pipes rather than a
TCP debugging listener, removing the file-to-network construction. Static
expressions retain Runtime.evaluate; parameterized functions use
Runtime.callFunctionOn with separately serialized arguments and released remote
object handles. All dynamic selectors/messages/statuses/URLs in the browser
suite use those arguments, preserving unknown/Zod result boundaries. A new
isolated-browser regression round-trips quotes, closing script tags, backslashes,
line/Unicode separators, false and null without executing the supplied text.
No library, application code, schema, permission or migration changed.

Actual checks:

- npm run lint and npm run typecheck: passed after explicit typed pipe handles
  fixed the initial TypeScript closure-narrowing errors.
- npm test: 88 passed, zero failed or skipped.
- npm run build: passed with Next.js 16.4.6.
- A direct browser smoke check returned 42 and a parameterized string over CDP
  pipes. The hostile-argument regression also passed independently with
  node --test --test-name-pattern='browser commands keep hostile text'
  tests/project-images-browser.ts.
- The first full HTTP/browser run had two timeout failures in image insertion
  and pending-selection assertions; its parent suite also failed. An isolated
  browser rerun passed all 10 checks. The pointer helper was then hardened to
  wait for enabled, stable, reachable targets across animation frames, without
  increasing assertion timeouts or adding blanket sleeps. Timeout diagnostics
  retain only image readiness, selection flags and interface-error text.
- The final production HTTP/browser run through the temporary local runner on
  port 3016 passed 39 checks with zero failures and one existing empty-list
  assertion skipped. Files: tests/project-content-http.ts,
  tests/public-http.test.mjs, tests/i18n-http.test.mjs and
  tests/project-images-browser.ts. Actual image upload/retry/persistence,
  lifecycle, visibility and locale assertions all passed. Exact fixture cleanup
  verified that the existing population and users were preserved.
- Docker Desktop was initially stopped after the environment restart. Starting
  it restored the existing local Supabase containers; local CLI startup output
  was captured without logging credentials. No reset or user creation occurred.
- git diff --check passed. No dependencies or scanner configuration changed.

CodeQL was not run locally; a fresh hosted analysis after pushing this correction
is required to confirm both findings are resolved. The empty-database SQL suite
was not run on the populated owner instance. Browser checks are automated
assertions, not a new owner visual review or cross-platform certification.

## Task management - 2026-11-21

- `npm run lint`, `npm run typecheck`, `npm test` (90 passing tests) and
  `npm run build` passed on Windows with Node.js 24.22.1 and npm 11.19.1.
- Supabase CLI 2.122.0 applied migration `20261121000100` locally.
  `supabase db lint --local --fail-on warning` passed. The existing project
  received the four columns and had no previous tasks or columns to convert.
- The rollback suite `tests/project-management-db.sql` passed through local
  PostgreSQL with `ON_ERROR_STOP=1`. It checked owner authorization, cross-project
  destination rejection, stale writes, retry-safe creation, completion,
  reopening, archiving and per-task visibility without creating users.
- `npm run test:public` against the local production server passed with 29
  tests and one expected skip for the empty-list case on a populated database.
- `node --test tests/task-browser.ts` passed in isolated Chromium at desktop
  and mobile widths. It checked modal focus, create/edit, pointer reordering
  and movement, keyboard ordering, touch movement, completion/reopening,
  hiding, archiving and anonymous HTML/RSC exclusion. The test verified
  fixture cleanup and preserved the existing population and authorization.
- The disposable-database pgTAP suite was updated for the new schema.
  It was not run on the populated owner instance because it creates fixed test
  identities and requires an empty instance. Owner visual acceptance remains
  pending.

### Task editor picker styling

The task status and priority menus use the shared palette where the browser
supports customizable selects. The due-date field adds a themed calendar with
keyboard navigation and keeps direct date entry. Visual acceptance is pending.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests) and `npm run build` passed.
- `node --test tests/task-browser.ts` passed against the local production
  build in isolated Chromium. It checks the styled status picker, keyboard
  selection, the calendar bounds at 390 px, keyboard month/day navigation,
  Escape dismissal and date persistence, alongside the existing task flows.
- The browser run exposed a drag cancellation on ordinary focus changes.
  Dragging now cancels for window blur and the pointer/touch checks pass.

### Task editor footer and visibility control

The edit dialog places Archive task in the footer opposite Close and Save.
Hide from visitors uses the project visibility switch styling. Visual
acceptance is pending.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests) and `npm run build` passed.
- `node --test tests/task-browser.ts` passed against the local production
  build in isolated Chromium. The test checked keyboard toggling and saved
  visibility, footer placement and fit at 390 px, and archive confirmation.

### Pastel board presentation

The shared board uses four tones derived from the existing palette,
cream cards and a completion marker. Owners can open the task editor from
any column with that stage selected. Owner visual acceptance is pending.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests) and `npm run build` passed.
- `node --test tests/task-browser.ts` passed against the local production
  build in isolated Chromium. It covered per-column creation controls,
  stage preselection, focus return, completion styling and the existing
  desktop and mobile task flows.
- `npm run test:public` passed the board rendering, localization and task
  visibility checks. Two project-list assertions failed. The local
  `list_project_summaries()` function returns a non-null description for a
  published hidden project, which the application rejects. Its definition
  differs from the versioned projection in this checkout.

### Column icons and compact board header

Column headings use four decorative status icons beside their localized
labels. The project header uses less vertical space and retains an
accessible board heading. Owner visual review is pending.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests), `npm run build`
  and `node --test tests/task-browser.ts` passed.
- Isolated Chromium checks found four distinct icons at 1600 px and 390 px
  and a labelled board heading. The board starts at 137 px and 211 px from
  the top, respectively. The narrow viewport scrolls within the board
  without widening the document.

### Warm gradient board and task detail

The owner selected the warm gradient proposal. The implementation uses
the existing palette, equal-height columns, independently scrolling task
lists and a fixed Add task footer in every owner column. Visual acceptance
of the implementation is pending.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests), and
  `npm run build` passed.
- `node --test tests/task-browser.ts` passed against local Supabase and the
  production server in isolated Chromium at 1600 px and 390 px. It verified
  distinct column gradients, same-column and cross-column dragging,
  keyboard reordering from inside the dialog, touch hold to drag, tap to
  open, swipe to scroll only the task list, an unmoved Add task footer,
  and a read-only visitor dialog with focus restored on Escape. The test
  cleaned up its fixture and verified that database row counts returned
  to their initial values.

### Board-contained vertical scrolling

The project board fills the workspace below the navigation and project
header. Lists scroll vertically within their columns. Short windows
below the workspace minimum can still scroll to reach the controls.
Owner visual review is pending.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests), and
  `npm run build` passed.
- `node --test tests/task-browser.ts` passed in isolated Chromium. The
  owner board with an overflowing list fit the viewport at 1920 × 1080,
  1280 × 540, 390 × 480 and 390 × 844. The touch swipe moved the task list
  and kept the document scroll offset and Add task footer unchanged.
  The visitor board also fit at 390 × 844.

The follow-up increased the bottom spacing to 1.25rem on phones and
1.5rem on wider layouts. The browser suite passed against both development
and production servers with a 20px minimum gap assertion. The owner
session created tasks and reordered them by mouse and touch. The visitor
session opened the task detail by keyboard and had no creation or drag
controls. The local development login page returned HTTP 200.

### Task confirmation and project status picker

Successful task changes update the board without inserting a banner.
The project status picker shares the task status and priority styles.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests), and
  `npm run build` passed.
- `node --test tests/task-browser.ts` passed against the development server
  in isolated Chromium. The board kept its top position after creating and
  dragging a task. The project status picker opened using the keyboard,
  Escape closed it and restored focus, and selecting Cancelled displayed
  the required cancellation reason.

### Task card spacing and inline creation

Task cards give the due date its own line below the badges. The owner
creation action is a row below the task cards inside each column list.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests), and
  `npm run build` passed.
- The task browser suite passed on the development server. It verified
  that the inline action is reachable after scrolling a long column on
  mobile, opens the editor for that column and restores focus on Escape.

### Compact task card metadata

Task cards place the short priority badge and calendar date in a wrapping
row. The task detail retains the full labels.

- `npm run lint`, `npm run typecheck`, `npm test` (90 tests), and
  `npm run build` passed.
- The task browser suite passed against the local production build on port
  3134. It verified that the date fits within the card on a narrow viewport,
  retains its semantic label and appears in the detail dialog. Escape
  returns focus to the card.

### Task description rich text and images

- The local migration `20261121000300_task_rich_text` was applied to the
  populated development instance. The migration CLI used a temporary copy
  containing the exact `20261121000200_public_hidden_project_excerpts`
  migration already present in the local database from another branch.
- `npm run lint`, `npm run typecheck`, `npm test` (91 tests) and
  `npm run build` passed.
- `tests/task-browser.ts` passed against the production build on port 3136.
  It uploaded a real PNG during task creation, saved formatted text,
  retained the image on editing, rejected a cross-task reference and
  checked anonymous route and Storage access before saving, after hiding,
  after showing and after archiving. The public detail still rendered
  legacy plain text. The fixture population was restored after the test.
- The project image browser cases passed for upload, editing, publication,
  retries and keyboard insertion. The full suite failed its hidden-project
  listing case. The local RPC from the other branch returns an excerpt for
  a hidden project, while this checkout's public summary validator requires
  that field to be null for hidden projects.

### Archive and cancellation reason access

- `npm run lint`, `npm run typecheck`, `npm test` (91 tests) and
  `npm run build` passed.
- The task and project image browser suites passed all 11 cases against
  port 3138. The task test checked the empty archive, reverse date order,
  read-only detail, keyboard opening and focus restoration, and the absence
  of archive data from public HTML and RSC. It also checked both cancellation
  triggers, the catalog URL, and access to reasons for visible, hidden and
  unpublished projects.
- `npm run test:public` passed 24 cases and skipped the empty-database case.
  Three assertions failed: two board checks expect the earlier priority
  label markup, and the direct project-summary RPC check expects null
  descriptions for hidden projects. The local migration from another branch
  returns excerpts through that RPC. The application discards those excerpts
  before validating the catalog response, and browser checks verified that
  hidden descriptions and reasons stay out of public HTML and RSC.

## Responsive project catalog and covers - 2026-11-21

`npm run lint`, `npm run typecheck`, `npm test` (88 passed),
`npm run build` and `git diff --check` passed. The production HTTP checks in
`tests/project-content-http.ts`, `tests/public-http.test.mjs` and
`tests/i18n-http.test.mjs` passed for public and owner listings. The cover checks
assert that visitor HTML and React payloads omit the image ID and alternative
text for drafts and hidden projects while the owner can use the private preview.
The empty public list check was skipped against the populated local database.
The localized unavailable state was checked with a separate unconfigured dev
server. The empty administrator list and application error were not forced.

Focused Chrome checks passed in English, Spanish and Catalan at 320, 390 and
1440px. They covered grid tracks, long-name reflow, a decoded public cover,
visible focus and Enter navigation, and the fallback after blocking the image
request. Spanish screenshots at 390 and 1440px were inspected locally. Combined
HTTP/browser runs encountered click-target failures and timeouts before the
shared creation fixture completed. The isolated Chrome run of
`tests/project-images-browser.ts` passed all 10 checks against a fresh
production server, including the new cover assertions. The baseline image
suite also passed all 10 checks in isolation.

The integration suites cleaned up their own fixtures and preserved the existing
project and user counts. Cover crop, fallback artwork and spacing remain pending
owner visual review.


## Public excerpts on hidden project cards - 2026-11-21

Lint, type checking, all 88 unit tests and the production build passed.
The isolated Chrome suite passed all 10 checks, including a static hidden card
with an excerpt and no cover image at 320, 390 and 1440px. An earlier Edge run
failed in the image editor before it reached the new card assertion.

Migration `20261121000200` was applied to local Supabase. The populated local
instance also already had the task-management migration from another branch.
The lifecycle SQL suite and all eight rich-content HTTP checks passed with
run-only fixture adaptations using the generated columns. The nine i18n HTTP
checks passed. The legacy public-board fixture suite was not run against the
new column schema. The privacy assertions covered the 240-character excerpt in
RPC, HTML and RSC, draft omission, and continued denial of hidden details,
columns, tasks and images. No remote database migration was applied.

## Task archive and project catalog integration - 2026-11-21

- Lint, TypeScript, all 91 unit tests and the production build passed.
- The production HTTP suite passed 29 checks. The empty catalog check was
  skipped because the local database contains existing projects. Board checks
  verify the localized priority label and value and the task description in
  the detail payload.
- The Chromium suites passed all 11 checks. The catalog cancellation test
  verifies keyboard access for visible projects. It confirms that a published
  hidden project exposes only its allowed description excerpt and omits the
  cancellation reason in HTML and RSC responses.
- The project and task database suite passed using a rolled-back transaction
  against the local Supabase instance.

### Cancellation badge in the project catalog

- `npm run lint`, `npm run typecheck`, `npm test` (91 tests) and
  `npm run build` passed. `npm run test:public` passed 29 checks and
  skipped the empty catalog check against the populated local database.
- The task browser test verified keyboard and touch activation from the
  cancellation badge, focus restoration, and separate board navigation at
  mobile width. The image browser suite passed on retry after an editor
  readiness timeout in the first run. It also checked catalog widths of
  320, 390 and 1440 CSS pixels.

### Starter tasks on project creation

- Migration `20261121000400` applied locally with the existing project and
  task counts unchanged. `supabase db lint --local --fail-on warning` and
  the populated-database-safe `tests/project-management-db.sql` suite passed.
  The latter checks task order, descriptions and visibility for every
  project visibility combination and rolls back its fixtures.
- `npm run lint`, `npm run typecheck`, `npm test` (91 tests) and
  `npm run build` passed. The production HTTP suite passed 29 checks, with
  the empty catalog check skipped against the populated instance. The
  project actions test verifies that draft retries, edits and publication
  preserve the same task rows and that anonymous HTML and RSC omit them.
- The image browser suite passed all 10 checks. The task browser check
  passed after adjusting its touch gesture to scroll the task into view
  below the starter rows. It also verified the original English description
  loads into the task editor.
- The disposable `supabase test db --local` suite was left to CI because it
  requires an empty instance and creates user fixtures. No remote migration
  was applied.

### Task detail metadata and board ordering

- Lint, TypeScript, all 91 unit tests and the production build passed.
- Chromium verified that the task detail groups status and visibility above
  the description. The board supports drag and drop and Alt + Down from
  the focused card, with focus restored after the order is saved.
- The HTTP suite passed 29 checks. The empty catalog check was skipped
  against the populated local database.

### Structured starter task descriptions

- Migration `20261121000500` applied to local Supabase. The existing task
  descriptions were identical before and after, and the project-management
  SQL suite passed with rolled-back fixtures.
- Lint, TypeScript, all 91 unit tests and the production build passed.
- The HTTP suite passed 29 checks and skipped the empty catalog check on
  the populated instance. The new checks validate each starter document
  against the editor schema, verify its three sections and lists, and
  compare the plain-text field to the rich-text document.
- The task browser check verified that the structured architecture description
  renders in the detail and opens with its headings intact in the editor.
