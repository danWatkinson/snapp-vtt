## Review of 0001 – Rules of Engagement Compliance

**Date**: 2025-12-17  
**Scope**: Codebase at `main` compared against `docs/adr/0001-rules-of-engagement.md`.

### 1. ADRs

- **Rule**: All significant architectural decisions are recorded as ADRs under `docs/adr` with Status/Date/Context/Decision/Consequences; architectural changes require updating/adding ADRs.
- **Status**: Compliant
- **Evidence**:
  - ADRs `0001`–`0007` exist and follow the expected structure.
  - Key areas (tech stack, auth/roles, HTTPS, world entities, campaigns/sessions/scenes, no-inline-styles) are covered.
- **Actions**:
  - [ ] Continue to add/update ADRs whenever architectural changes are made.

### 2. Language and UI Framework

- **Rule**: All production code (UI and services) is TypeScript; primary UI is Next.js.
- **Status**: Compliant
- **Evidence**:
  - Production and test code is `.ts` / `.tsx` throughout `apps/services/**`, `apps/web/**`, and `packages/**`.
  - Next.js is used for the UI (`apps/web/app/**`, `next.config.mjs`, `next` dependency in `package.json`).
  - Non-TS files are infra/config only (e.g. `*.config.*`, Tailwind/PostCSS config), which is acceptable.
- **Actions**:
  - [ ] Keep new production code in TypeScript/TSX.
  - [ ] Keep the primary UI in Next.js unless a future ADR explicitly changes this.

### 3. APIs and Services

#### 3.1 Domain-Oriented Services and State Ownership

- **Rule**: System is composed of domain-oriented API services; each service manages its own state and may choose its own data store.
- **Status**: Compliant
- **Evidence**:
  - `apps/services/auth`: user and auth/role management (`AuthService`, `InMemoryUserStore`).
  - `apps/services/world`: worlds and world entities (`InMemoryWorldStore`, `InMemoryWorldEntityStore`).
  - `apps/services/campaign`: campaigns/sessions/scenes/story arcs (`InMemoryCampaignStore`).
  - Each service exposes its own Express app via `create*App` and has its own state store and HTTPS server bootstrap (`server.ts`).
  - Cross-service interactions (campaign → world) go via HTTP (e.g. `WORLD_SERVICE_URL` in `campaign/server.ts`), respecting service boundaries.
- **Actions**:
  - [ ] When adding new domains, introduce new domain services or extend existing ones in line with current boundaries.
  - [ ] Document any changes to service boundaries in new/updated ADRs.

#### 3.2 RESTful, Discoverable, and Documented APIs

- **Rule**: All API services are RESTful, discoverable, and documented (e.g. OpenAPI).
- **Status**: Compliant
- **Evidence**:
  - RESTful design:
    - Auth: routes like `/auth/login`, `/users`, `/users/:username`, `/users/:username/roles`, proper HTTP verbs and status codes.
    - Campaign: `/campaigns`, `/campaigns/:id/sessions`, `/sessions/:id/scenes`, `/campaigns/:id/story-arcs`, `/story-arcs/:id/events`, `/campaigns/:id/timeline`.
    - World: `/worlds`, `/worlds/:worldId/entities`.
  - Discoverability/docs:
    - Behaviour and responsibilities are described in ADRs and tests.
    - Canonical OpenAPI specifications now exist under `docs/api/`:
      - `auth-openapi.yaml` for the auth service.
      - `world-openapi.yaml` for the world service.
      - `campaign-openapi.yaml` for the campaign service.
    - `docs/api-overview.md` documents base URLs, responsibilities, and how to use the specs.
    - ADR `0002-tech-stack-and-testing.md` references `docs/api/` as the home for service contracts.
- **Actions**:
  - [x] Introduce OpenAPI (or similar) specifications for each service (auth, campaign, world), under `docs/api/`.
  - [x] Publish a brief README-style overview in `docs/` that links to each service’s API spec and describes base URLs and authentication.
  - [x] Update at least one relevant ADR (`0002`) to reference where the canonical API definitions live; extend other ADRs as needed alongside future architectural changes.

#### 3.3 CLI Wrappers for Services

- **Rule**: API services must be wrapped with CLIs that provide a clean, scriptable surface (for orchestration, demos, tests).
- **Status**: Compliant
- **Evidence**:
  - Each service now exposes a dedicated CLI entrypoint implemented with `yargs`:
    - Auth: `apps/services/auth/cli.ts` (`snapp-auth`).
    - World: `apps/services/world/cli.ts` (`snapp-world`).
    - Campaign: `apps/services/campaign/cli.ts` (`snapp-campaign`).
  - `package.json` defines CLI scripts:
    - `npm run cli:auth -- start` / `seed-users`.
    - `npm run cli:world -- start` / `seed-worlds`.
    - `npm run cli:campaign -- start` / `seed-campaigns`.
  - Shared seeding logic has been extracted into reusable modules:
    - `apps/services/auth/userSeeder.ts`.
    - `apps/services/world/worldSeeder.ts`.
    - `apps/services/campaign/campaignSeeder.ts`.
  - `README.md` documents how to use these CLIs under a **Service CLIs** section.
- **Actions**:
  - [x] Design a simple CLI surface per service (auth, world, campaign) using a library such as `yargs`.
  - [x] Implement commands for the most common flows:
    - [x] `snapp-auth start` / `snapp-world start` / `snapp-campaign start` (wrapping existing `server.ts` bootstraps).
    - [x] `snapp-auth seed-users`, `snapp-world seed-worlds`, `snapp-campaign seed-campaigns` (explicit seeding commands instead of only at startup).
  - [x] Wire these CLIs into `package.json` scripts and document them in `README.md`.

### 4. Testing Strategy

#### 4.1 API Tests

- **Rule**: All APIs must be wrapped with API tests that validate behaviour.
- **Status**: Compliant
- **Evidence**:
  - Service-level tests under `apps/services/**`:
    - Auth: `authService.test.ts`, `userStore.test.ts`, `app.test.ts`, `server.test.ts`.
    - Campaign: `campaignStore.test.ts`, `app.test.ts`, `server.test.ts`.
    - World: `worldStore.test.ts`, `worldEntitiesStore.test.ts`, `app.test.ts`, `server.test.ts`.
  - Tests use `supertest` to exercise Express apps via HTTP.
- **Actions**:
  - [ ] Ensure any new endpoints are covered by API tests in the corresponding service.
  - [ ] Keep tests high-level enough to validate observable behaviour, not just implementation details.

#### 4.2 UI E2E Tests in Gherkin

- **Rule**: All UIs must be covered by E2E tests written in Gherkin and executed by an automated runner.
- **Status**: Largely compliant (ongoing work item)
- **Evidence**:
  - E2E tests live under `apps/web/tests/e2e/**`.
  - Gherkin feature(s) present, e.g. `auth-roles.feature`.
  - Playwright BDD (`playwright-bdd`) is configured; `npm run test:e2e` runs `playwright test`.
  - Specs exist for key flows: auth, campaigns (creation, players, scenes, story arcs, events, timeline), world creation and entities, user management.
- **Actions**:
  - [ ] For any new user-visible UI behaviour, start by adding/updating a `.feature` file and associated `.spec.ts`.
  - [ ] Periodically review coverage to ensure all critical UI flows have at least one Gherkin-based E2E path.

#### 4.3 100% Unit Test Coverage Enforced via Tooling

- **Rule**: 100% coverage (lines, branches, functions, statements) required for all production code, enforced via tooling.
- **Status**: Compliant (configuration); ongoing enforcement via CI/dev process.
- **Evidence**:
  - `vitest.config.mts` sets:
    - `lines: 100`, `functions: 100`, `branches: 100`, `statements: 100` under `coverage`.
  - Exclusions are narrow and intentional (test files, step definitions, config files, service glue like `app.ts`/`server.ts`, `useHomePageHandlers.ts`, type-only modules).
  - `npm run test:unit` runs Vitest with this config.
- **Actions**:
  - [ ] Keep exclusions minimal and justified; avoid adding new exclusions unless necessary and documented.
  - [ ] Ensure CI runs `npm run test:unit` and fails builds if coverage drops below 100%.

### 5. Development Workflow

- **Rule**: For new features, start with a failing E2E Gherkin test; drive implementation from outside in (API + unit tests); finish with refactoring and simplification.
- **Status**: Tooling-aligned; process now reinforced with PR template and workflow documentation.
- **Evidence**:
  - Tooling supports the workflow: Gherkin + Playwright, strict unit coverage, well-structured ADRs.
  - Process reinforcement:
    - `.github/PULL_REQUEST_TEMPLATE.md` provides a checklist that aligns with the workflow (E2E-first, API/unit tests, refactoring pass, ADR updates).
    - `docs/development-workflow.md` documents the expected day-to-day practices, step-by-step process, testing commands, and exceptions.
    - Both documents reference `0001-rules-of-engagement.md` as the source of truth.
- **Actions**:
  - [x] Add a lightweight PR checklist (e.g. `PULL_REQUEST_TEMPLATE.md`) with items such as:
    - [x] "New behaviour described by a failing E2E Gherkin test added first?"
    - [x] "API and unit tests added/updated as needed?"
    - [x] "Refactoring pass completed without changing observable behaviour?"
    - [x] "Relevant ADRs added/updated for architectural changes?"
  - [x] Consider documenting the expected workflow in a short `docs/development-workflow.md` and linking to `0001-rules-of-engagement.md`.

---

### Summary of Outstanding Actions

- **API documentation and discoverability**
  - [x] Add OpenAPI (or similar) specs for auth, campaign, and world services.
  - [x] Add a short API overview document in `docs/` linking to these specs.

- **CLI wrappers for services**
  - [x] Design and implement simple service CLIs (auth, world, campaign) for start/seed and key demo/test flows.
  - [x] Document the CLIs in `README.md` and/or additional docs.

- **Workflow reinforcement (process)**
  - [x] Add a PR template / checklist aligning with `0001` (E2E-first, outside-in, refactor-last, ADR updates).
  - [x] Optionally add a `docs/development-workflow.md` capturing the expected day-to-day practices.
