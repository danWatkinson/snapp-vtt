## Snapp Virtual Table Top – Rules of Engagement

This repository will contain a Virtual Table Top (VTT) system, built around explicit architectural decisions, strong typing, and disciplined, test-first development.

At this stage, the focus is on **rules of engagement** rather than concrete features. These rules are captured as Architectural Decision Records (ADRs) under `docs/adr`.

- **Architecture goals**
  - All significant architectural decisions are written up as ADRs.
  - All production code is written in **TypeScript**, front-end and back-end.
  - The primary UI is implemented in **Next.js**.
  - Backend services are **RESTful**, discoverable, and documented.
  - Each API service owns and manages its own state and data store.
  - All APIs and UIs are covered by automated tests (unit, API, E2E).

- **Testing & quality goals**
  - 100% **unit test coverage** for all production code.
  - All UIs are wrapped with **E2E tests** written in **Gherkin** syntax.
  - Feature work **starts** with a **failing E2E test** that describes the desired behaviour.
  - Feature work **finishes** with a deliberate **refactoring pass** to simplify and clean up the codebase.

Refer to the ADRs for the full rationale and details behind these rules. As features are introduced, new ADRs will be added or existing ones updated.


