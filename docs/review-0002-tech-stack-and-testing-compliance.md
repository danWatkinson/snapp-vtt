## Review of 0002 – Tech Stack and High-Level Testing Approach Compliance

**Date**: 2025-12-17  
**Scope**: Codebase at `main` compared against `docs/adr/0002-tech-stack-and-testing.md`.

### 1. Language

- **Rule**: Use **TypeScript** for all production and test code wherever possible.
- **Status**: Compliant
- **Evidence**:
  - All production code under `apps/services/**`, `apps/web/**`, and `packages/**` is written in TypeScript (`.ts`, `.tsx`).
  - All test code (`.test.ts`, `.test.tsx`, `.spec.ts`) is written in TypeScript.
  - `tsconfig.json` enforces strict TypeScript settings (`strict: true`, `allowJs: false`).
  - Non-TypeScript files are limited to configuration files (e.g. `*.config.mjs`, `*.config.js`, `postcss.config.js`, `tailwind.config.js`), which is acceptable.
- **Actions**:
  - [ ] Continue to use TypeScript for all new production and test code.

### 2. UI Framework

- **Rule**: Use **Next.js** as the primary UI framework.
- **Status**: Compliant
- **Evidence**:
  - Next.js is installed (`next: ^15.0.0` in `package.json`).
  - Next.js UI is implemented under `apps/web/app/**` using the App Router structure (`layout.tsx`, `page.tsx`, `components/**`).
  - `apps/web/next.config.mjs` configures Next.js with appropriate settings.
  - `npm run build` builds the Next.js application.
  - `npm run dev:web` starts the Next.js development server.
- **Actions**:
  - [ ] Keep the primary UI in Next.js unless a future ADR explicitly changes this.

### 3. Backend Services

#### 3.1 RESTful APIs

- **Rule**: Implement backend HTTP services as **RESTful APIs**.
- **Status**: Compliant
- **Evidence**:
  - All services (`apps/services/auth/app.ts`, `apps/services/world/app.ts`, `apps/services/campaign/app.ts`) expose RESTful endpoints:
    - Proper HTTP methods (GET, POST, PUT, PATCH, DELETE).
    - Resource-oriented URLs (e.g. `/users/:username`, `/campaigns/:campaignId/sessions`).
    - Appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500).
    - JSON request/response bodies.
  - Services follow RESTful conventions for nested resources and actions.
- **Actions**:
  - [ ] Continue to design new endpoints following RESTful principles.

#### 3.2 Service State Ownership

- **Rule**: Each domain service is responsible for its own persistence and data store.
- **Status**: Compliant
- **Evidence**:
  - Auth service: `InMemoryUserStore` manages user and role data.
  - World service: `InMemoryWorldStore` and `InMemoryWorldEntityStore` manage world and entity data.
  - Campaign service: `InMemoryCampaignStore` manages campaign, session, scene, story arc, and timeline data.
  - Each service has its own store(s) and does not directly access other services' stores.
  - Cross-service interactions (e.g. campaign → world) go via HTTP, respecting service boundaries.
- **Actions**:
  - [ ] When adding new domains, maintain clear service boundaries and state ownership.

#### 3.3 OpenAPI Documentation

- **Rule**: The external HTTP contracts for each service MUST be documented in OpenAPI (or a compatible) format under `docs/api/` and kept in sync with the implementations.
- **Status**: Compliant
- **Evidence**:
  - OpenAPI specifications exist under `docs/api/`:
    - `auth-openapi.yaml` for the auth service.
    - `world-openapi.yaml` for the world service.
    - `campaign-openapi.yaml` for the campaign service.
  - `docs/api-overview.md` provides an overview and links to each service's API spec.
  - ADR `0002` explicitly references `docs/api/` as the location for service contracts.
- **Actions**:
  - [ ] Keep OpenAPI specs in sync with implementation changes (update specs when adding/changing endpoints).

### 4. Testing Strategy

#### 4.1 Unit Tests with 100% Coverage

- **Rule**: Use a modern JavaScript/TypeScript test runner (e.g. Vitest or similar) to support **unit tests** for all business logic, with **100% coverage** required.
- **Status**: Compliant
- **Evidence**:
  - Vitest is installed (`vitest: ^2.0.0` in `package.json`).
  - `vitest.config.mts` enforces 100% coverage:
    - `lines: 100`, `functions: 100`, `branches: 100`, `statements: 100`.
  - Unit tests exist throughout:
    - `apps/services/**/*.test.ts` for service business logic.
    - `apps/web/lib/**/*.test.{ts,tsx}` for UI library code.
    - `packages/**/*.test.ts` for shared packages.
  - Coverage exclusions are narrow and intentional (test files, config files, glue code like `app.ts`/`server.ts`/`cli.ts`, seeders).
  - `npm run test:unit` runs Vitest with this configuration.
- **Actions**:
  - [ ] Maintain 100% unit test coverage for all production code (excluding intentionally excluded files).
  - [ ] Keep coverage exclusions minimal and justified.

#### 4.2 API Tests

- **Rule**: Use a modern JavaScript/TypeScript test runner (e.g. Vitest or similar) to support **API tests** that exercise RESTful services via HTTP.
- **Status**: Compliant
- **Evidence**:
  - API tests are implemented using `supertest` (`supertest: ^7.0.0` in `package.json`).
  - API tests exist for all services:
    - `apps/services/auth/app.test.ts` exercises auth endpoints.
    - `apps/services/world/app.test.ts` exercises world endpoints.
    - `apps/services/campaign/app.test.ts` exercises campaign endpoints.
  - Tests exercise RESTful services via HTTP, validating observable behaviour (status codes, response bodies, error messages).
  - API tests are run as part of `npm run test:unit` (Vitest includes them).
- **Actions**:
  - [ ] Ensure new API endpoints are covered by API tests.
  - [ ] Keep API tests focused on observable behaviour, not implementation details.

#### 4.3 E2E Tests with Gherkin

- **Rule**: Use a modern browser automation tool (e.g. Playwright or similar) to execute **E2E tests** defined in **Gherkin** feature files. All UI behaviour that is visible to users must be covered by **E2E tests** written in **Gherkin**.
- **Status**: Compliant
- **Evidence**:
  - **Playwright and Gherkin tooling**:
  - Playwright is installed (`@playwright/test: ^1.49.0` in `package.json`) and configured via `playwright.config.ts` with appropriate settings (baseURL, HTTPS, test directory).
  - `playwright-bdd` is installed (`playwright-bdd: ^7.0.0`) and configured via `defineBddConfig()`:
  - Feature files: `apps/web/tests/e2e/**/*.feature`.
  - Step definitions: `apps/web/tests/e2e/steps/**/*.ts`.
  - Generated files output: `.features-gen/` (ignored by git).
  - `npm run test:e2e` runs `npm run test:e2e:generate` (Gherkin → Playwright test generation) and then executes the Playwright suite.
  - **Coverage of UI behaviour**:
  - All previously existing `.spec.ts` E2E tests have been migrated to Gherkin features with step definitions; there is now a 1:1 or better mapping from legacy specs to `.feature` files.
  - As of this review, **29 Gherkin scenarios** are passing end‑to‑end via `npm run test:e2e`, covering:
    - Auth flows: roles, password login, auth-required routes.
    - User management: list, delete, revoke role.
    - Campaigns: create, players, auto story arcs, scenes, sessions, story arcs, story-arc events, timeline, auth-protection.
    - Worlds: create, auth-protection, entities (creatures/factions), events, event timestamps, locations, “view all entities”.
  - **Step organisation**:
  - Shared steps (admin presence, admin login, navigation to core planning screens) live in:
    - `common.steps.ts` – admin seeding, login and common Given/When steps.
    - `campaigns-create.steps.ts` – campaign planning navigation and canonical campaign existence step.
    - `world-create.steps.ts` – world planning navigation and canonical world existence step.
  - Feature-specific behaviour is implemented in focused `*.steps.ts` files (e.g. `users-delete.steps.ts`, `campaigns-scenes-create.steps.ts`, `world-events-timestamps.steps.ts`) that delegate to shared helpers in `helpers.ts` where appropriate.
- **Actions**:
  - [x] Configure `playwright-bdd` in `playwright.config.ts` to enable Gherkin feature file execution.
  - [x] Implement step definitions for all existing feature files and extract common steps to `common.steps.ts` (and other shared step files) to reduce duplication.
  - [x] Migrate all legacy Playwright UI `.spec.ts` tests to Gherkin features and ensure `npm run test:e2e` passes end‑to‑end.
  - [x] Establish a pattern/process for writing new E2E tests in Gherkin first, then implementing step definitions (documented in `docs/development-workflow.md` and `docs/e2e-gherkin-migration-checklist.md`).
  - [ ] Add a CI check or documentation to ensure new UI features include Gherkin-based E2E tests and to prevent regression to ad‑hoc `.spec.ts` tests for UI flows.

---

### Summary of Outstanding Actions

- **E2E tests with Gherkin**
  - [x] Configure `playwright-bdd` in `playwright.config.ts`.
  - [x] Implement and organise step definitions for all current feature files (shared vs feature-specific steps).
  - [x] Create Gherkin feature files for all existing UI E2E flows and ensure `npm run test:e2e` passes.
  - [x] Document Gherkin testing pattern and migration status in `docs/development-workflow.md` and `docs/e2e-gherkin-migration-checklist.md`.
  - [ ] Add a CI check or documentation reminder to ensure new UI features include Gherkin-based E2E tests and to discourage adding new raw `.spec.ts` UI tests.

- **Ongoing maintenance**
  - [ ] Keep OpenAPI specs in sync with API implementation changes.
  - [ ] Maintain 100% unit test coverage (excluding intentionally excluded files).
  - [ ] Continue using TypeScript for all production and test code.
