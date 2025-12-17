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

### Service CLIs

Each backend service exposes a small CLI wrapper (implemented with `yargs`) to make orchestration, demos, and tests easier:

- Auth service:
  - `npm run cli:auth -- start` – start the auth HTTPS service (with seeding).
  - `npm run cli:auth -- seed-users` – seed users from the configured JSON file (or `--file path/to/users.json`).

- World service:
  - `npm run cli:world -- start` – start the world HTTPS service (with seeding).
  - `npm run cli:world -- seed-worlds` – seed worlds and entities from the configured JSON file (or `--file path/to/worlds.json`).

- Campaign service:
  - `npm run cli:campaign -- start` – start the campaign HTTPS service (with seeding).
  - `npm run cli:campaign -- seed-campaigns` – seed campaigns, sessions, scenes, story arcs, and events from the configured JSON file (or `--file path/to/campaigns.json`).


