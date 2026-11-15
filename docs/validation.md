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
