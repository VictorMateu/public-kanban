# Project Garden

A public Kanban for exploring my projects, their progress and supporting information. Visitors can browse published content; only the owner can manage it. Project Garden will also be featured as a project on my personal website.

## Status

- **Phase 1 complete:** Next.js App Router, strict TypeScript, Tailwind CSS and ESLint.
- **Phase 2 validated locally:** Supabase schema, password authentication, single-administrator authorization and RLS.
- **Phase 3 visual prototype; acceptance pending:** a cozy full-viewport layout provides Overview/Projects navigation, a public project listing, a sidebar language selector, a collapsible mobile menu without decorative media and a desktop account disclosure and mobile-menu sign-out for the verified administrator session. Overview shows public project and task counts in a viewport-aware layout, with a public activity chart; login and 404 pages share the visual direction.
- The interface supports English (default), Spanish and Catalan through `next-intl`, with a cookie preference and unchanged URLs.
- Project management in the shared views supports creation, reading, editing, publication, lifecycle status and cancellation with a required reason. Published hidden projects remain listed while visitor detail/board/image access is blocked. Description and objectives support rich text and private, normalized images; the owner verified the image flow. Projects cannot be deleted. The owner accepted this project-management increment locally; file cleanup policy remains pending. See [current scope](docs/product.md). No remote services are connected or deployments made.
- The shared board supports owner-only task creation, editing, hiding, archiving and ordering, with four predefined columns per project. Tasks can move by status selector or drag and drop. Task descriptions support rich text and images using the shared project editor. The owner can consult archived tasks from the board. The owner accepted the board layout and task controls. The [project 404](docs/validation.md#project-404-initial-html-fix) renders its localized message without JavaScript.
- Strict GitHub Actions CI and security workflows are configured on `main`, with required gates and the approved temporary parser-scoped minimatch override. Local validation of the integrated project branch passes; hosted validation of this branch remains pending. See the [recorded evidence](docs/validation.md).

## Architecture

Project Garden is a single Next.js application using App Router. Server Components render pages and load data; Client Components handle interactions such as dialogs, forms, the Tiptap editor and navigation. Tailwind and colocated CSS modules provide the interface styling. Supabase supplies PostgreSQL, Auth and private image Storage through its official clients.

- **Reads:** routes and async components call domain queries in `lib/`. Public reads use a session-independent anonymous client. Owner queries authorize the current user before loading private data. The public project listing uses a limited SQL summary RPC so published hidden projects can remain listed with a plain-text excerpt and without a usable link. Overview uses exact anonymous counts for projects with a public board and their visible tasks. The activity chart groups available creation and completion dates in UTC.
- **Writes:** shared creation/editing forms submit to Server Actions in `app/projects/actions.ts`. `lib/projects/input.ts` extracts form fields; Zod schemas in `lib/projects/schemas.ts` validate them and infer their types. Actions authorize the owner, validate referenced assets, persist through Supabase and refresh or redirect the view. Updates compare `updated_at` to reject stale edits. TypeScript is strict; `any` is prohibited.
- **Images:** Tiptap documents are validated JSONB containing asset IDs. Creation stages files locally, saves a private draft, uploads images and applies the selected publication only after uploads succeed. `POST /project-images` validates and normalizes raster images with Sharp, then stores them in a private bucket with metadata in `project_assets`. `GET /project-images/[id]` checks visibility or owner-preview authorization before delivering bytes.
- **Access control:** Supabase Auth uses cookie sessions. The authorized UUID lives in `private.administrator`; `is_admin()` is shared by server authorization and database policies. `proxy.ts` refreshes sessions for admin, project and image routes; pages/actions authorize separately, and PostgreSQL grants and RLS enforce access. Drafts and hidden project details are unavailable to visitors. Project deletion is denied; cancellation requires a reason.
- **Localization:** `next-intl` reads a validated language cookie, uses English by default and supports Spanish and Catalan. URLs have no locale prefix; owner-authored project/task content is separate from interface catalogs.

`/` is Overview, `/projects` contains the listing and creation dialog, and `/projects/[slug]` contains the board and project-information/editing dialogs. `/admin/login` handles sign-in; authorized visits to `/admin` return to Overview. Project management stays in the shared project views.

## Repository structure

| Path | Responsibility |
| --- | --- |
| [app/](app/) | App Router pages, layouts, error boundaries, Server Actions and image Route Handlers |
| [components/](components/) | UI grouped into `auth`, `layout`, `overview`, `projects`, `tasks`, `shared` and `illustrations` |
| [lib/](lib/) | Domain queries and logic, Zod schemas/input parsing, rich text, image processing, authorization and Supabase clients/types |
| [i18n/](i18n/) and [messages/](messages/) | Locale configuration, preference action and `en`/`es`/`ca` catalogs |
| [supabase/](supabase/) | Local configuration, versioned SQL migrations and database policy tests |
| [tests/](tests/) | Unit, SQL, HTTP and isolated-browser checks, with local fixture helpers |
| [public/](public/) | Static branding, fonts and illustrations |
| [proxy.ts](proxy.ts) | Request-time session refresh and private/no-store response headers on matched routes |
| [.github/](.github/) and [scripts/ci/](scripts/ci/) | Quality/security workflows, dependency updates and the CodeQL result gate |
| [docs/](docs/) | Product scope, development operations, validation evidence, ideas and architecture decision records |

## Stack and local development

Next.js 16.4.6, React 19.3.1, strict TypeScript without `any`, Zod input validation, Tailwind CSS 4.3.5 and Supabase PostgreSQL/Auth. Use Node.js 24.x and npm 11.x; Docker is required for local Supabase.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The Overview presentation works without Supabase; its metrics and activity report that data is unavailable. Follow the [development guide](docs/development.md) to configure local Supabase and the administrator for sign-in and project data; without configuration, those views report unavailable data and sign-in is disabled. Each worktree needs its own ignored `.env.local`; merging a branch does not copy local configuration.

| Command | Purpose |
| --- | --- |
| `npm run lint` | Check code without warnings |
| `npm run format -- <paths>` | Format selected files with Prettier |
| `npm run format:check -- <paths>` | Check formatting without writing files |
| `npm run typecheck` | Generate route types and check TypeScript |
| `npm test` | Run application tests |
| `npm run test:public` | Test public HTTP routes with local Next.js and Supabase running |
| `npm run test:images` | Test image persistence in an isolated local Chromium browser |
| `npm run build` | Build for production |
| `npm start` | Serve an existing production build |

## Documentation

- [Agent instructions and required reading](AGENTS.md)
- [Product requirements and open decisions](docs/product.md)
- [Future ideas and required maintenance follow-up](docs/ideas.md)
- [Development, configuration and database operations](docs/development.md)
- [CI security policy and GitHub activation](docs/development.md#continuous-integration-and-security)
- [Validation evidence and limitations](docs/validation.md)
- [ADR 0001: Next.js and Supabase](docs/adr/0001-nextjs-and-supabase.md)
- [ADR 0002: Single administrator and RLS](docs/adr/0002-single-administrator-and-rls.md)
- [ADR 0003: Interface internationalization](docs/adr/0003-interface-internationalization.md)
- [ADR 0004: Strict CI and security gates](docs/adr/0004-strict-ci-and-security.md)

The owner accepted the first responsive Overview presentation, the local project-management increment and the current Kanban presentation. The file cleanup policy remains pending; authentication still needs verification in the eventual HTTPS deployment. Each implementation scope and phase transition requires the owner's confirmation.

## License

[MIT](LICENSE). Copying, modification and redistribution, including commercial use, are permitted while retaining the copyright and license notices. The code is provided without warranty. Dependencies retain their own licenses.
