# ADR 0004: Strict CI and security gates without deployment

- Status: accepted by the owner; implementation and hosted activation are tracked separately.
- Date: 2026-11-14.
- Scope: continuous integration, vulnerability detection, secret scanning and update proposals. No deployment or application-dependency upgrade.

## Context

The owner requested the strictest practical project pipeline, including vulnerability checks, with automatic Vercel deployments deferred. There was no GitHub Actions workflow. Application checks, local Supabase migrations, pgTAP RLS tests and public HTTP tests were already versioned.

The SQL suite assumes an empty instance, creates two fixture users and temporarily assigns its fixture administrator within a rolled-back transaction. Existing local services and owner data must never be treated as disposable. GitHub security controls also require repository settings; workflow YAML alone does not protect a branch.

The owner confirmed the proposed tools, blocking policy, documentation and SQL fixtures exclusively on a disposable CI database. This does not authorize changes to existing local/remote users or administrator authorization.

## Decision

- Use GitHub Actions on GitHub-hosted Ubuntu 24.04, Node.js 24.22.1 and npm 11.19.1, preserving the application stack and lockfile.
- Require reproducible installs without dependency lifecycle scripts, zero-warning ESLint, strict TypeScript, application tests and a production build.
- Apply migrations and run database lint, pgTAP/RLS and production HTTP tests only in a fresh runner-local Supabase instance. Refuse an existing project container. Retain the existing CLI version and verify the downloaded archive's pinned checksum.
- Audit the complete npm lockfile, including development/transitive dependencies, blocking low-or-higher advisories. Add PR Dependency Review at the same threshold.
- Analyze JavaScript/TypeScript and GitHub Actions with CodeQL security-extended. Upload results, then independently fail on every SARIF result. Missing/invalid reports or unsuccessful analysis cannot pass. No existing-alert/severity baseline is accepted.
- Scan all fetched Git history with checksum-pinned Gitleaks, redacting findings and ignoring inline allow comments. Introduce no generic exclusions, baseline or ignore file. A later narrow false-positive exception requires owner approval.
- Run security checks daily in addition to PR, main-push, merge-group and manual events. Let Dependabot propose weekly npm/Actions updates; never auto-fix, auto-merge or deploy.
- Pin actions by full SHA, use read-only token permissions by default and restrict SARIF-write permission to CodeQL. Do not persist checkout credentials, pass production secrets, use privileged PR-target execution or share dependency caches.
- Expose stable final CI/security gates that reject failure, cancellation and unexpected skips. Require them in the main-branch ruleset once hosted settings are activated.
- Record GitHub activation, known blockers and the distinction between local validation, hosted execution and security assurance in the existing development/validation guides.

## Alternatives considered

- Block only high/critical advisories: fewer interruptions, but rejected in favor of the owner's low-severity threshold across production and development dependencies.
- Rely on successful CodeQL execution or alert settings alone: rejected because successful analysis can still find vulnerabilities and account features vary. A local SARIF gate enforces the selected policy.
- Reuse local Supabase or a shared remote project: rejected because fixtures require isolation and must not affect owner users/data. No remote credentials are needed.
- Use a third-party Gitleaks action: direct checksum-verified CLI execution avoids another wrapper, licensing token and its permissions.
- Add automatic fixes or Vercel deployment now: rejected as outside scope. Dependabot proposals still require owner review.

## Consequences

Known vulnerabilities, genuine secrets, false-positive patterns, unavailable advisory services and failed uploads can block merges. This is intentional fail-closed behavior. Findings require investigation; dependency changes, security exceptions and history rewrites need separate owner approval.

Database and analysis jobs add runtime and upstream dependencies. Action/binary pins need maintenance. This setup is not hermetic: runner contents, container images and CodeQL bundles/queries remain upstream inputs. Scanners cannot prove the absence of vulnerabilities, and no license-policy enforcement is implied.

Rulesets, code scanning, dependency graph, secret scanning/push protection and notifications must be activated and verified after an authorized push. Actual hosted execution, including fork/Dependabot behavior, is necessary evidence. Local checks do not establish those settings, database CI success or product acceptance.

Existing UI acceptance and product decisions are unchanged. Vercel automation, deployment credentials and remote migrations require a separate proposal and confirmation.

## Subsequent owner-approved false-positive correction — 2026-11-14

After the initial blockers were reported, the owner authorized continuing the correction, including the exact historical false-positive exception. The root `.gitleaksignore` now contains only `9ce4e58f4a3b72e5da4fc2f76ae79472f51d82e6:docs/validation.md:generic-api-key:137`. This is ordinary validation prose, not a credential.

This amendment supersedes only the original no-ignore-file restriction for this one fingerprint. Built-in rules, full fetched-history scanning, full redaction, ignored inline allow comments and blocking failures remain unchanged. No file/rule exclusion or generic baseline is approved. Future exceptions require separate approval. Synthetic scanning confirmed that a new finding in the same file/rule/line remains blocking because its fingerprint differs.

## Subsequent owner-approved dependency override — 2026-11-14

The initial continuation authorized investigation, not a cross-major dependency change. After that compatibility choice was presented, the owner explicitly approved applying the override and documenting its reasons. This follow-up records that later decision without changing the original approval history.

The project temporarily overrides `minimatch` to exactly `11.0.1` only beneath `@typescript-eslint/typescript-estree`. The reason is `GHSA-g3hv-75wg-m249`: seven development-tooling packages were reported through one advisory, and the checked stable parser still declares `minimatch ^10.2.2`. The ordinary compatible-range fix preview made no changes. Node.js 24 supports the patched release. Direct dependency pins and unrelated minimatch consumers are preserved.

Alternatives were waiting for a compatible stable parser while keeping the audit blocking, adopting an unconfirmed prerelease, forcing broad upgrades or relaxing the vulnerability threshold. The narrow override was selected to address the known advisory without those broader changes or a severity exception.

This deliberately crosses the upstream declared major range and may introduce parser/lint regressions; local checks cannot establish all-platform or exhaustive API compatibility. A clean script-disabled install, dependency-tree inspection, lint, typecheck, all tests, build and full low-threshold audit validate the exercised paths. Hosted checks remain pending. Remove the override after an owner-reviewed stable upstream update natively supports a patched minimatch version, then regenerate the lockfile and repeat validation. Review the exact pin for future advisories rather than treating it as permanent. See the [maintenance procedure](../development.md#approved-temporary-minimatch-override) and [actual results](../validation.md#approved-minimatch-override--2026-11-14).

## Owner-authorized GitHub activation — 2026-11-15

The owner subsequently requested commits, push, a PR and GitHub Actions activation. PR #5 publishes this policy; no merge or deployment was authorized. Repository settings now restrict execution to GitHub-owned, full-SHA-pinned actions, retain read-only default workflow permissions and disable workflow-created/approved PRs. Dependabot alerts/security-update PRs are enabled; existing secret scanning/push protection remain enabled.

The active main-branch ruleset requires PRs, resolved review threads, an up-to-date branch, both aggregate gates bound to GitHub Actions and CodeQL at all alert/security thresholds. It blocks deletion/force pushes and defines no administrator bypass. This implements the originally accepted protection policy without adding an unavailable second reviewer. Default CodeQL setup stays unconfigured to avoid duplicate analysis alongside the advanced workflow. First hosted runs and default-branch scheduling are distinct from configuration activation; see the [actual status](../validation.md#github-activation-and-pr-publication--2026-11-15).

## Owner-approved test-only HTML parser — 2026-11-15

After the first hosted analyses identified ten results in HTTP-test HTML filters, the owner explicitly approved adding the proposed dependency. The project uses exactly `parse5@8.1.1` as a development dependency, with its npm-locked `entities@9.0.0` dependency, instead of hand-written tag/script/comment-removal regexes. The shared test helper inspects parsed server markup and decoded text; original response strings remain available for independent private-data and React-payload assertions. No application code imports the parser, executes parsed scripts or uses this helper as a security sanitizer.

Alternatives were maintaining a custom tokenizer or approving scanner exclusions. A maintained HTML parser was selected to address malformed/nested markup and assertion reliability without weakening the all-results CodeQL policy. The consequences are two additional development packages, ongoing dependency review and browser-compatible serialization/entity behavior in tests. Parser regressions and HTTP checks validate that interpretation; parser tests are not visual/browser verification. Full dependency audit, required gates and database-fixture restrictions remain unchanged. See the [validation evidence](../validation.md#owner-approved-test-only-html-parser--2026-11-15).

## Subsequent owner-approved production release extension

The CI and Security workflows still validate only and receive no production
secrets. A separate release workflow may publish the current protected
`main` commit after both push runs pass. Vercel's independent Git-triggered
deployment would bypass this gate, so the project uses an explicit deployment
for the checked SHA instead. Production releases check the remote migration
history; database writes require a manual dispatch and separate environment
secrets. Automatic migration was not selected: an application rollback cannot
undo database changes. See the [production release guide](../development.md#production-release-through-github-actions)
for the activation prerequisites and remaining production verification.

## Owner-approved Dependabot merge policy

The project automatically integrates single, verifiable stable patch and
minor updates proposed by Dependabot for npm and GitHub Actions. Major
updates, `0.x` updates and changes outside the recognized dependency files
need manual review. This supersedes the original decision to leave all
Dependabot merges manual.

The automation runs from `main`, requires the current base and successful
PR checks, and uses a dedicated GitHub App to merge the verified head SHA.
The App has no ruleset bypass. Its merges can trigger the ordinary `main`
push workflows and qualify for production through the existing release
criteria. See the [development guide](../development.md#dependabot-merge-automation).

## Operational references

- [Development and GitHub activation](../development.md#continuous-integration-and-security)
- [Validation evidence and known blockers](../validation.md#strict-ci-and-security-pipeline--2026-11-14)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
- [CodeQL workflow configuration](https://docs.github.com/en/code-security/reference/code-scanning/workflow-configuration-options)
- [Dependency Review](https://github.com/actions/dependency-review-action)
- [Gitleaks](https://github.com/gitleaks/gitleaks)
