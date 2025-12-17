## ADR 0005 – World Entities Domain Model: Compliance Statement

### Summary

Overall status: **Compliant**

The world service implements a unified `WorldEntity` model with a type discriminator and a single store, exactly as ADR 0005 describes. Storage, retrieval, and querying by `worldId` (and optionally type) are present, and the UI consumes this unified model to present different entity types.

### Evidence of compliance

- **Unified model and types**
  - `WorldEntity` is implemented with a `type` discriminator (e.g. `location`, `creature`, `faction`, `concept`, plus additional event‑like types in the current code).
  - Entities share common fields (`id`, `worldId`, `name`, `summary`, etc.).

- **Storage and retrieval**
  - A single `WorldEntityStore` (currently an in‑memory implementation) manages all entity types.
  - REST endpoints exist for listing and creating entities by `worldId` with optional type filtering (as per `GET /worlds/:worldId/entities` and `POST /worlds/:worldId/entities`).

- **UI integration**
  - The web UI uses a unified client (`worldClient.ts`) to query and render entities.
  - Different tabs/views (locations, creatures, factions, etc.) are projections over the same world entity API.

### Gaps and deviations

- The ADR’s original examples list four types; the implementation also includes **events/timeline‑related entities** and timestamp fields, which are consistent with the ADR’s intent but not yet explicitly named there.
- Referential integrity (ensuring `worldId` exists before creating entities) is not strictly enforced, though the store and usage patterns typically create entities only against known worlds.

### Recommended follow‑ups

- Update ADR 0005 (or add a follow‑up ADR) to **explicitly mention the `event` entity type** and its timestamp fields, keeping design docs in sync with implementation.
- Consider adding optional **referential integrity checks** so entity creation verifies that `worldId` refers to an existing world.
- If entity‑specific attributes grow, formalise the discriminated union pattern in the ADR.
