# Project Garden

A public Kanban for exploring my projects, their progress and supporting information. Visitors can browse published content; only the owner can manage it. Project Garden will also be featured as a project on my personal website.

## Status

- **Phase 1 complete:** Next.js App Router, strict TypeScript, Tailwind CSS and ESLint.
- **Phase 2 validated locally:** Supabase schema, password authentication, single-administrator authorization and RLS.
- **Phase 3 visual prototype; acceptance pending:** a cozy full-viewport layout provides Overview/Projects navigation, a public project listing, a sidebar language selector, a collapsible mobile menu without decorative media and a desktop account disclosure and mobile-menu sign-out for the verified administrator session. Overview now has a viewport-aware presentation-only summary with pending metrics and an activity placeholder; login and 404 pages share the visual direction.
- The interface supports English (default), Spanish and Catalan through `next-intl`, with a cookie preference and unchanged URLs.
- Administration CRUD and the additional [product requirements](docs/product.md) are not implemented. No remote services are connected or deployments made.

## Stack and local development

Next.js 16.4.3, React 19.3.1, strict TypeScript, Tailwind CSS 4.3.3 and Supabase PostgreSQL/Auth. Use Node.js 24.x and npm 11.x; Docker is required for local Supabase.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The Overview presentation works without Supabase; its metrics and activity remain pending. Follow the [development guide](docs/development.md) to configure local Supabase and the administrator for sign-in and project data; without configuration, those views report unavailable data and sign-in is disabled.

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
- [Future ideas and required maintenance follow-up](docs/ideas.md)
- [Development, configuration and database operations](docs/development.md)
- [Validation evidence and limitations](docs/validation.md)
- [ADR 0001: Next.js and Supabase](docs/adr/0001-nextjs-and-supabase.md)
- [ADR 0002: Single administrator and RLS](docs/adr/0002-single-administrator-and-rls.md)
- [ADR 0003: Interface internationalization](docs/adr/0003-interface-internationalization.md)

The owner accepted the first responsive Overview presentation. The next step is to define its data integration after the separate data-model work, continue reviewing the remaining UI and verify authentication in the eventual HTTPS deployment. Each implementation scope and phase transition requires the owner's confirmation.

## License

[MIT](LICENSE). Copying, modification and redistribution, including commercial use, are permitted while retaining the copyright and license notices. The code is provided without warranty. Dependencies retain their own licenses.
