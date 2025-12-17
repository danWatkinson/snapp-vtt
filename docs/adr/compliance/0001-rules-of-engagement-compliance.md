## ADR 0001 – Rules of Engagement for the VTT System: Compliance Statement

### Summary

Overall status: **Substantially Compliant**

The repository follows the spirit and most letter of the Rules of Engagement: ADRs are used, TypeScript and Next.js are standard, services own their state, APIs are documented and scriptable, and development is strongly test‑driven with E2E coverage. A few process aspects (e.g. always starting from a failing Gherkin scenario, consistently ending features with explicit refactoring passes) are practiced in most places but are not yet enforced mechanically.

### Evidence of compliance

- **ADRs and architectural traceability**
  - Multiple ADRs exist under `docs/adr` (0001–0007), and recent work updated them with clearer lifecycle expectations.
  - Architectural changes such as HTTPS adoption, world entities, campaigns/sessions/scenes, and UI styling are all captured as ADRs.

- **Language and UI framework**
  - All production code in `apps/services` and `apps/web` is written in TypeScript.
  - The primary UI is implemented as a Next.js app under `apps/web`.

- **APIs and services**
  - Auth, World, and Campaign services live under `apps/services/*` and expose RESTful HTTP APIs.
  - OpenAPI documents exist under `docs/api/` (e.g. for auth, world, campaign) and are kept aligned with the services.
  - CLI wrappers for services were added and wired into `package.json` scripts, matching the ADR goal of scriptable APIs.

- **Testing strategy**
  - Vitest is used across services and web lib code with 100% coverage enforced (with clearly documented exclusions for seeders/CLI shims).
  - API tests exist for services (e.g. `app.test.ts` files under each service).
  - E2E tests for UI flows are all written in Gherkin `.feature` files plus Playwright‑BDD step definitions, with legacy `.spec.ts` tests archived.

- **Development workflow**
  - The current E2E suite (`npm run test:e2e`) exercises the full stack over HTTPS, reflecting an outside‑in mindset.
  - Refactoring has been performed explicitly after adding features (e.g. consolidation of common E2E steps, extraction of shared helpers).

### Gaps and deviations

- The “always start with a failing Gherkin E2E test” rule is a **strong guideline** but is not enforced by tooling or CI.
- The “finish with a refactoring pass” practice is followed in many changes but is not explicitly recorded as a checklist item on PRs.

### Recommended follow‑ups

- Consider adding a lightweight **PR checklist** (or template) that explicitly calls out:
  - Has a Gherkin E2E test been added/updated for user‑visible changes?
  - Has a refactoring/cleanup pass been performed where appropriate?
- Optionally add a **CI lint/check** that warns when new UI code is merged without corresponding `.feature`/step changes.
