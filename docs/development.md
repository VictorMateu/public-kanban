# Development and configuration

## Requirements and tools

- Node.js 24.x and npm 11.x. Use npm and retain the lockfile; do not mix package managers.
- Docker running for local Supabase. Run the CLI through `npx supabase@2.122.0`; no global installation is required.
- Environment recorded during validation on 2026-11-01: Windows, Node.js 24.22.1, npm 11.19.1, Docker Desktop 4.97.0, Docker Engine 29.9.2, WSL 2.7.14 and PostgreSQL 17.

| Tool | Pinned version |
| --- | --- |
| Next.js / eslint-config-next | 16.4.3 |
| React / React DOM | 19.3.1 |
| TypeScript | 5.9.3 |
| Tailwind CSS / @tailwindcss/postcss | 4.3.3 |
| PostCSS | 8.5.31 |
| ESLint | 9.39.5 |
| parse5 (test-only development dependency) | 8.1.1 |
| @supabase/supabase-js | 2.118.0 |
| @supabase/ssr | 0.12.7 |
| server-only | 0.0.1 |
| next-intl | 4.14.9 |
| Zod | 4.6.7 |

Type packages and transitive dependencies are also pinned in `package.json` and `package-lock.json`. Install with `npm ci`; use `npm install` only for intentional, confirmed dependency changes.

Recorded compatibility limitation: npm marks ESLint 9.39.5 as unsupported. It was retained because the installed React, import and accessibility plugins declare compatibility through ESLint 9. Review those packages together before moving to ESLint 10. The installed TypeScript parser supports versions below 6.1; TypeScript remains on 5.9.

## Application commands

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`dev` serves the application at `http://localhost:3000`. `typecheck` runs `next typegen` followed by `tsc --noEmit`; it works before the first build. Lint runs separately from the build. `start` requires an existing build. Application tests use the Node.js 24 test runner without an additional framework.

The owner approved `parse5@8.1.1` solely for HTTP-test inspection. `tests/helpers/html.ts` parses server markup, excludes script/style/template payloads and comments from the inspection copy, and reads decoded text while ignoring `aria-hidden="true"` decoration. Both HTTP suites retain the original response separately for private-data and React-payload assertions. The helper is not a sanitizer, a browser renderer or production code; it does not execute scripts or evaluate CSS visibility. Do not reuse it to make untrusted content safe for rendering. Parser regressions cover malformed script endings, comments, escaped owner content, nested hidden decorations, catalog-only payloads and entity semantics. The dependency and its transitive `entities` package are locked as development-only and included in the full blocking audit.

The application builds without Supabase configuration and does not query the database during compilation. After changing `NEXT_PUBLIC_*` variables, restart `dev` and rebuild before using `start`: those variables are incorporated into the browser bundle at build time.

## Continuous integration and security

The owner approved [ADR 0004](adr/0004-strict-ci-and-security.md). These workflows validate only: they do not deploy, connect a remote Supabase project or use Vercel credentials. Hosted activation and actual run evidence remain separate from the [local validation record](validation.md#strict-ci-and-security-pipeline--2026-11-14).

### Triggers and required checks

- `.github/workflows/ci.yml` runs on all pull requests, pushes to `main`, merge groups and manual dispatch, without path filters.
- `.github/workflows/security.yml` adds a daily 04:23 UTC security run. The scheduled workflow must first exist on the default branch. Scheduling is best effort, not an immediate notification guarantee.
- Superseded workflow/ref runs are cancelled; jobs have explicit timeouts.
- Require the stable `CI gate` and `Security gate` checks. They execute after upstream failures and reject failed, cancelled or unexpectedly skipped jobs. Dependency Review is intentionally skipped outside pull requests; the full audit still runs.

The application job verifies npm 11.19.1, installs with `npm ci --ignore-scripts --no-audit --no-fund`, then runs `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. Node.js 24.22.1 bundles that npm version. Engine mismatches fail the application jobs. Lifecycle scripts and automatic dependency caches are disabled; a future package requiring an installation script needs an explicit reviewed policy change, not global removal of the restriction.

### Disposable database and HTTP integration

The integration job requires a fresh GitHub-hosted Ubuntu 24.04 runner and refuses an existing `supabase_db_portfolio-kanban` container. Do not run it through a local runner or against an owner's instance.

It installs checksum-verified Supabase CLI 2.122.0, starts a new local instance with the versioned configuration/migrations, then runs:

```sh
supabase migration up --local
supabase db lint --local --fail-on warning
supabase test db --local
npm run build
npm run test:public
```

The SQL suite is authorized to insert its two fixed test users and temporary administrator registry only in this disposable CI database; its transaction is rolled back. This is not permission to create users or change authorization in existing local/remote instances. The HTTP suite creates identifiable project/column/task fixtures and cleans up only their specific UUIDs. Public registration remains disabled.

Only the validated loopback API URL and new-format publishable key are exported to the build. Raw Supabase start/status/stop output stays in ephemeral runner-local files because it includes privileged credentials; the public key is masked. No raw status, environment dump or credential-bearing logs are uploaded. Production HTTP tests use `127.0.0.1` and bounded readiness checks. The server is terminated on exit, Supabase stop is attempted after failure, and GitHub discards the runner/resources. No reset, linked migration or remote operation is used.

### Blocking security policy

| Control | Policy |
| --- | --- |
| npm audit | `npm audit --package-lock-only --ignore-scripts --include=dev --audit-level=low` includes development and transitive dependencies. Low-or-higher advisories and audit errors fail. No automatic fix or severity waiver. |
| Dependency Review | PRs fail on newly introduced low-or-higher vulnerabilities in runtime, development or unknown scopes. No license allowlist policy was approved, so license checks are disabled. No PR comments or PR-write permissions. |
| CodeQL | JavaScript/TypeScript and GitHub Actions use `security-extended`. No project build or dependency install runs in this privileged scanning job. Results are uploaded to code scanning, then the local SARIF gate blocks every returned alert, including notes, existing alerts and suppressed results still emitted. |
| SARIF gate | `scripts/ci/check-codeql.ts` rejects missing/malformed reports, empty run collections, non-CodeQL runs and reported analysis failures. Every result in every report counts. On findings it logs only rule IDs, file locations and line numbers, never messages, snippets or code-flow content. Tests cover parser failures, alert policy, CLI exit status and non-disclosure. The analyzer action must also succeed. |
| Gitleaks | Checksum-pinned CLI 8.30.1 scans all fetched Git history with built-in rules and full redaction. Inline `gitleaks:allow` comments are ignored. Findings and scanner errors fail. The job refuses root `.gitleaks.toml` overrides and requires the reviewed `.gitleaksignore` containing only the owner-approved historical fingerprint below. No baseline or broad rule/path exclusion is used. |

These tools detect known advisories/patterns, not every vulnerability or secret. CodeQL blocks findings emitted by the selected query suite, not vulnerabilities beyond its analysis. Confirmed false positives still need owner approval for a narrow exception. Do not lower thresholds, add broad exclusions, rewrite history or use `continue-on-error` to obtain a green check. Existing blockers remain recorded in validation until resolved.

### Approved historical false positive

The owner approved continuing with the exact historical exception identified during initial validation. `.gitleaksignore` contains only:

```text
9ce4e58f4a3b72e5da4fc2f76ae79472f51d82e6:docs/validation.md:generic-api-key:137
```

That immutable commit/file/rule/line fingerprint identifies ordinary documentation prose, not a credential. It does not exempt the file, the rule, other commits or new matches at that line. A temporary synthetic fixture at the same relative path and line still failed scanning both with and without this ignore file. The full fetched-history scan passes with the single exception. New exceptions still require owner review and explicit approval; do not replace it with a baseline, regex or directory exclusion. [ADR 0004](adr/0004-strict-ci-and-security.md#subsequent-owner-approved-false-positive-correction--2026-11-14) records this limited amendment.

### Approved temporary minimatch override

On 2026-11-14, the owner explicitly approved a temporary compatibility override to remediate `GHSA-g3hv-75wg-m249` in development tooling. Registry inspection found that stable `typescript-eslint@8.72.2` / `@typescript-eslint/typescript-estree@8.72.2` still depend on `minimatch ^10.2.2`, while the advisory's patched version is `11.0.1`. A compatible-range audit fix preview made no changes and retained seven affected packages from that one advisory.

The root `package.json` now overrides `minimatch` to exactly `11.0.1` only beneath `@typescript-eslint/typescript-estree`; npm generated the corresponding `package-lock.json`. Direct dependency pins and unrelated minimatch copies remain unchanged. The override crosses the parent's declared major-version range, so upstream compatibility is not guaranteed. Node.js 24 satisfies the patched package's engine requirement. This is a temporary development-tooling mitigation, not an application-stack upgrade or a vulnerability waiver.

The scoped override was chosen instead of waiting with a known advisory, adopting a parser prerelease, forcing a broad upgrade or weakening the low-severity gate. Validate it with a clean script-disabled install, lint, typecheck, all tests, production build and the full low-threshold audit; see the [recorded results](validation.md#approved-minimatch-override--2026-11-14). These checks exercise the installed tooling but do not prove compatibility for every parser option or platform.

When reviewing parser/ESLint dependency updates, check whether a stable upstream release natively accepts a non-vulnerable minimatch version. After owner approval of that update, remove this override, regenerate the lockfile and repeat the same checks. Do not leave the override in place to mask an upstream incompatibility or expand it globally. The exact pin also requires review when a new minimatch advisory or fixed release appears.

### Tool pins and maintenance

| Tool | Reviewed version | Commit or archive SHA-256 |
| --- | --- | --- |
| actions/checkout | 7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| actions/setup-node | 7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| github/codeql-action | 4.39.3 | `33d7b85da1a04171e211befe2c739303b9a4c066` |
| actions/dependency-review-action | 5.0.0 | `a1d282b36b6f3519aa1f3fc636f609c47dddb294` |
| Supabase Linux amd64 archive | 2.122.0 | `59ed066847b98d7461c60e9109d40cab6b9756177ce06ebb05b51338519f5136` |
| Gitleaks Linux x64 archive | 8.30.1 | `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` |

Every action is pinned by full commit SHA. Binary hashes were verified against the publishers' versioned checksum lists; update versions/hashes together. No third-party Gitleaks action or license token is required. This is not hermetic: GitHub-managed runner contents, Node distributions, Supabase container images and CodeQL bundles/queries remain upstream inputs. Security databases intentionally stay current.

Default token permission is `contents: read`. Only CodeQL has `security-events: write`. Checkout does not persist credentials. There are no production secrets, OIDC permissions, shared caches, untrusted event expressions embedded in shell commands or `pull_request_target` executions.

Dependabot checks npm and Actions weekly on Monday at 08:00 Europe/Madrid, opening at most five version-update PRs per ecosystem. It never merges/deploys. Review versions, lockfiles and workflow/script changes before merging. Binary pins and Node/npm versions need deliberate manual maintenance; this Dependabot configuration does not update them. Alerts/security-update PRs require separate GitHub settings.

### GitHub activation checklist

Versioned YAML alone does not enforce branch protection. The owner authorized publication and repository activation on 2026-11-15; the applied settings are recorded below. Retain this checklist for maintenance and outstanding hosted verification.

1. Enable GitHub Actions for the pinned actions; approve first-time contributor runs when required. Keep default token permissions read-only and do not permit workflows to create/approve PRs.
2. Enable the dependency graph, Dependabot alerts and security-update PRs. Keep automatic merging disabled. Enable secret scanning and push protection where available.
3. Use CodeQL **advanced setup** with `security.yml`, not an additional default setup. Verify successful uploads for both languages in Security. Missing product access or failed uploads must not bypass the gate.
4. Create an active `main` ruleset: require PRs, `CI gate` and `Security gate` from GitHub Actions, and an up-to-date branch; block force pushes/deletion and leave no routine administrator/bypass exemption. Select actual check names from the first run, not merely a scan-completed check.
5. Where available, additionally require CodeQL merge protection at all available security/alert thresholds. The repository SARIF gate remains mandatory regardless of that feature.
6. Review changes to workflows, scripts, dependencies and security configuration. This single-owner project does not introduce a mandatory second reviewer unable to approve the owner's own PR. Verify fork/Dependabot PR behavior without adding production credentials.

Feature availability depends on repository visibility/account entitlements. The repository was publicly readable during setup; verify actual owner-account settings. New advisories can fail a scheduled run after a previously green commit; this does not retroactively invalidate a merge or stop a running application. Monitor Actions/Security notifications and re-run checks before merging. Vercel automation and its deployment policy are deferred to a separately confirmed task.

### Activated repository settings — 2026-11-15

The public repository's owner authorized [PR #5](https://github.com/VictorMateu/public-kanban/pull/5) and GitHub configuration. API read-back confirmed:

- Actions is enabled and restricted to GitHub-owned actions; verified marketplace actions and additional patterns are not allowed. Full-SHA pinning is required at repository level as well as in the workflows.
- The default workflow token remains read-only; workflows cannot create or approve pull requests. Automatic merging remains disabled.
- Dependabot vulnerability alerts and security-update PRs are enabled. Secret scanning and push protection were already enabled and remain enabled. No existing alert was dismissed.
- The active [Strict CI and security ruleset](https://github.com/VictorMateu/public-kanban/rules/27306411) targets `main`, requires a PR and resolved review threads, blocks deletion/force pushes, and has no bypass actors (the current administrator cannot bypass it).
- The ruleset requires an up-to-date branch and both `CI gate` and `Security gate` from the GitHub Actions app (integration ID 15368). It also requires CodeQL with all security and alert thresholds. No second-reviewer requirement was introduced for this single-owner repository.
- CodeQL default setup is not configured; the PR's advanced workflow runs both language analyses. After correcting the HTTP-test filters, all ten checks passed for `b1750db`, including both aggregate gates, both zero-finding CodeQL analyses and the disposable database/HTTP job. See the [hosted evidence](validation.md#successful-hosted-parser-verification--2026-11-15). Always verify the latest PR head before merging; historical success does not validate later commits.

The dependency graph is available: PR Dependency Review succeeded and the default-branch minimatch advisory is visible in Dependabot. That alert remains open until the patched dependency reaches `main`; the PR's complete audit passes without dismissing it. Daily security and weekly version-update scheduling require merging the workflow/configuration to the default branch. Fork/Dependabot workflow behavior is not yet validated. No merge, deployment, Vercel connection or remote Supabase operation is included in activation. See [the evidence and limitations](validation.md#github-activation-and-pr-publication--2026-11-15).

## Shared UI colors

`app/globals.css` is the single source for the cozy palette. `:root` stores the eight `--palette-*` values; Tailwind's `@theme inline` maps them to roles that components can use without repeating color values. Keeping the palette in CSS avoids a JavaScript theme object, client provider or additional dependency.

| Role / Tailwind utilities | Palette color |
| --- | --- |
| `bg-background`, `text-foreground` | Cream background, espresso text |
| `bg-surface` | Cream surface |
| `bg-surface-secondary` | Peach secondary surface |
| `bg-accent`, `text-accent-foreground` | Honey accent, espresso text |
| `bg-positive`, `text-positive-foreground` | Sage positive treatment, espresso text |
| `bg-surface-warm` | Soft peach surface tint |
| `bg-surface-highlight` | Soft honey surface tint |
| `bg-surface-positive` | Soft sage surface tint |
| `border-border`, `outline-focus` | Espresso borders and keyboard-focus outlines |

For example, an accent action can use `bg-accent text-accent-foreground focus-visible:outline-focus`. Native CSS can reference `var(--palette-cream)` when necessary, as the global body background does. Tailwind opacity modifiers such as `border-border/20` are suitable for decorative separators; do not assume a faded border is sufficient to identify a control or keyboard focus.

Use semantic roles in new or reviewed UI instead of hex literals, arbitrary color values or named Tailwind hues. The stock Tailwind palette is retained while existing project and task components await review; their slate, indigo and priority colors are not yet migrated. The body and shared shell consume the new palette. Shell gradients and shadows derive from the same centralized palette variables; no separate color values are defined in the components.

Use espresso text on the supplied light backgrounds. In particular, do not use white text on honey: its calculated contrast is approximately 1.85:1, while espresso on honey is approximately 6.00:1. These color-pair calculations are not a complete accessibility audit. Do not communicate task state or priority through color alone, or infer workflow states from the reference tint names.

The current palette defines the supplied light appearance only. The base shell's geometry and shadows are provisional; dark mode, card and control treatments and illustrations require their own confirmed scope. Typography is selected below. See the [visual direction](product.md#shared-visual-direction) for the selected palette and boundaries.

### Base workspace shell

`components/layout/app-shell.tsx` is a Server Component mounted by `app/layout.tsx`. It supplies the brand/home link, sidebar and keyboard skip link. It uses the existing `getAdministrator` server check to render desktop account controls and mobile session status/logout only for the authorized owner; Auth failures omit those controls without blocking public browsing. At widths below 64rem, `WorkspaceSidebar` receives a static `SessionIndicator` in its top-bar status slot and the shared `SignOutForm` in its navigation panel, below the language selector. The indicator has a translated image label and no click, hover action or keyboard stop. The external account row is hidden completely on mobile. At 64rem and above, the mobile indicator/logout are hidden and the existing upper-right account disclosure remains available. The small-width brand sizing leaves room for the indicator and menu button without overlap. No account data is sent to a client component. `components/auth/account-menu.tsx` opens on hover for a mouse with hover support and on click, touch or keyboard activation. A click pins a hover-open panel. Escape closes it and restores trigger focus; outside pointer actions and focus leaving the control dismiss it. The panel overlays content, uses the shared cozy palette and disables animation/transitions for reduced motion. `components/auth/sign-out-form.tsx` reuses the existing server action, disables repeated submission while pending, announces failures and restores retry-button focus. A blur caused by disabling that submit button does not hide feedback. Sign-in and sign-out revalidate the root layout and redirect to `/`, refreshing the account disclosure. The existing `/admin` proxy matcher and public-route session-renewal coverage are unchanged. Its small `SidebarNavigation` Client Component uses `usePathname` only to mark the selected Overview/Projects destination; it does not read a session or query data. `.workspace-stage` in `app/globals.css` is a full-width grid with a minimum height of `100svh` and the palette-derived ambient background; no centered shell, width cap or cream content panel is rendered. The sidebar is provisionally 19rem wide from 64rem viewports upwards. Below that breakpoint, the grid becomes one column with a compact top bar and an absolutely positioned mobile disclosure that overlays the content without changing the header or content height. `WorkspaceSidebar` is a small Client Component that toggles the shared navigation/language panel, exposes `aria-expanded` and `aria-controls`, closes on link activation, outside pointer presses or focus leaving the sidebar, and returns focus to the toggle on Escape. A closed mobile panel is removed from layout and keyboard navigation with CSS; desktop always displays the panel. Opening the disclosure requires JavaScript. On desktop, its small top, bottom and left margins use `--workspace-inset` (0.5rem–1rem); the drawer height subtracts twice that inset from the viewport. The desktop sidebar is sticky with its own rounded border and shadow; the mobile top bar stays in normal document flow. Content is transparent and uses `minmax(0, 1fr)` and `min-width: 0` so retained boards can manage their own horizontal scrolling.

`app/page.tsx` renders the localized Overview introduction, a personal-website link and project/task metrics through `components/overview/overview-metrics.tsx`. Its main landmark retains skip-link focus. `lib/overview/queries.ts` is a server-only boundary returning `{ status: "pending" }`; its TODOs reserve exact public counts and creation/completion buckets for the separate data-model work. It imports no Supabase client and performs no data access. All values are explicit pending em dashes, with translated accessible text. `OverviewActivity` is a small Client Component for entity/period selection only; it changes the translated chart description and legend without fetching data. The chart has a decorative grid and a pending message, with no fabricated bars, dates or values. `overview.module.css` uses the main content as an inline-size container: metrics start in two columns, then expand to four and a chart/task split at 34rem of available content width. At that width, the personal link sits beside the introduction and task metrics form a vertical list. Below it, the link and sections stack, with task metrics in two columns before activity. The DOM also groups project/task metrics before activity; CSS grid areas put the activity card on the left in wider layouts. The mobile eyebrow is omitted because the shared top bar already identifies the app. Mobile gutters are 1rem and section gaps 1.25rem. Metric labels and values share a row from 20rem to below 34rem of content width, with a stacked fallback for narrower cells. Activity controls use full-width rows, then two equal groups from 22rem; their button flex basis, padding and nonwrapping labels preserve localized text and a minimum 44px height. The layout therefore accounts for the desktop sidebar as well as the viewport. The summary width is bounded at 88rem. From the 64rem desktop breakpoint, when the viewport is at least 50rem tall, its top padding is `clamp(1.5rem, 4svh, 3rem)`, adding breathing room above the introduction while leaving mobile and short-window spacing unchanged. Above a 100rem-wide and 56.25rem-tall viewport, `app/globals.css` scales the root font using the smaller of the available width/height factors, bounded between 100% and 200% of the browser font preference. This scales the existing rem-based sidebar, fonts, controls and cards together; shorter or narrower windows retain the base size. CSS media-query breakpoints continue to use the initial font size; the content container queries follow the scaled component size. Main spacing, panel padding, heading/value sizes and the plot minimum use bounded viewport-height values; the chart and task panel share the remaining available space through flex/grid, with the wide panel row capped at 28rem at the current root scale. The mobile panel stack does not flex-grow, and its plot minimum is 7.5rem. The page retains normal document flow and has no viewport clipping or page-level scroll lock. Short/narrow windows, enlarged text and future growing content may scroll. The shared navigation switches to its existing top-bar disclosure below 64rem so the 19rem drawer does not consume tablet content width; account variants and the illustration mount query use that same breakpoint. This is a provisional responsive treatment for owner review, not a promise that arbitrary data pages will fit one screen. No chart library or new dependency is used. The owner-selected `/projects` route mounts `ProjectList` using the existing session-free published-data queries and dynamic rendering. Its cards and loading/empty states now use the shared palette. `/admin/login` retains its sign-in behavior and now shares the palette-based supporting-page treatment and sidebar language selector. The old shared header and footer are not rendered by the shell.

The enlarged desktop sidebar uses a 40px logo, 30px heading-font brand title, 20px navigation labels, 24px icons and increased link padding/spacing. The brand links home, and the sidebar has two translated entries with `aria-current="page"` and visible keyboard-focus treatment. The Projects entry remains active on its detail routes. Mobile uses a 24px brand title and full navigation labels inside the expanded panel. The icon-only circular toggle retains translated accessible open/close labels and morphs its rounded strokes into a close icon. The floating panel uses the existing palette, rounded corners and soft shadow; a 280ms entrance combines opacity with a small translation, scale and rotation. Reduced-motion preferences suppress its animation and icon transitions. Short viewports scroll the panel internally. The panel is non-modal and does not trap focus. No extra menu item, task control or example-image feature is implemented. The shell is a working visual prototype awaiting owner review, not final design acceptance.

`public/brand/logo.svg` is copied unchanged from `victor-portfolio/public/brand/logo.svg`, the sibling personal website's green logo. Keep the original SVG artwork and brand color; it is an existing brand asset rather than a component-specific UI color. `AppShell` renders it at 40px alongside the application name with an empty `alt` because that adjacent text already identifies the brand, including its visible mobile text. The combined brand links to Overview.

### Sidebar illustration

`SidebarIllustration` is a small Client Component for motion preferences and the pause/play control; its placement and control styling live in `sidebar-illustration.module.css`, while `VideoIllustration` owns native video playback. `AppShell` remains a Server Component. The drawer has two vertical flex groups: brand/navigation at the top and the illustration followed by the native language form at the bottom, separated by automatic space. The form remains available inside the mobile disclosure and on short desktop layouts where the illustration is omitted. Desktop bottom padding is 1rem, and the control stays inside the artwork's bounds. Its overflow remains scrollable so short or zoomed layouts can still reach the navigation.

`assets/sidebar-illustration/` preserves the original eight-pose style reference (`sidebar-working-v1.webp`), the typing and drinking source sheets (`typing-v2.webp`, `drinking-v2.webp`) and the earlier reduced typing sheet (`typing-v3.webp`). The original reference was generated from the sibling portfolio portraits and edited to remove visible chocolate and add steam. These source images are not served as public runtime assets. Original personal photographs are not copied into this application.

The current `VideoIllustration` Client Component uses two native HTML video elements for typing and occasional drinking. Both are silent, inline WebM/VP9 clips with alpha transparency, interpolated offline from the preserved source drawings: typing at 48fps and drinking at 30fps. The old canvas player and its frame-clock tests were removed when the owner requested conversion to video. The underlying generated drawings remain available as references.

Separate clips let typing loop natively while the player schedules drinking at randomized intervals, then resumes typing. A single combined looping video would fix the drinking frequency; preserving randomized timing in one file would require segment playback and seeks between timestamps. The trade-off is two preloaded assets and explicit handoff logic. This choice supports independent timing and editing; it does not itself eliminate source-frame artifacts or guarantee seamless transitions.

Typing uses the video's native `loop` rather than seeking the visible clip from an `ended` handler. `requestVideoFrameCallback` detects completed cycles, with `timeupdate` as a fallback. The first drink is requested after a randomized 6–10 seconds of completed typing playback, rounded up to the next cycle; subsequent intervals are 15–30 seconds. `lib/animation/video-sequence.ts` uses the encoded duration if the browser reports an unknown duration. Handoffs hold the outgoing frame while the hidden target seeks to zero, and show the target only once its first frame is decoded and seeking has finished. Drinking completion returns to typing.

`public/illustrations/` contains only the active assets: `typing-v6.webm` (224×224, 3s, 48fps, 144 frames, 49,382 bytes), `drinking-v5.webm` (224×224, 4.066s, 30fps, 122 frames, 173,879 bytes) and `idle-v2.webp` (224×224, 12,770 bytes): 236,031 bytes total. Both videos are VP9 with alpha and no audio. The previous drinking clip is retained only as an ignored local comparison, not a public asset. File size and frame count alone do not establish browser CPU, battery or visual performance.

The typing revision removes the duplicated resting tail. Its 30-pose forward/return cycle is sampled at 10fps, repeated three times before motion interpolation, and trimmed to the middle three-second cycle. This provides real neighbouring poses across the wrap instead of cloning the final frame. The shared resting drawing anchors the head, torso, laptop and desk. The complete moving hand replaces the resting hand opaquely; feathering stays outside its silhouette. An explicit screen-edge/keyboard exclusion keeps those surfaces fixed, and a separate spatial mask admits steam movement. This is spatial compositing, without temporal crossfades. The drinking video retains the full reach, sip and return gesture. Source-pose inconsistencies and estimated-flow artifacts still require visual review.

A spatial alpha mask feathers the video's perimeter without a temporal crossfade or a rectangular backdrop. The portrait is capped at 15rem and remains at the bottom of the drawer. The pause/play control keeps its 44px target and focus outline with an unfilled appearance.

The drinking adjustment removes 18 identical middle poses from the original 83-pose, 16fps color/alpha input sequence, retaining three identical sip poses instead of 21. The reach/lift/return timing and shared resting endpoints are unchanged. Offline conversion merges the alpha planes, applies `select='not(between(n,32,49))',setpts=N/(16*TB)`, adds 0.1875s of cloned lookahead for interpolation, interpolates to 30fps with the motion-compensated settings below, and trims to 122 output frames. The interpolation lookahead is not retained as a long resting tail. Encoding retains the existing VP9/alpha settings. The ignored local recipe is `build/video-tools/adjust-drinking.mjs`; it takes the verified FFmpeg executable and original drinking-input directory as arguments, and checks that the removed poses are identical and the endpoints match before encoding. Original sheets and PNG inputs are preserved. No runtime interpolation, new dependency, playback timer or React frame updates were introduced; typing cadence, pause controls, reduced-motion behavior and visibility handling are unchanged.

The scene is decorative (`aria-hidden`); its control has translated labels and an instance-unique target ID. Videos use `muted`, `playsInline`, a shared poster and native playback events. Playback pauses when manually stopped, offscreen or in a hidden tab. Reduced-motion preferences suppress automatic motion, but the visible play button allows explicit opt-in; the previous reduced-motion rule hid that control. A rejected autoplay attempt also leaves the button available. Asset errors retain the transparent poster. The server initially renders no decorative media. `SidebarIllustration` subscribes to a media query and mounts the player only at 64rem width and 42rem height or above; shrinking below either threshold unmounts it. Initial mobile loads therefore have no poster or video elements to request. Desktop preloads both clips once mounted; resizing from desktop does not undo completed downloads. CSS uses the same thresholds as a visual safeguard. No runtime dependency or video service was added.

The generation brief for the original eight-pose reference was a cozy hand-painted adult cartoon of the owner in a sage sweatshirt at a wooden desk, with a cream laptop and honey mug, using the existing palette. Its four-by-two sequence is typing, alternate typing, reaching for the mug, raising it, sipping, continuing the sip, lowering it and returning to typing. Its final edit prompt was:

> Edit this existing transparent EIGHT-frame animation sprite sheet. Make ONE focused correction throughout ALL EIGHT frames: the honey-colored ceramic mug must be perfectly clean and plain, without chocolate, dark liquid, foam, dark lip, drips, stains, or anything visible inside it. Use the same warm honey exterior on the clean simple thin rim, viewed at a shallow angle so the contents are not visible. Indicate a hot drink ONLY with two delicate wisps of warm cream/light peach steam floating naturally upwards from the mug, slightly varying between frames but staying inside each frame. Steam should be subtle, soft, legible against a peach sidebar, and not obscure his face. IMPORTANT preserve the exact same canvas size and FOUR-column by TWO-row sprite layout, identical frame bounds and alignment, transparent background, all eight original poses in exactly the same order, the man's recognizable face, hair, beard, clothing, hands, laptop, chair and desk. Do not repaint or reposition the scene. Preserve the existing cozy hand-painted cartoon style and color palette. No captions, grid lines, gutters, logos, checkerboard or background. Genuine alpha transparency.

This remains a visual prototype. Generated intermediate drawings can vary in alignment and anatomy; a higher configured frame rate is not proof of natural motion or a guarantee of exact character fidelity. Resemblance, pacing and edge appearance need visual acceptance. Keep future image revisions versioned rather than overwriting the selected asset. This work does not adopt shadcn or change navigation, authentication or data access.

The conversion used a checksum-verified portable FFmpeg 9.0.2 build from the Windows provider linked by ffmpeg.org. Its downloaded archives and extracted binaries were removed after conversion. The 228 original color/alpha PNG inputs remain locally in `build/video-input/typing/` and `build/video-input/drinking/`; these directories are ignored by Git, while the compact source sheets above can be versioned. The shared anchor remains in `build/animation-review/` and encoding recipes in `build/video-tools/`. Only redundant repeated-cycle inputs and diagnostic stills were removed. Color PNGs were flattened against the existing peach palette to avoid hidden-RGB fringes, merged with their original grayscale alpha planes and converted to `yuva444p`. FFmpeg's `minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:me=umh:mb_size=8:search_param=32:vsbmc=1:scd=none` generated motion-compensated intermediate frames; the output was encoded with `libvpx-vp9`, `yuva420p`, CRF 28 and no audio. This is estimated motion, not new generative-video footage, and it can introduce warping around hands or faces. Visual acceptance remains necessary. The loop keeps its pause mechanism in line with [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

## Typography

`app/layout.tsx` is the only font-loading entry point. It imports `Dancing_Script` and `Handlee` from `next/font/google`, creates one instance of each at module scope and attaches their generated variable classes to `<html>`. Both select the Latin subset for preloading and use `display: "swap"`. Dancing Script is variable (400–700); Handlee loads only its available 400 weight. Next.js retrieves the font assets during development/build and serves them locally at runtime; no stylesheet import, browser-side Google Fonts link or font package is added.

| Variable / utility | Responsibility |
| --- | --- |
| `--font-dancing-script` | Generated `next/font` family for Dancing Script; do not redefine it |
| `--font-handlee` | Generated `next/font` family for Handlee; do not redefine it |
| `--font-heading` / `font-heading` | Semantic heading family mapped to Dancing Script with a cursive fallback |
| `--font-sans` / `font-sans` | Default UI/body family mapped to Handlee with a cursive fallback; retains Tailwind's primary-font convention |

`app/globals.css` defines the mappings in `@theme inline`. Typography defaults live in `@layer base`, so Tailwind utilities can override a role deliberately without specificity workarounds. The body uses Handlee at normal weight and line-height 1.6. Headings `h1`–`h6` use Dancing Script at weight 600 and line-height 1.3; `h1` uses weight 700. Font synthesis is disabled to avoid inventing bold or italic faces for Handlee.

| Role | Size convention | Weight |
| --- | --- | --- |
| Main title (`h1`) | `text-3xl` by default; existing responsive `text-4xl`–`text-6xl` variants remain available | Dancing Script 700 |
| Sidebar application title | `font-heading text-3xl font-semibold`; keep the brand label separate from page-heading semantics | Dancing Script 600 |
| Section and column heading (`h2`, `h3`) | `text-2xl` | Dancing Script 600 |
| Other heading (`h4`–`h6`) | `text-xl` by default | Dancing Script 600 |
| Task title | `font-sans text-lg font-normal`, regardless of its heading tag | Handlee 400 |
| Body, task description and controls | `text-base` | Handlee 400 |
| Secondary text, form labels, task metadata and column counts | `text-sm`; avoid `text-xs` for the handwritten interface | Handlee 400 |

For future components:

- Inherit Handlee for text, links, buttons, navigation and form controls. Native form controls inherit the font through Tailwind's existing preflight; no extra font import is needed.
- Use semantic headings for titles, sections and columns. Use `font-heading` only when a visual heading role cannot be represented by an appropriate heading element.
- Keep task titles in Handlee using `font-sans font-normal`; an `h4` must not turn task content into display script accidentally.
- Use the existing Tailwind size, weight and line-height tokens. Do not repeat font-family names in components or add inline family styles, new loaders, font packages, CSS `@import` or external font links.
- Reserve `font-semibold`/`font-bold` for Dancing Script headings. Handlee has no 500/600/700 or italic face. Existing non-heading weight utilities were normalized to `font-normal`; heading tracking was loosened to the font's natural spacing.
- Review long text, 200% zoom, mobile wrapping and English/Spanish/Catalan accents in a browser. Do not assume build or HTTP success establishes visual legibility.

The global typography defaults also apply to the retained project routes/components in the combined working tree. Their data access, interaction behavior, colors and layout geometry are unchanged by this integration; home remains intentionally empty.

## Interface internationalization

The displayed application name is sourced from `Common.appName` in `messages/en.json`. It is shared unchanged by all locales through the existing English fallback. Use that key for branding and metadata; localized messages interpolate it as `{appName}`. The legacy npm name, local Supabase project/container identifiers and `portfolio-kanban-locale` cookie are retained to preserve the existing local setup and saved preferences. Historical validation entries and ADRs retain the product name used at the time.

The owner selected `next-intl` with English (`en`) as the default, Spanish (`es`) and Catalan (`ca`). Paths such as `/projects/[slug]` and `/admin/login` stay unchanged; no `[locale]` route segment or localization proxy is used. The existing Supabase proxy route matcher remains unchanged.

- `messages/en.json` is the source catalog; `messages/es.json` and `messages/ca.json` hold translations.
- Catalogs use two levels: a namespace containing string messages. `i18n/messages.ts` merges missing translations from English, allowing progressive translation.
- `i18n/locales.ts` defines the supported locale allowlist and English default.
- `i18n/request.ts` reads the preference per request and configures messages and UTC.
- `i18n/types.d.ts` checks locale and message keys through TypeScript augmentation.
- `next.config.ts` registers the plugin; the root layout provides messages to client components and sets the HTML language.

Use `getTranslations` in async Server Components and `useTranslations` in synchronous or client components. Keep new UI text, metadata, accessible labels and user-facing errors in the catalogs. ICU messages handle task-count plurals. Authentication actions return stable error codes; the client translates them in the current locale.

The owner requested restoring the native language form beneath the sidebar illustration on 2026-11-14. `LanguageSwitcher` remains a Server Component. Following the owner's request for a cozier appearance, it uses one cream capsule containing three native submit buttons for EN/ES/CA. Each button sends its own `name="locale"` and value, with no separate Apply step. The active choice has a honey fill and `aria-pressed="true"`; each option has its full language name from the catalogs and a matching `lang` attribute. The buttons stack on the compact rail and retain a 44px minimum height and visible focus outlines. Submission works without JavaScript: the action validates the locale, writes `portfolio-kanban-locale` and revalidates the root layout. Its preference lasts one year and uses `Path=/`, `SameSite=Lax`, `HttpOnly` and `Secure` in production. Reading a page does not create that preference cookie. Invalid or missing values use English, without browser-language detection. Authentication cookies and authorization are independent of this preference. The HTTP suite checks cookie-based rendering, one shared selector, absence of account controls for anonymous visitors, native form submission and rejection of unsupported locales.

The existing interface has translations in all three languages. Project names, descriptions, columns and task content remain owner-authored data and are not automatically translated. Date-only values retain their calendar day through UTC while their display follows the chosen locale.

Cookie-based language selection means a URL alone does not select a language. Language-specific URLs and related SEO behavior would require a separate routing decision. The selector's visual treatment remains provisional. A [data-protection and cookie review](ideas.md#data-protection-and-cookie-compliance-review) is pending before publication; no legal conclusion has been established.

See [ADR 0003](adr/0003-interface-internationalization.md) for the decision and alternatives.

## Existing public implementation — acceptance pending

The following describes the preserved phase 3 navigation and visual design, which remain pending acceptance. Its interface text now uses the internationalization configuration above. Review [Product requirements](product.md) before changing the product experience.

`/` is the responsive Overview destination, with the approved presentation and explicit pending metrics/activity until data integration is defined. `/projects` renders the ordered published-project listing through `ProjectList`. `/projects/[slug]` shows a project's description, columns and tasks, including priority and a due date when present. Columns and tasks follow `position, id` ordering, and the board supports horizontal scrolling using the keyboard and touch input.

The routes use dynamically rendered Server Components. Queries use the anonymous client and do not persist responses in a shared cache. `React.cache` shares the project query between metadata and the page only within a request. Private and nonexistent projects return the same generic 404, including metadata.

Observed limitation: project 404 responses currently deliver the localized heading in the React/RSC payload while their initial HTML body is empty. HTTP tests check the actual React heading and absence of private data; they do not establish a working project 404 without JavaScript. Unknown-route 404 pages do render localized HTML. Browser hydration and a solution for the project-404 initial response remain pending review; no framework upgrade or routing workaround has been introduced.

Project and task loading uses `Suspense` in the retained listing and board. The board does not start streaming until publication has been checked, preserving the 404 response for unavailable projects. The owner selected a shared application layout without a public/private route group: `app/layout.tsx` now supplies the sidebar shell for all pages, including sign-in. The home and project routes live directly under `app/`, and `app/error.tsx` handles page errors within that layout. URLs remain unchanged. `app/admin/layout.tsx` retains only its metadata and search-indexing restrictions; `/admin` remains an authorization-checked compatibility route that redirects the owner to Overview; anonymous visitors still go to `/admin/login`.

The Overview metrics and activity are independent of Supabase availability and do not query projects or tasks. The shared shell retains its existing administrator check. Retained data views report unavailable configuration rather than treating it as an empty response. An actual empty response from Supabase produces the appropriate empty-project, empty-column or empty-task state in those views. Query errors show a generic message and allow another attempt.

### Local HTTP tests

After starting local Supabase, building and serving the application, run in another terminal:

```sh
npm run test:public
```

The command requires Docker and the `supabase_db_portfolio-kanban` container. It accepts only an HTTP server on `localhost` or `127.0.0.1`, defaulting to port 3000. Set `KANBAN_TEST_URL` to use a different local HTTP origin.

The command runs `tests/public-http.test.mjs`, `tests/i18n-http.test.mjs` and `tests/project-content-http.ts`. The project-content suite additionally requires the existing local administrator and explicitly skips when none is registered, including the disposable CI database. It never creates users; a populated local run is required to exercise owner actions and image upload. The tests create only temporary projects, columns and tasks in the local database and delete their own specific UUIDs during cleanup. They do not create users or change administrator authorization. They check ordering, drafts, 404 responses, empty states, text escaping, dates, priorities, unpublishing, all three locales, invalid-sign-in feedback and the shared language selector. Cookie-based locale rendering and native language-form submission are tested. They preserve the owner's existing local account. The phase 2 SQL suite instead requires an empty test instance.

## Environment variables

Copy `.env.example` to `.env.local` and configure only:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | The project's HTTPS origin; HTTP is accepted only for `localhost`, `127.0.0.1` or `[::1]` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | An `sb_publishable_...` key from the same project |

Do not add `sb_secret_...` keys, `service_role` keys, legacy JWT keys, passwords or tokens. This application requires the new publishable keys. There is no administrator environment variable: authorization is resolved in the database.

`.env.local`, other environment files and local Supabase state are ignored by Git; `.env.example` contains variable names without values. Do not publish complete `supabase status` output, which includes privileged local-tool credentials.

## Local Supabase

Configuration is already versioned in `supabase/config.toml`; do not run `supabase init --force`. From the repository root, with Docker running:

```sh
npx supabase@2.122.0 start
npx supabase@2.122.0 migration up --local
npx supabase@2.122.0 db lint --local
```

`start` applies migrations when initializing an instance. `migration up --local` applies pending migrations without deleting existing data. A database reset is not required. Keep applied migrations as history; introduce confirmed schema and policy changes through new versioned migrations.

After the owner confirms a schema or security change and its plan, non-destructive local migrations and tests with identifiable temporary data may run. Creating users, deleting existing data, resetting the database and destructive operations require specific authorization. Cleanup may delete only that test run's fixtures. See [AGENTS.md](../AGENTS.md).

Only in an empty local test instance, without real users or application data, run:

```sh
npx supabase@2.122.0 test db --local
```

The SQL suite's fixtures are rolled back, but its assumptions still require an empty test instance. Do not run it with `--linked` or against the owner's populated local database. Inspect the suite and obtain any required authorization for user fixtures before executing it.

Configuration keeps `auth.enable_signup = false` and anonymous sign-ins disabled. With CLI 2.122.0, `auth.email.enable_signup = true` keeps the Email provider available to existing accounts; the global setting still blocks public registration. Disabling the provider setting also causes `email_provider_disabled` during sign-in.

Local analytics is disabled. On Windows, Vector attempted to connect to Docker's TCP API on port 2375 and restarted repeatedly. Analytics is not needed for PostgreSQL, Auth or RLS; the TCP API was not enabled as a workaround.

Use `npx supabase@2.122.0 status` locally to find the URL, publishable key and Studio address, taking care not to disclose privileged output. Configure `.env.local` with the two public values only. Configured addresses are:

- API: `http://127.0.0.1:54321`.
- PostgreSQL: port `54322`.
- Studio: `http://127.0.0.1:54323`.

To stop services while retaining data: `npx supabase@2.122.0 stop`.

## Create and authorize the administrator

After applying the two initial migrations, manually create the owner's user through Authentication → Users in Studio or the correct project's Dashboard. Set an email and a secure password, and confirm the email using the administrative options. The application does not register, invite or automatically create users.

Copy that user's UUID and execute as the database owner, replacing the placeholder:

```sql
INSERT INTO private.administrator (singleton, user_id)
VALUES (TRUE, 'USER_UUID'::UUID)
ON CONFLICT (singleton) DO UPDATE SET user_id = excluded.user_id;
```

The foreign key requires the user to exist. `ON CONFLICT` can replace the administrator. To revoke authorization:

```sql
DELETE FROM private.administrator WHERE singleton = TRUE;
```

These operations affect RLS immediately, even when the user retains a valid JWT. Changes to existing administrator authorization require explicit confirmation. Keep the `private` schema outside the schemas exposed by the Data API.

Restart the application after completing `.env.local`. Open `/admin/login` to sign in with email and password. Successful owner sign-in returns to Overview (`/`); an already-authorized visitor to the login page also returns there. On desktop, use the account icon outside the sidebar to open the sign-out disclosure. On mobile, open the main navigation menu to sign out; the sphere in its top bar only indicates an active administrator session. Successful sign-out returns to the public Overview. A direct request to `/admin` checks authorization and redirects an authorized owner to Overview. The owner's local account has already been created and authorized manually; a future remote project will require its own account and authorization. Phase 2's temporary test users were removed.

These routes describe the existing authentication flow. The intended administration experience is editing on the same board with authorized controls; the related navigation, session-refresh coverage and CRUD remain pending design and implementation.

## Remote project

No remote project has been connected or configured. Before doing so, explicitly confirm the destination and migrations, and inspect any existing tables or data.

In Authentication, disable **Allow new users to sign up** and anonymous sign-ins, retain the Email provider and email confirmation, and set Site URL to the application origin. Password sign-in needs neither an OAuth callback nor magic links. `config.toml` configures the local environment and does not automatically change the remote Dashboard.

Only after connection and remote changes have been approved:

```sh
npx supabase@2.122.0 login
npx supabase@2.122.0 link --project-ref PROJECT_REF
npx supabase@2.122.0 db push --dry-run
npx supabase@2.122.0 db push
```

Review the dry run before the final command, which applies migrations. Never publish database passwords or CLI tokens. Create and authorize the owner as described above. Verify permissions, sign-in, session renewal and sign-out in that environment, and review Supabase Auth rate limits before publishing the application.

## Types and current code organization

`lib/supabase/database.types.ts` currently reflects the migration contract manually. To generate types from a validated local database:

```sh
npx supabase@2.122.0 gen types typescript --local --schema public
```

Review the generated output and diff before replacing the existing types. SQL uses uppercase keywords and types; schemas, tables, columns and functions use lowercase `snake_case`. TypeScript remains strict, with Server Components by default. Client components are limited to interactions, browser APIs and error recovery.

Current organization:

- `app/`: home, project and sign-in routes under a shared root layout, without a public/private route group.
- `components/`: React presentation grouped by responsibility, as described below.
- `lib/supabase/`: clients and database types.
- `lib/auth/`: authentication and authorization.
- `lib/projects/`, `lib/columns/`, `lib/tasks/`: domain queries and utilities.
- `supabase/`: configuration, migrations and SQL tests.
- `tests/`: application and public HTTP tests.
- `i18n/` and `messages/`: interface locale configuration, selection action, types and translation catalogs.

Generated Next.js and TypeScript files are ignored by Git. This inventory describes the preserved implementation; it does not authorize new layers or settle future structure choices.

### Components and UI tooling

The UI components are custom React components styled with Tailwind and the shared CSS color/font roles. The project does not install or generate shadcn/ui, Radix primitives or a separate component system. Its future adoption remains an owner decision; it is not needed to style the current pages.

Components are grouped into five folders:

- `components/layout/`: the shared application shell and sidebar navigation.
- `components/illustrations/`: the sidebar illustration, reusable video player and their colocated CSS modules.
- `components/projects/`: project listing, cards and board presentation.
- `components/tasks/`: task presentation.
- `components/shared/`: reusable empty/message states and the preserved language-switcher form.

Import components directly from their files. Keep CSS modules beside their components; no barrel exports or additional wrapper components are needed for this grouping. Route-local forms remain beside their routes in `app/`, and animation sequencing remains in `lib/animation/`. This organization changes file locations only, preserving Server/Client Component boundaries and runtime behavior.

| Component | Responsibility and rendering |
| --- | --- |
| `AppShell` | Server Component supplying the brand/home link, drawer, background and skip link |
| `SidebarNavigation` | Small Client Component using the current pathname for active Overview/Projects links; no session or data access |
| `PageMessage` | Typed presentation shared by both 404s and the error boundary; no data access or hooks; preserves alert announcements when requested |
| `ProjectList`, `ProjectBoard` | Async Server Components coordinating the public queries and presentation; listing is mounted at `/projects` |
| `ProjectCard`, `TaskCard`, `EmptyState` | Custom presentation for the retained project work; no browser database session |
| `LoginForm`, `SignOutForm` | Client Components for `useActionState`, pending states and translated feedback; Server Actions perform authentication |
| `LanguageSwitcher` | Native Server Action form below the sidebar illustration, visible on the compact rail |
| `app/error.tsx` | Client error recovery using `PageMessage`; retry behavior is preserved |

Login and supporting pages use the existing cream/honey/espresso roles, the central `shadow-panel` token and shared fonts. Inputs retain labels, autocomplete and focus outlines; fields/actions retain minimum touch height. `PageMessage` avoids repeating the page/heading/action structure across three states. These are provisional styles awaiting visual review, not a new library layer.

### Architecture and security review — 2026-11-08

The current Next.js/Supabase baseline remains appropriate. No additional backend, ORM, generic repository layer or dependency is justified by this review. The English-language convention was applied to existing internal comments and query/configuration error strings without changing control flow.

The owner approved the transport-hardening proposals on 2026-11-08:

- **Auth cookie transport:** `lib/supabase/cookie-options.ts` supplies the same `cookieOptions` to the server, proxy and browser clients. `Secure` is enabled when `NODE_ENV` is `production`, including production builds served locally. Use `npm run dev` for local HTTP authentication; use HTTPS for production authentication. Supabase SSR's existing `SameSite=Lax`, root path and browser-readable cookie defaults are preserved. Cookies remain browser-readable because the existing SSR design uses a browser client.
- **Supabase transport configuration:** `getSupabaseConfig` requires HTTPS, with HTTP allowed only for the explicit loopback hosts `localhost`, `127.0.0.1` and `[::1]`. LAN and remote HTTP origins are rejected. Origin-only validation and publishable-key restrictions remain in force. This does not prove TLS configuration or the identity of a remote deployment.

The following findings remain outside the current implementation:

- **Inline administration follow-up:** the confirmed project increment extends session refresh to `/admin/:path*`, `/projects/:path*` and `/project-images/:path*`, with separate authorization for owner queries/actions and session-independent public reads. Future Overview data integration must not contain private counts.
- **Response limits:** local Data API responses are capped at 1,000 rows, and the retained list queries do not paginate. A board exceeding that number of tasks can be incomplete. Propose pagination or an explicit product limit before that scale; use exact server counts for KPIs.
- **Project 404:** the localized heading is still absent from initial HTML, although the response is HTTP 404 and contains the heading in RSC. Current HTTP checks do not prove visual hydration or no-JavaScript behavior. Do not claim that styling closes this limitation.

Production dependency-audit and local read-only policy inspection evidence is recorded in [Validation](validation.md#structure-security-and-supporting-page-review--2026-11-08). The subsequent transport decision is recorded in [ADR 0002](adr/0002-single-administrator-and-rls.md#transport-hardening-update--2026-11-08). Further security, schema and dependency decisions still require owner confirmation.

## Documentation and comments

Use English for repository instructions, documentation, code and comments. Interface text uses the English source catalog with Spanish and Catalan translations. Conversation with the owner may remain in Spanish.

The owner makes project decisions. ADRs, documentation and comments should describe them using wording such as "It has been decided", "The project uses" or "The owner selected", with context, reasons and consequences. Do not attribute decisions to agreements or consensus between parties. References to confirmation apply to actions that actually require permission.

Keep the README concise. Use [Product requirements](product.md) for defined requirements and open choices, [Future ideas](ideas.md) for possibilities and [Validation](validation.md) for dated evidence. Propose ADRs for important architecture, security, dependency, functional or UX decisions. Keep proposals and accepted decisions distinguishable.

References: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [local CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

## Project input validation

`lib/projects/schemas.ts` defines the Zod schemas for project details, rich
content and edit identity, together with their inferred types. Schema rules
do not depend on FormData or action state. `satisfies` checks the details
output against the Supabase insert contract without widening its type.

`lib/projects/input.ts` reads FormData, validates it through those schemas
and maps issues to stable field error codes. It owns the parser results
and ProjectFormState response contract. Schemas reject unknown keys and
avoid coercion; adapters allowlist editable fields and reject duplicates,
files and null bytes. Text limits count Unicode code points. ProjectForm
uses the response contract; saveProject uses parseProjectSubmission and
validates identity separately. Authorization, slug uniqueness and writes
remain in Server Actions and database policies/constraints. The current
submission adapter additionally validates an explicit
is_published string enum and converts it to a boolean. The content-only
adapter still excludes publication. saveProject applies the content and
publication together after authorization and an optimistic concurrency
check; missing/duplicate/invalid publication values fail closed. The UI
defaults new projects to private. The earlier separate publication action
has been superseded.

## Strict typing and runtime validation

The owner selected Zod for new runtime input validation. Pin it as a direct runtime dependency and infer input/output types from schemas rather than maintaining duplicate form contracts. Treat external input as `unknown` until validated or narrowed. Do not use `any`, `as any`, `z.any()` or error suppressions to bypass the typing policy. Existing authentication validation is unchanged by the project-input work.

TypeScript enables `strict` and `noUncheckedIndexedAccess`. ESLint uses TypeScript project information for `.ts`/`.tsx` files and rejects explicit `any` plus unsafe assignments, arguments, calls, property access and returns. Type-aware linting adds a TypeScript analysis step; run `npm run lint` as well as `npm run typecheck`, since they check different properties. Generated files and third-party dependency declarations remain outside the application lint scope. The dependency decision is recorded in ADR 0001.
## Project rich-text prototype

Tiptap React, PM and StarterKit are direct dependencies pinned to 3.34.0. No Tiptap hosted service, collaboration package, shadcn/ui adoption or separate backend is introduced. The custom image node stores only an asset UUID and required alternative text; external HTML image sources are not imported. The editor extension schema and the Zod persistence schema are tested together. Recursive list types are explicit only at the recursive boundary; document, leaf, mark and form types are inferred from Zod.

Project controls use the shared listing/detail views, with session refresh covering those routes and private queries authorized separately. /admin only verifies authentication and redirects to Overview (`/`), preserving the session navigation integrated from main. Each Server Action verifies the current Auth user and is_admin with its own writable server client, allowlists/validates inputs and lets RLS enforce writes. Draft creation does not accept publication, identity, ordering or timestamps from the editable payload. Updates/publication compare the submitted updated_at value to reject stale writes. Publication is a separate saved-state operation; users should save edits before changing visibility. The form is not an autosave editor and does not yet intercept navigation with unsaved changes.

Migration 20261114000100 adds JSONB fields, repository_url, project_assets and the private project-images bucket. Its backfill preserves original descriptions and timestamps; the legacy description remains the plain-text summary used by cards and metadata. Original migration files are unchanged. project_assets uses ON DELETE RESTRICT to avoid losing the asset inventory when a parent is removed; project deletion is not offered until file/descendant deletion semantics are confirmed.

Image delivery uses GET /project-images/:id and private, no-store responses. Normal requests use an anonymous client even when administrator cookies are present. Explicit preview=1 requests verify the administrator with a writable server client. Storage RLS independently checks publication, ready state and saved document references. Its SELECT policies allow download operations and administrator removal only, denying listing, signed URLs and transformation paths. A compatible storage.allow_only_operation helper is required; the migration fails closed when it is missing. The bucket permits WebP only, with a 2 MiB limit. The editor exposes image upload after the draft has been saved; the accepted Sharp implementation and limits are described below.

### Focused database and HTTP checks

The original pgTAP suite still requires its own empty disposable database and user-creation authorization. Do not run it against the populated owner instance. The new standalone rollback-only test in tests/project-content-db.sql uses unique fixture UUIDs and the existing administrator, without creating users or changing administrator permissions. It does not upload binary data. On this local instance it can be run with:

```powershell
Get-Content -Raw tests/project-content-db.sql | docker exec -i supabase_db_portfolio-kanban psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

npm run test:public now includes the typed tests/project-content-http.ts test, sequentially with the existing HTTP tests because they share fixture population checks. It requires a local Next.js server, local Supabase, an existing administrator and the public URL/publishable key in the environment or ignored .env.local. KANBAN_TEST_URL defaults to http://127.0.0.1:3000. The new test rejects non-loopback targets. It uses a short-lived token for the existing local administrator signed with the local Auth container's key, held only in process memory. It never logs/persists the token or key, creates users or changes administrator authorization. It uploads unique WebP/PNG fixtures, exercises the real upload route and project Server Actions, and removes only that run's objects, assets and projects in order. The typed integration suite requires a production build for its Server Action manifest. Public/private delivery, signed-URL denial, hiding and preservation of user/data counts are asserted. This is HTTP verification, not browser interaction or visual acceptance.

## Image-processing dependency proposal - 2026-11-14

Historical proposal, subsequently accepted by the owner on the same date;
see the implementation section below. This assessment records purpose,
alternatives, trade-offs and measured weight as required by AGENTS.md.

Sharp 0.35.5 would run only in server upload processing to decode JPEG, PNG
and WebP input, enforce dimensions, resize, encode WebP and omit metadata
before sending output to private Storage. It provides native image
processing through libvips. The trade-offs are platform-specific binaries,
CPU/memory use while decoding and an additional directly maintained
dependency. Byte/pixel limits and upload tests remain necessary.

Alternatives include browser Canvas preprocessing (no additional package,
but browser-dependent output and no authoritative server input validation)
and Supabase delivery transformations (managed resizing, but a paid feature
that does not replace validating and normalizing incoming uploads and
would change the selected controlled-delivery design). No alternative has
been adopted.

Local measurements in the Windows x64 worktree: npm ls resolves Sharp
0.35.5 through Next.js 16.4.3. The installed sharp folder contains
1,064,752 bytes and @img/sharp-win32-x64 contains 19,812,379 bytes, totaling
20,877,131 bytes (about 19.9 MiB). This is an uncompressed disk measurement
of those two folders, not the full dependency closure, a browser bundle
size or a deployment artifact measurement. npm registry unpacked sizes
are 962,168 and 19,812,379 bytes respectively; local generated files can
explain a difference from registry sizes.

The proposed server-only import would add no Sharp code to the browser
bundle. Matching the existing version may reuse this local installation;
that does not guarantee an unchanged production artifact. Deployment OS,
architecture and Next.js file tracing must be measured once the actual
upload implementation and deployment target exist. CPU/memory use has
not been benchmarked.

References: [Sharp](https://sharp.pixelplumbing.com/),
[output and metadata](https://sharp.pixelplumbing.com/api-output/),
[platform installation](https://sharp.pixelplumbing.com/install/),
[Canvas output](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob)
and [Supabase transformations](https://supabase.com/docs/guides/storage/serving/image-transformations).

## Shared project controls and image upload implementation - 2026-11-14

Sharp 0.35.5 is now accepted as a direct dependency; the earlier assessment
above remains the proposal and measurement history. ProjectManagement
lazily loads the rich form after opening its button. Creation is in
/projects; editing and publication are in /projects/[slug]. /admin now
verifies authentication and redirects to /projects. Sign-in redirects
there, and sign-in/out invalidate the shared root layout. The proxy now
renews sessions on /admin, /projects and /project-images. Public queries
and metadata continue using anonymous clients; separately authorized
managed queries can return drafts and private board content to the owner.

Project actions live in app/projects/actions.ts, not under /admin. They
continue independent server authorization, strict Zod validation, RLS,
asset ownership checks and optimistic updated_at matching. Successful
saves redirect to the server-validated slug in the shared project view.

POST /project-images runs in Node, requires a same-origin Origin header
and administrator session, bounds actual streamed body bytes to 8 MiB plus
64 KiB multipart overhead, and validates a single file and project UUID.
Input images are JPEG/PNG/WebP up to 8 MiB and 25 million pixels. Signature,
declared MIME and decoded format must agree; animation is rejected. Sharp
applies orientation, resizes without enlargement to fit 4,096 by 4,096,
encodes WebP at quality 82/effort 4 with a ten-second processing timeout,
and strips metadata. Output is capped at 2 MiB. These conservative upload
parameters are implementation defaults within the approved image scope.

The pending asset belongs to an existing project; only after successful
Storage upload is it marked ready. Compensation removes only the exact
asset created by that request, object first. Failed cleanup preserves the
pending row. Successful unsaved uploads and removed document nodes retain
private stored files. There is no automatic orphan cleanup or existing-file
delete UI. This avoids assuming a deletion policy; file lifecycle and
project deletion remain explicit follow-up decisions. Save the initial
draft before attaching images. Saving and closing the form are disabled
while its upload is pending. No autosave or navigation-discard guard is
implemented.

## Current review environment - 2026-11-14

The project CRUD working prototype is available locally at
http://127.0.0.1:3015/projects, with authentication at
http://127.0.0.1:3015/admin/login. It runs this worktree with
`npm run dev -- -p 3015 -H 127.0.0.1` and the existing local Supabase
instance. Public Supabase configuration is injected only into the server
process; no environment or credential file is committed. The listener is
restricted to loopback. Development mode allows local HTTP authentication;
production authentication still requires HTTPS.

This is a temporary local review session. It depends on this computer and
the local Supabase containers remaining available. It is not a remote
deployment or a publicly shareable URL. No hosting account is connected,
no remote Supabase project is linked, and the deployment provider remains
unselected. A remote review environment needs the owner's hosting and
Supabase environment choice, credentials, a migration/configuration plan,
and an existing authorized administrator. Do not publish the loopback
Supabase URL or automatically create remote users. UI acceptance remains
pending; the UI implementation commit is explicitly marked WIP.

## Native project form modal - 2026-11-15

ProjectManagement now opens the lazily loaded project form inside a native
HTML dialog with showModal(), replacing the provisional inline section.
This uses the existing React client boundary and adds no dependencies.
The modal has a labelled heading, internal vertical scrolling and an
explicitly aligned opening button. The later cozy styling update below
supersedes the first left-aligned/sticky-close presentation.

The browser supplies the top layer and inert background. A keyboard handler
cycles focus at the first/last enabled visible controls and blocks Escape
while busy. Native closedby switches between closerequest and none; the
cancel handler also prevents idle/native close requests from bypassing
React state. Body overflow is restored on close/unmount, and focus returns
to the opener. Project save/upload and publication report pending state
separately, so modal dismissal is blocked throughout either operation and
the form cannot save concurrently with publication. The existing translated
closeForm message is reused. Backend authorization and data rules are not
changed by this presentation update.

## Cozy modal and rich-text presentation - 2026-11-15

ProjectManagement now uses a flex dialog with a fixed header and footer;
only project-dialog-body scrolls. The opening action and footer actions
align right. In the Projects listing, the introduction and creation action
share a flex row from the lg breakpoint (1,024px); smaller viewports stack
them with a full-width trigger. ProjectManagement accepts optional wrapper
and trigger classes, preserving the detail view's existing spacing.
The X and bottom Close action share pending-operation guards.
The footer submit button targets ProjectForm by its native form attribute.
ProjectForm reports a strictly typed busy/pending/canSubmit status, keeping
editor validity and upload/save guards intact without moving domain logic
into the modal. Status resets on close. Escape is handled in capture phase
so dismissal also works when the rich-text editor owns focus.

globals.css defines a 420ms opacity/14px-rise/slight-scale entrance and a
320ms backdrop fade with gentle blur. prefers-reduced-motion disables
these animations and the related color/shadow transitions. No animation
dependency or JavaScript animation timer is used.

RichTextEditor retains its existing commands and schema. EditorToolButton
renders local SVG/typographic symbols with translated accessible names and
native hover titles. The toolbar groups text, headings, lists, blocks,
links and history, wrapping on narrow screens. Controls retain 44px
targets, pressed states and visible focus. The field shell integrates the
image-upload footer and uses palette-based surfaces/focus treatment. An
empty paragraph is detected with CSS :has to display the translated
data-placeholder hint; that hint is not persisted as project content.

## Board-focused detail and visibility form - 2026-11-15

ProjectForm renders the same controlled native button switch in both
creation and editing, initialized from is_published or false. A hidden
field sends true/false explicitly; changing the switch has no write side
effect until save. The switch supports keyboard activation, a linked
label/help, aria-checked, disabled states and reduced-motion styling.
The existing save/upload busy guards also cover visibility. Creation
uses the generic Create project label and saves to ?saved=1 without
edit=1. ProjectManagement retains optional explicit editor entry.

The detail keeps a screen-reader project heading and compact back/edit
controls above the board. Supporting rich content remains editable and
stored; its former visible detail sections are removed. Public metadata
continues to use the existing session-independent published query.
Creation image staging is a proposal in ADR 0002, not implemented.


## Project information dialog - 2026-11-15

The detail shows the project title and ProjectInformation icon, with
administrator-only edit controls in the same header. ProjectInformation
is a client trigger/dialog shell receiving server-rendered RichTextContent
as children. Description, objectives, repository and the empty-information
message use existing authorization and next-intl catalogs. Public drafts
remain inaccessible before any information component is constructed.

ProjectDialog is shared by information and ProjectManagement. It owns
native dialog synchronization, initial heading focus, Tab cycling, Escape,
focus/scroll restoration, header X and footer Close. Editing supplies
save actions and busy guards; information has only dismissal controls.
The existing CSS animation and reduced-motion treatment apply to both.
The Read only badge is no longer rendered. No dependency or database
change is introduced. Requested status/is_hidden fields remain a proposal
in ADR 0001 until the owner confirms their data/access semantics.

## Information modal editing refinement - 2026-11-15

ProjectInformation receives editable project values only for the verified
administrator. Its footer switches the existing ProjectDialog from
server-rendered information to the lazily loaded shared ProjectForm.
Submission/busy status uses ProjectFormStatus and the same server action,
validation and authorization as creation/editing elsewhere. Title changes
refocus the dialog heading; closing resets the editor mode/status and
restores focus to the information icon. There is no nested dialog. The
icon uses an undecorated 44px button with an accessible name/focus ring.

## Creation image staging and draft saves - 2026-11-15

ProjectForm owns one ProjectImageStaging store for both rich-text fields.
The store holds original File values, UUIDs, blob previews and known
uploaded IDs, capped at 32 MiB of file bytes (8 MiB each). Preview URLs
are revoked when insertion fails or the form unmounts. Undo retains files
within that budget. The editor extension only resolves local URLs while
rendering; documents serialize UUID references, never blob URLs.

prepareCreationImages validates the complete submission before writing,
removes unresolved local image nodes from draft snapshots and uploads
active files sequentially through the shared uploadProjectImage client.
saveProjectDraft authorizes/validates every call, forces private state,
checks owned ready assets and returns a Zod-validated identity. Initial
creation uses the form's stable UUID; a repeated insert only returns an
untouched private draft, never bypassing subsequent edits. Later writes
use updated_at and cannot change a published project through this action.
Successful references are saved privately before normal saveProject
applies requested visibility and redirects. Failed uploads attempt to
persist successful references; retry reuses known asset IDs. A transport
failure can leave an unreferenced private upload; cleanup remains pending.

Form details are controlled so failed actions retain name, slug and
repository alongside editor content. The retained-draft message explains
what survives closing. Save/upload pending state blocks dismissal. No
new schema, dependency or Storage permission is introduced.

readImageForm sets the original multipart Content-Type on Response,
rather than Blob.type: Blob lowercasing otherwise corrupts case-sensitive
WebKit boundaries. Existing byte, pixel and normalization limits remain.


## Image persistence browser tests - 2026-11-15

Run `npm run test:images` against a running local production build and the
existing local Supabase instance, configured as for `test:public` with
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and
`KANBAN_TEST_URL` (default `http://127.0.0.1:3000`). Both origins must be
HTTP loopback URLs. Docker and the existing authorized administrator are
required. No users are created. Run integration suites sequentially and
avoid editing application data while their preservation checks run.

The suite uses an installed Chromium browser through its debugging protocol,
with an isolated temporary profile and generated PNG fixture. On Windows it
defaults to Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`.
For another installation, set `KANBAN_TEST_BROWSER` to the absolute executable
path. It does not download a browser or add a dependency. Browser protocol
responses are validated with Zod. Shared local authentication/environment
helpers also serve the existing project HTTP suite.

The tests drive actual file inputs, Server Actions, image HTTP routes and
Supabase Storage. They verify native file-picker cancellation, resource
release on explicit dismissal, staged creation in both fields, private
upload progress, persisted image decoding after reload, editing with a new
image, anonymous published viewing, returning to private visibility, and a
failed-upload retry without duplicate assets. The tests remove only their
UUID-named project/asset/Storage fixtures, stop their own browser, and check
that existing project/asset/column/task/user/administrator counts match.

ProjectDialog ignores bubbling file-input `cancel` events. Only a cancel
originating at the dialog is treated as dialog dismissal; explicit Close/X
and Escape keep their existing busy guards. Selecting an unchanged file or
cancelling its picker must preserve the open form and staged images.


### Following an image upload through the form

`ProjectForm` is shared between creation and editing. Its `useActionState`
callback receives the outer form's FormData; rich-text JSON lives in the
`description_content` and `objectives_content` hidden fields. File pickers
have no form field name: images travel separately, never in the Server
Action request carrying project details.

1. `EditorImageUpload.upload()` validates the trimmed alternative text
   (1-300 characters), selection and source size before attempting any upload.
   An `invalidAlt` error returns immediately; it produces no network request.
2. Creation stages the File under a local UUID in `ProjectImageStaging`,
   creates a blob preview and calls the editor's `onInsert`. Storage is
   untouched at this point. Editing instead calls `uploadProjectImage`
   immediately with the existing project ID.
3. `uploadProjectImage` posts multipart `project_id` and `file` to
   `/project-images`. The browser sets Content-Type/boundary. Its JSON
   result is validated with `imageUploadResultSchema`.
4. The POST handler checks same-origin, administrator authorization,
   multipart fields, source size and project existence. `readImageForm`
   bounds streamed bytes; `normalizeProjectImage` validates the raster,
   bounds pixels, strips metadata and produces WebP. The handler inserts
   a pending `project_assets` row, uploads the object into private Storage
   and marks the asset ready. Success is HTTP 201 with its UUID; failures
   use 400/401/403/413/503 and a stable error code. Request-local cleanup
   compensates failed persistence.
5. `RichTextEditor.onInsert` validates the candidate document and appends
   an image root block `{ type: "image", attrs: { assetId, alt } }`.
   `onUpdate` serializes the editor JSON back into ProjectForm's hidden
   field. In creation the ID is initially local; in editing it is the
   uploaded asset UUID. No inserted node means the image is absent from
   the next project save, even if an upload already succeeded.
6. On creation save, `prepareCreationImages` validates all fields, creates
   a private draft and uploads referenced staged files sequentially. It
   replaces local IDs with returned asset IDs and saves private progress
   before normal `saveProject` applies the selected publication. Editing
   calls `saveProject` directly with the JSON's existing asset references.
7. `persistProject` authorizes again, validates input, verifies every image
   is ready and belongs to this project, then applies the optimistic
   timestamp update. Successful save revalidates project pages and redirects.
8. `RichTextContent` renders image references through `/project-images/:id`.
   Administrator previews use `?preview=1`; public requests use a separate
   anonymous client. Storage/database policies check access on delivery.

Debug the first boundary whose expected evidence is missing:

| Observation | Check |
| --- | --- |
| No POST after Insert while editing | Alternative text/file errors and whether the button/editor is enabled |
| No POST after Insert while creating | Expected: staging is local until Create project |
| POST fails | Response error code, authentication/origin, decoding/size limits or Storage failure |
| POST returns 201 but no image node | `RichTextEditor.onInsert`, candidate document limits and command result |
| Node exists but save fails | Server Action errors, ready/ownership validation, updated_at or slug conflict |
| Saved node exists but image does not decode | GET response for its asset UUID and publication/preview authorization |

`test:images` uses trusted pointer clicks and records only upload request IDs
and HTTP status codes. It checks that invalid alt sends no POST, corrupt
bytes return 400 without an inserted node/asset, and correction uploads and
inserts on the next click. `tests/image-upload.test.ts` isolates the client
transport with mocked fetch: multipart fields/bytes, browser-owned boundary,
server error mapping and malformed/network responses. Actual persistence
and rendering are covered by the HTTP/browser suites, not those mocks.


### Preventing selected images from being lost on submit

EditorImageUpload intercepts Enter in its alternative-text field to run the
same insertion handler as its button, preventing the enclosing form's implicit
submit. Composition commits and repeated keydown events do not start another
upload. Blank/invalid alternative text keeps focus and reports aria-invalid
with an associated error. The visible required label and aria-required apply
to image insertion; native required is deliberately absent because the empty
upload controls must not block saving a project after successful insertion.

ProjectForm's submit capture checks both file inputs before dispatching its
Server Action. A nonempty selection cancels submission, preserves form/file
values, announces pendingImages and focuses that file. Discard selection clears
only the local picker; it does not delete stored assets. Input changes,
insertion updates and form button interactions clear a previous pending-image
notice. A subsequent explicit save rechecks the actual file inputs.

The uploader reports the selected filename, local insertion or completed
upload separately. In creation the preview remains local until Create project;
in editing upload precedes insertion and the project still needs saving.
These controls change neither server authorization/validation nor Storage
permissions. They prevent accidental data omission at the browser boundary.

## Confirmed project follow-up boundary - 2026-11-20

The owner verified the fixed image flow. This project increment implements
lifecycle, mandatory cancellation reasons and a listed-but-inaccessible hidden
flag. New and existing projects start in Active / in development. Projects cannot
be deleted; cancellation preserves their data. Earlier deletion discussions in
this document are historical and do not authorize a deletion action or cleanup.
Column CRUD is excluded from the initial scope. The common predefined column set
belongs to task CRUD; four columns is provisional and the final count/labels
remain undecided.

The owner confirmed the plan and instructed implementation. The local migrated
schema now contains status/is_hidden/cancellation_reason; ADRs 0001/0002 record
the schema, reason behavior and safe listing/detail split. Remote migrations,
broad file cleanup and deployment remain outside this increment. No dependency
or new Markdown file was added.

### Lifecycle and hidden-project implementation

ProjectForm submits explicit status, is_hidden and cancellation_reason values.
parseProjectSubmission validates them with Zod before existing Server Actions
persist changes with authorization and optimistic updated_at matching. Cancelled
requires a trimmed, nonblank plain-text reason up to 2,000 Unicode code points.
The shared form retains the reason in other states; the information modal shows
it only for Cancelled. Publication, hiding and lifecycle remain independent.

Anonymous listing queries call list_project_summaries and validate a fixed
summary type. Hidden cards have name/status only and no link; unpublished rows
never appear. Full project queries and descendant/asset RLS exclude hidden rows.
Owner listing/detail queries remain separately authorized and permit management
of every visibility combination. Metadata and ordinary image requests stay
anonymous even when a request includes administrator cookies.

Local migrations:

- 20261120000100_project_lifecycle_and_hidden.sql adds fields, checks, listing RPC,
  access policies and authenticated project DELETE denial.
- 20261120000200_cancellation_reason_whitespace.sql aligns database whitespace
  validation with JavaScript trim after its BOM-only regression failed.

New management tests are tests/project-management.test.ts and
tests/project-management-db.sql. The SQL suite runs in one rolled-back transaction
with unique fixtures and the existing local administrator; it creates no users
and is safe for the populated local instance. Run it with:

~~~powershell
Get-Content -Raw -Encoding UTF8 tests/project-management-db.sql | docker exec -i supabase_db_portfolio-kanban psql -U postgres -d postgres -X -v ON_ERROR_STOP=1
~~~

The existing HTTP and browser suites also exercise lifecycle, visibility and
reason controls. Their local-only fixture cleanup requires the existing Docker
PostgreSQL container because the application is no longer allowed to delete
projects. Cleanup validates exact fixture UUIDs/slugs and removes only those
projects after their exact test image objects are removed. The empty-database
pgTAP suite's project-delete expectation was updated but that suite must still
not run against a populated owner instance.
