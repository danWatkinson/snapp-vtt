## 0002 – Tech Stack and High-Level Testing Approach

- **Status**: Accepted  
- **Date**: 2025-12-15

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
  - Use a modern JavaScript/TypeScript test runner (e.g. Vitest or similar) to support:
    - **Unit tests** for all business logic, with **100% coverage** required.
    - **API tests** that exercise RESTful services via HTTP.
  - Use a modern browser automation tool (e.g. Playwright or similar) to execute:
    - **E2E tests** defined in **Gherkin** feature files.

### Consequences

- A single language (TypeScript) across the stack reduces cognitive load and simplifies sharing of types and domain models.
- Next.js offers a productive environment for building and deploying modern UIs, but constrains some architectural choices to its conventions.
- RESTful domain services with per-service data stores promote clear ownership and autonomy, but require careful design of cross-service contracts.
- Committing to 100% unit test coverage and E2E Gherkin tests increases initial development effort, but provides strong regression protection and supports aggressive refactoring.


