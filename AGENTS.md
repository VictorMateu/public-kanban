# Agent instructions — Portfolio Kanban

## Purpose and priorities

Portfolio Kanban lets visitors explore the owner's projects, their
current progress and supporting information. Only the owner administers
the application.

Prioritize security, accessibility, simplicity, readability and
maintainability. Explain trade-offs and challenge choices when there
is a concrete problem, with reasons and alternatives.

## Required reading

Before proposing changes:

- Read this file and [README.md](README.md).
- Inspect the repository, Git status and affected code.
- Read applicable instructions in any nested AGENTS.md files.

Read additional documentation according to the task:

- [docs/product.md](docs/product.md): product requirements, boundaries and
  open decisions. Required for functional, UI, navigation and data-model changes.
- [docs/development.md](docs/development.md): setup, commands, environment,
  database and development conventions.
- [docs/validation.md](docs/validation.md): recorded checks, prerequisites
  and limitations.
- Relevant `docs/adr/` entries: decision context and consequences.
- [docs/ideas.md](docs/ideas.md): possible future work, never implementation
  authorization.

Report conflicts between instructions, documentation and implementation.
Do not silently resolve an unsettled product or architecture decision.

Add nested instructions, skills or other agent tooling only after
explaining their purpose and obtaining the owner's confirmation.

## Decision ownership

The owner decides:

- Features and implementation scope.
- Navigation and visual design.
- Architecture and security.
- Adding, replacing or upgrading dependencies.

The agent may resolve internal implementation details within confirmed
decisions and scope.

For a new feature or a significant change:

1. Present a concrete proposal with affected files, risks and validation.
2. Present reasonable alternatives when a meaningful choice exists.
3. Obtain confirmation for decisions reserved to the owner before
   implementing them.

Presenting a plan does not constitute approval. Silence is not approval.
Product requirements describe the intended product; they do not authorize
implementing every requirement in the current task.

Raise concerns about the owner's choices respectfully and explain their
practical impact. Do not silently substitute a different decision.

## Uncertainty and provisional work

When clarification is needed, continue useful independent work.

Reversible implementation details, navigation and UI may use clearly
identified provisional solutions within the approved task scope.

For each provisional decision, explain:

- What was chosen and why.
- What still needs review.
- Which files or behavior it affects.

Architecture, security and dependency decisions require confirmation;
they cannot be treated as provisional exceptions.

Choose a UI review method proportional to the change and explain it
before starting: screen outlines, visual alternatives or a provisional
working prototype.

## Scope and preservation

Implement only the requested scope.

Preserve existing work. Do not overwrite, discard, restore or broadly
refactor unrelated changes without consulting the owner.

Keep changes focused. Avoid empty directories, speculative abstractions,
artificial layers and functionality added for hypothetical future needs.

Do not advance to another phase without explicit confirmation.

Do not add public registration, multiuser collaboration, payments,
microservices, a separate backend or an additional ORM.

## Technical baseline

- Next.js App Router.
- Strict TypeScript.
- Supabase PostgreSQL and Auth.
- One administrator authorized by Supabase Auth UUID.
- Tailwind CSS.
- npm with the existing lockfile; do not mix package managers.

Changing this baseline requires the owner's confirmation.

Use Server Components by default. Add client components only when
interaction or browser APIs require them.

Keep components small and descriptive. Separate presentation, domain
logic and data access without premature abstractions.

Use typed boundaries. Avoid `any` unless its necessity is explained.

shadcn/ui is the preferred UI-library candidate. Confirm its adoption,
configuration and dependencies before installing or generating components.
Its consideration does not establish the application's visual design.

## Language and code style

Use English for repository instructions, documentation, identifiers,
comments and commit messages.

Use `next-intl` message catalogs for interface text, accessible labels,
user-facing errors and metadata. English (`en`) is the default and source
language; Spanish (`es`) and Catalan (`ca`) are supported. Missing translations
fall back to English within each namespace, allowing progressive translation.

Keep existing URLs independent of language. Read the validated language
preference from its cookie; do not add locale route prefixes or automatic
browser-language detection without confirmation. Format dates and plurals
for the selected locale, preserving UTC for date-only database values.

Project and task content remains owner-authored data, separate from interface
translations. Do not add automatic content translation or schema changes
as part of interface localization.

Conversation with the owner may remain in Spanish.

Comments should explain useful context, intent or constraints rather than
repeat the code.

Use uppercase SQL keywords and types. Use lowercase snake_case for SQL
schemas, tables, columns and functions.

## Security and data

Never include secrets, credentials or tokens in code, documentation,
logs or commits. Keep environment files ignored and .env.example free
of secret values.

Never expose service-role keys or privileged credentials to browser code.

Every write requires server-side authorization and input validation.
Enforce access rules with database permissions and RLS; hidden controls
and client-side route protection are insufficient.

Define and test access policies before enabling new public reads or writes.
Protect unpublished projects and private records across queries, metadata,
HTML, React Server Component payloads and other response paths.

Keep public data access independent of the administrator's session.

Do not create users or assign administrator permissions automatically.

Do not use simulated data as a substitute for Supabase. Explicitly scoped
test fixtures are allowed under the rules below.

## Database operations and external services

Use versioned SQL migrations. Keep applied migrations as history and
propose subsequent changes through new migrations.

After the owner confirms the schema or security change and its plan,
non-destructive local migrations and tests using identifiable temporary
data may run.

Request specific authorization before:

- Creating users, including temporary test users.
- Deleting existing data.
- Resetting the database.
- Performing destructive database operations.
- Connecting external services, deploying or applying remote migrations.

Test cleanup may delete only fixtures created by that test run, using
their specific identifiers. Preserve existing users, administrator
authorization and application data.

Inspect test prerequisites before running database suites. A test requiring
an empty database must not run against the owner's populated local instance.

Never print complete environment files or tool output containing credentials.

## Validation

After implementation, run the existing application checks:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Add meaningful tests appropriate to the behavior and risk of the change.
Avoid tests that merely repeat the implementation.

Run relevant database and HTTP integration checks when their prerequisites
are satisfied and their data operations are authorized.

For UI changes, check responsive behavior, keyboard access, semantics,
focus and relevant loading, empty, unavailable and error states.

Report actual commands, outcomes, failures and checks that could not run.
Distinguish automated assertions from browser and visual verification.
Never claim checks that were not performed.

## Documentation and decisions

Keep README.md concise: project overview, current status, essential
setup and commands, documentation links and license.

Keep operational detail in docs/development.md and verification evidence
in docs/validation.md.

Maintain:

- docs/product.md for requirements and open product decisions.
- docs/ideas.md for possibilities outside the current implementation scope.

Ideas do not become requirements without the owner's decision.
Requirements do not become current task scope without confirmation.

Propose an ADR for important architecture, security, dependency,
functional or UX decisions with lasting consequences.

Record context, alternatives, the actual decision and consequences.
Label proposals as proposals; mark decisions accepted only after the
owner confirms them.

Describe decisions as the owner's project choices, using wording such
as "It has been decided" or "The project uses". Do not invent agreements
or consensus between parties.

Preserve the historical meaning of existing ADRs. Explain later changes
through explicit updates or superseding decisions.

Update affected documentation as part of the task. Propose additional
Markdown files before creating them.

## Git workflow

The agent may create a branch for a task while preserving existing work.

Create commits or push changes only when explicitly requested.

Use English Conventional Commits with focused, separate commits where
appropriate. Do not add co-author trailers.

Before committing, inspect the staged diff and check for secrets,
environment files, generated artifacts and unrelated changes.

## Completion and acceptance

At handoff, report:

- What changed.
- What was verified and with what results.
- Limitations, provisional choices and pending decisions.
- The recommended next step within the confirmed scope.

Successful validation does not constitute product or design acceptance.

If navigation or UI decisions remain provisional, report the implementation
and validation status while keeping acceptance pending until the owner
reviews those decisions.

Do not describe a phase as accepted or complete while that review remains
outstanding.
