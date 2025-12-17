## 0002 – Tech Stack and Testing Strategy

- **Status**: Accepted  
- **Date**: 2025-12-15  
  _For ADR lifecycle and conventions, see ADR 0001 – Rules of Engagement for the VTT System._

### Context

The VTT system requires a cohesive, modern technology stack that:

- Uses a single language across UI and services.
- Supports a rich, deployable web UI.
- Encourages RESTful, testable API services.
- Enables strong typing and high confidence in behaviour.

The rules of engagement already require TypeScript, Next.js, RESTful services, and comprehensive testing including E2E tests written in Gherkin.

### Decision

- **Language**
  - Use **TypeScript** for all production and test code wherever possible.

- **UI**
  - Use **Next.js** as the primary UI framework.
  - All UI behaviour that is visible to users must be covered by **E2E tests** written in **Gherkin** and executed by an automated test runner.

- **Backend services**
  - Implement backend HTTP services as **RESTful APIs**.
  - Each domain service is responsible for its own persistence and data store.
  - The external HTTP contracts for each service MUST be documented in OpenAPI (or a compatible) format under `docs/api/` and kept in sync with the implementations.

- **Testing**
  - Use a modern JavaScript/TypeScript test runner (e.g. Vitest or similar) and browser automation tool (e.g. Playwright) to support the following layers:

    | Layer  | Tools                            | Location (examples)                                      | Requirements                            |
    |--------|----------------------------------|----------------------------------------------------------|-----------------------------------------|
    | Unit   | Vitest                          | `apps/services/**/*.test.ts`, `apps/web/lib/**/*.test.tsx` | **100% coverage** (lines/branches/etc.) |
    | API    | Vitest + `supertest` (or similar) | `apps/services/**/app.test.ts`                          | Exercise REST endpoints via HTTP        |
    | E2E    | Playwright + `playwright-bdd`   | `apps/web/tests/e2e/*.feature` + `steps/*.ts`           | UI flows defined in **Gherkin**         |

  - All user-visible UI behaviour MUST be covered by **E2E tests defined in Gherkin** feature files and executed by the browser automation tool.
  - New UI flows SHOULD NOT introduce ad-hoc Playwright `.spec.ts` tests; instead they MUST be expressed as Gherkin scenarios plus step definitions.

### Consequences

- A single language (TypeScript) across the stack reduces cognitive load and simplifies sharing of types and domain models.
- Next.js offers a productive environment for building and deploying modern UIs, but constrains some architectural choices to its conventions.
- RESTful domain services with per-service data stores promote clear ownership and autonomy, but require careful design of cross-service contracts.
- Committing to 100% unit test coverage and E2E Gherkin tests increases initial development effort, but provides strong regression protection and supports aggressive refactoring.

