# ADR 0001: Next.js application with Supabase

- Status: accepted.
- Date: 2026-11-01.
- Scope: foundation and persistence integration in phases 1 and 2.

## Context

Portfolio Kanban needs public browsing and administration exclusively by its owner. Simplicity, security, maintenance and low costs are priorities. It has been decided to keep a single application without an independent backend or an additional ORM.

## Decision

Keep a single Next.js application with App Router, strict TypeScript, Tailwind and Server Components by default. The foundation was initialized manually rather than generated from Vercel's Supabase starter.

Use Supabase PostgreSQL and Auth through the official clients. `lib/supabase/` separates the browser client, per-request server client and session-free public client. `server-only` protects server data-access modules.

Organize project, column and task queries by domain. Public queries use an anonymous client without administrator cookies and with `cache: no-store`. No generic repository layer is added.

SSR sessions use cookies. The initial `proxy.ts` implementation renews and verifies sessions on `/admin` and its subroutes with `getClaims()`, forwarding cookies and no-cache headers. Pages verify the user through `getUser()` and authorize separately. Forms use Server Actions; only actions write cookies through the server client.

Version SQL migrations and database tests under `supabase/`. Keep configuration and access types alongside the code; the current SQL types reflect migrations manually and can be regenerated with the CLI.

## Alternatives considered

- Use the full Vercel starter: a manual foundation was selected to include only what the scope required.
- Add a backend or ORM: rejected because of the explicit restriction and additional complexity.

## Consequences

The structure follows Next.js conventions and Supabase SSR integration. `lib/` and the domain separation are organizational choices for this project.

New session-dependent entry points must verify permissions and, when renewal is needed, be covered by the proxy. Protecting only the visible interface is insufficient.

At the time of this decision, the board, CRUD and deployment were left for later phases. Vercel was a prospective hosting choice; no deployment or remote service connection had been made.

## Subsequent product direction

The owner has since selected administration controls on the same board used for public browsing. That experience is not implemented by this ADR, and the existing `/admin` placeholder is not a final navigation decision. Any related changes to session-refresh coverage or authorization must be proposed before implementation. See [Product requirements](../product.md).
