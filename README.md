# Portfolio Kanban

A public Kanban for exploring my projects, their progress and supporting information. Visitors can browse published content; only the owner can manage it. Portfolio Kanban will also be featured as a project on my personal website.

## Status

- **Phase 1 complete:** Next.js App Router, strict TypeScript, Tailwind CSS and ESLint.
- **Phase 2 validated locally:** Supabase schema, password authentication, single-administrator authorization and RLS.
- **Phase 3 implementation preserved; acceptance pending:** a public project list and read-only boards exist. Navigation, design and structure will be reviewed before this phase is accepted.
- The interface supports English (default), Spanish and Catalan through `next-intl`, with a cookie preference and unchanged URLs.
- Administration CRUD and the additional [product requirements](docs/product.md) are not implemented. No remote services are connected or deployments made.

## Stack and local development

Next.js 16.4.3, React 19.3.1, strict TypeScript, Tailwind CSS 4.3.3 and Supabase PostgreSQL/Auth. Use Node.js 24.x and npm 11.x; Docker is required for local Supabase.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Follow the [development guide](docs/development.md) to configure local Supabase and the administrator. Without configuration, the application shows an unavailable state and disables sign-in.

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

The next step is to review navigation, UI and structure proposals. Each implementation scope and phase transition requires the owner's confirmation.

## License

[MIT](LICENSE). Copying, modification and redistribution, including commercial use, are permitted while retaining the copyright and license notices. The code is provided without warranty. Dependencies retain their own licenses.
