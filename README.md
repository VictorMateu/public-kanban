# Project Garden

A public Kanban for exploring my projects, their progress and supporting information. Visitors can browse published content; only the owner can manage it. Project Garden will also be featured as a project on my personal website.

## Status

- **Phase 1 complete:** Next.js App Router, strict TypeScript, Tailwind CSS and ESLint.
- **Phase 2 validated locally:** Supabase schema, password authentication, single-administrator authorization and RLS.
- **Phase 3 visual prototype; acceptance pending:** a cozy full-viewport layout provides Overview/Projects navigation and a public project listing. Overview KPIs await definition; login and 404 pages share the visual direction without a language selector.
- The interface supports English (default), Spanish and Catalan through `next-intl`, with a cookie preference and unchanged URLs.
- Project controls in the shared listing/detail views support creating projects with selected visibility, rich-text description/objectives, repository links and updates. Creation and editing share a publication switch applied on save; project detail shows its title and board with supporting information in a modal. Private image upload/delivery uses server-side Sharp normalization. Lifecycle status and hidden access semantics, images before creation, project deletion, file cleanup policy and visual/interaction acceptance remain pending. See [current scope](docs/product.md). No remote services are connected or deployments made.

## Stack and local development

Next.js 16.4.3, React 19.3.1, strict TypeScript without `any`, Zod input validation, Tailwind CSS 4.3.3 and Supabase PostgreSQL/Auth. Use Node.js 24.x and npm 11.x; Docker is required for local Supabase.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The blank base-layout screen works without Supabase. Follow the [development guide](docs/development.md) to configure local Supabase and the administrator for sign-in and project data; without configuration, those views report unavailable data and sign-in is disabled.

| Command | Purpose |
| --- | --- |
| `npm run lint` | Check code without warnings |
| `npm run typecheck` | Generate route types and check TypeScript |
| `npm test` | Run application tests |
| `npm run test:public` | Test public HTTP routes with local Next.js and Supabase running |
| `npm run build` | Build for production |
| `npm start` | Serve an existing production build |

## Documentation

- [Agent instructions and required reading](AGENTS.md)
- [Product requirements and open decisions](docs/product.md)
- [Future ideas](docs/ideas.md)
- [Development, configuration and database operations](docs/development.md)
- [Validation evidence and limitations](docs/validation.md)
- [ADR 0001: Next.js and Supabase](docs/adr/0001-nextjs-and-supabase.md)
- [ADR 0002: Single administrator and RLS](docs/adr/0002-single-administrator-and-rls.md)
- [ADR 0003: Interface internationalization](docs/adr/0003-interface-internationalization.md)

The next step is to review the UI visually, define public Overview KPIs and verify authentication in the eventual HTTPS deployment. Each implementation scope and phase transition requires the owner's confirmation.

## License

[MIT](LICENSE). Copying, modification and redistribution, including commercial use, are permitted while retaining the copyright and license notices. The code is provided without warranty. Dependencies retain their own licenses.
