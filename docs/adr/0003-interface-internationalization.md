# ADR 0003: Interface internationalization with cookie preferences

- Status: accepted.
- Date: 2026-11-01.
- Scope: interface localization without changing project data or administration permissions.

## Context

The owner wants the public project to reach an international audience while supporting English, Spanish and Catalan. Introducing localization at this stage lets new interface text be translated progressively instead of requiring a large later rewrite.

The owner selected English as the default, a cookie-based language preference with existing URLs preserved, and `next-intl` as the integration library.

## Decision

Use the pinned `next-intl` dependency with per-request locale configuration, a root client provider and typed message keys. Keep English source messages and Spanish/Catalan catalogs under `messages/`. Catalogs use namespaces with string entries; missing translated entries fall back to English within their namespace.

Read only the allowlisted cookie values `en`, `es` and `ca`. Missing or unsupported values use English; browser-language headers do not override that default. No locale URL prefixes, domain routing or localization middleware are introduced.

A native language-selection form submits to a Server Action that validates the value, writes the preference cookie and revalidates the root layout. The cookie is created only after selection, lasts one year and uses a root path, `SameSite=Lax`, `HttpOnly` and `Secure` in production.

Localize interface text, accessible labels, metadata, authentication feedback and date/plural formatting. Server authentication actions return error codes that the client translates. Preserve UTC handling for date-only database values.

Do not translate owner-authored project or task content automatically. Keep Supabase authentication, administrator authorization, public queries and RLS independent of locale selection. Do not change database schemas in this iteration.

## Alternatives considered

- Locale-prefixed URLs: useful for links that specify a language, but the owner selected unchanged URLs and a cookie preference.
- Custom dictionaries without a library: possible for basic text lookup, but the owner selected `next-intl` for server/client integration, message handling and formatting.
- English-only interface with later localization: rejected in favor of introducing progressive translation now.

## Consequences

All new interface text must use message catalogs. TypeScript checks keys, and tests cover locale validation, English fallback, plural messages, dates, request isolation and cookie selection.

The locale depends on a request cookie, so pages using it render dynamically. A shared URL does not encode the language; language-specific indexing or links would need a separate routing decision.

The native selector uses the existing style provisionally. This decision does not approve a final visual design or adopt shadcn/ui.

The observed project-404 initial HTML limitation and unavailable browser hydration checks are recorded in [Validation](../validation.md#project-404-rendering-limitation). Successful localization tests do not close that pending review.

The applicability of data-protection and cookie rules still needs a pre-publication review. This record describes implementation choices and makes no legal-compliance determination. See [Future ideas](../ideas.md#data-protection-and-cookie-compliance-review).
