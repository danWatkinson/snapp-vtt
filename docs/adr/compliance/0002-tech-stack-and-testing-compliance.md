## ADR 0002 – Tech Stack and Testing Strategy: Compliance Statement

### Summary

Overall status: **Compliant**

The current codebase closely adheres to the technology and testing stack defined by ADR 0002. TypeScript and Next.js are used consistently, services are RESTful, OpenAPI documentation exists, and the three testing layers (unit, API, E2E) are implemented with the specified tools and coverage expectations.

### Evidence of compliance

- **Language and UI**
  - All production and test code is written in TypeScript (services, web app, test harnesses).
  - The main UI is a Next.js app in `apps/web`, using standard Next/React patterns.

- **Backend services and REST APIs**
  - Auth, World, and Campaign services under `apps/services` expose RESTful endpoints.
  - HTTP contracts for services are described in OpenAPI specs under `docs/api/` (e.g. auth, world, campaign specs).
  - Services own their persistence concerns (in‑memory stores in the current implementation), in line with per‑service data store responsibility.

- **Testing layers**
  - **Unit tests**
    - Vitest is used across `apps/services` and `apps/web/lib` with coverage thresholds configured to enforce 100% coverage, with explicit exclusions for seeders/CLI.
  - **API tests**
    - Each service has API‑level tests (e.g. `app.test.ts`) that exercise endpoints via HTTP using Supertest or similar.
  - **E2E tests**
    - All UI E2E tests are defined as Gherkin `.feature` files under `apps/web/tests/e2e/` with matching step definitions.
    - Legacy `.spec.ts` Playwright tests have been migrated and archived, leaving a clean Gherkin‑first suite.
    - `playwright-bdd` is integrated with Playwright, and `npm run test:e2e` drives Gherkin‑based tests.

### Gaps and deviations

- Test coverage exclusions for certain bootstrap/CLI files are documented and intentional but technically relax the blanket "100% of everything" statement.
- There is no automated check that **every new user‑visible UI flow** has corresponding Gherkin coverage; this is currently a convention enforced by discipline and review.

### Recommended follow‑ups

- Add a short note in ADR 0002 (or a follow‑up ADR) that **bootstrap/CLI glue may be excluded** from strict coverage where the cost outweighs the benefit.
- Introduce a **CI safeguard or documentation rule** that new UI flows should always come with Gherkin `.feature` and step changes (or a justification when they do not).
