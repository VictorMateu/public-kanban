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
| @supabase/supabase-js | 2.118.0 |
| @supabase/ssr | 0.12.7 |
| server-only | 0.0.1 |

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

The application builds without Supabase configuration and does not query the database during compilation. After changing `NEXT_PUBLIC_*` variables, restart `dev` and rebuild before using `start`: those variables are incorporated into the browser bundle at build time.

## Existing public implementation — acceptance pending

The following describes the preserved phase 3 code, not an accepted navigation or visual design. Review [Product requirements](product.md) before changing it. Existing Spanish interface text will be translated in the subsequent UI iteration.

`/` lists published projects by `position, id`. `/projects/[slug]` shows a project's description, columns and tasks, including priority and a due date when present. Columns and tasks follow the same ordering, and the board supports horizontal scrolling using the keyboard and touch input.

The routes use dynamically rendered Server Components. Queries use the anonymous client and do not persist responses in a shared cache. `React.cache` shares the project query between metadata and the page only within a request. Private and nonexistent projects return the same generic 404, including metadata.

Project and task loading uses `Suspense`. The board does not start streaming until publication has been checked, preserving the 404 response for unavailable projects. The `app/(public)/` route group currently shares a header, footer and error boundary without changing URLs or the existing administrative routes. This grouping remains part of the structure review.

Without configuration, pages report unavailable data rather than treating the missing connection as an empty list. An actual empty response from Supabase produces the appropriate empty-project, empty-column or empty-task state. Query errors show a generic message and allow another attempt.

### Local HTTP tests

After starting local Supabase, building and serving the application, run in another terminal:

```sh
npm run test:public
```

The command requires Docker and the `supabase_db_portfolio-kanban` container. It accepts only an HTTP server on `localhost` or `127.0.0.1`, defaulting to port 3000. Set `KANBAN_TEST_URL` to use a different local HTTP origin.

The tests create only temporary projects, columns and tasks in the local database and delete their own specific UUIDs during cleanup. They do not create users or change administrator authorization. They check ordering, drafts, 404 responses, empty states, text escaping, dates, priorities and unpublishing. They can preserve the owner's existing local account. The phase 2 SQL suite instead requires an empty test instance.

## Environment variables

Copy `.env.example` to `.env.local` and configure only:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | The project's HTTP or HTTPS origin |
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

Restart the application after completing `.env.local`. Open `/admin/login` to sign in with email and password, then `/admin` to check permission and sign out. The owner's local account has already been created and authorized manually; a future remote project will require its own account and authorization. Phase 2's temporary test users were removed.

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

- `app/`: routes and their layouts; the public route group remains subject to review.
- `components/`: current project, board and task presentation.
- `lib/supabase/`: clients and database types.
- `lib/auth/`: authentication and authorization.
- `lib/projects/`, `lib/columns/`, `lib/tasks/`: domain queries and utilities.
- `supabase/`: configuration, migrations and SQL tests.
- `tests/`: application and public HTTP tests.

Generated Next.js and TypeScript files are ignored by Git. This inventory describes the preserved implementation; it does not authorize new layers or settle future structure choices.

## Documentation and comments

Use English for repository content, including instructions, documentation, interface text and comments. Conversation with the owner may remain in Spanish. The existing interface will be translated as part of the subsequent UI work.

The owner makes project decisions. ADRs, documentation and comments should describe them using wording such as "It has been decided", "The project uses" or "The owner selected", with context, reasons and consequences. Do not attribute decisions to agreements or consensus between parties. References to confirmation apply to actions that actually require permission.

Keep the README concise. Use [Product requirements](product.md) for defined requirements and open choices, [Future ideas](ideas.md) for possibilities and [Validation](validation.md) for dated evidence. Propose ADRs for important architecture, security, dependency, functional or UX decisions. Keep proposals and accepted decisions distinguishable.

References: [Next.js](https://nextjs.org/docs/app/getting-started/installation), [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [local CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).
