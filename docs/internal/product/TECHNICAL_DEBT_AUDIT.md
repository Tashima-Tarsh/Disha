# DISHA Technical-Debt Audit

Audit date: 3 September 2026

This register separates the active product spine from historical and research material. “Zero debt” is treated as a maintained engineering standard, not a one-time claim.

## Verified baseline

- `web` lint passes.
- Full TypeScript checking passes.
- 101 tests across 16 test files pass.
- The Next.js production build passes.
- The production dependency audit reports zero known vulnerabilities.
- A local authenticated mission completed through the agentic mission API with a policy decision and eight evidence events.
- The authenticated command feed returned 33 registered sources, 11 lanes, 36 states and union territories, and 16 claim chains.

## Debt removed in this pass

| Area | Finding | Resolution |
| --- | --- | --- |
| Runtime | `web/lib/server/security.ts` contained a corrupted function declaration and prevented compilation | Restored the request-ID function declaration |
| Toolchain | ESLint 10 was incompatible with the installed Next.js lint integration | Aligned ESLint and `eslint-config-next` on supported stable versions |
| Framework | The web app depended on a preview Next.js build | Moved to stable Next.js 16.3.4 |
| Dependencies | The npm audit reported seven vulnerabilities | Updated direct and transitive dependencies; audit is clean |
| Server pages | Redirects were returned from inside `try` blocks, violating the lint rule and obscuring control flow | Isolated token parsing and returned JSX after authentication |
| Product navigation | The command dashboard exposed data but did not state the next accountable action | Added a source-to-action overview and review queue backed by the command-feed contract |

## Open debt and release gates

| Priority | Area | Current evidence | Required decision or work |
| --- | --- | --- | --- |
| P0 | Licensing | `LICENSE` is a placeholder and GitHub detects the repository as “Other” | Repository owner must choose and approve a licence before an open-source release |
| P0 | Production identity | Production correctly rejects development JWT mode | Configure and integration-test the intended OIDC provider before release |
| P0 | Persistent evidence | Production requires `DATABASE_URL`; local verification used the development memory ledger | Run migration, restart, and chain-integrity tests against the production PostgreSQL target |
| P1 | Multi-runtime dependency management | Python source areas contain multiple requirements files without one repository lock | Runtime ownership is now defined and the active Python core is tested in CI; next, lock the deployable Brain dependency graph |
| P1 | Runtime integration | The optional DISHA Brain client was not configured during local verification | Run the web-to-Brain audit and persistence contract in the full deployment profile |
| P1 | Container release | Docker was unavailable in the audit environment | Execute both documented Compose profiles in CI or a release runner |
| P2 | Repository scale | Most tracked files sit outside the active `web` product spine | Continue classifying active, governed-extension, research, and archive ownership; do not delete source material without review |

## Definition of done for future product work

Every change to the active spine must identify its contract, policy effect, evidence event, and regression test. A release is not “debt-free” while a P0 item above remains open.
