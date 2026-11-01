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
