## Review of 0005 – World Entities Domain Model

**Date**: 2025-12-17  
**Scope**: Codebase at `main` compared against `docs/adr/0005-world-entities-domain-model.md`.

---

### 1. Unified `WorldEntity` model

- **ADR rule**:
  - All world content (Locations, Creatures, Factions, Concepts) is modelled as a single `WorldEntity` type with a `type` discriminator.
  - `WorldEntity` includes:
    - `id`
    - `worldId`
    - `type`: `"location" | "creature" | "faction" | "concept"`
    - `name`
    - `summary`
- **Status**: Compliant (with an extended type set)
- **Evidence**:
  - `apps/services/world/worldEntitiesStore.ts`:
    - `export type WorldEntityType = "location" | "creature" | "faction" | "concept" | "event";`
    - `export interface WorldEntity {`
      - `id: string;`
      - `worldId: string;`
      - `type: WorldEntityType;`
      - `name: string;`
      - `summary: string;`
      - `beginningTimestamp?: number;`
      - `endingTimestamp?: number;`
    - This matches the ADR’s unified model and adds `"event"` as an additional type, which is explicitly allowed by the ADR’s “flexibility” section.
  - The domain logic consistently uses this unified `WorldEntity` model for all world content.
- **Notes**:
  - Adding `"event"` to `WorldEntityType` is aligned with the ADR’s intent to add new entity types by extending the union.
- **Actions**:
  - [ ] Keep `WorldEntityType` and its usage in sync with any future ADR updates when new entity types are introduced.

---

### 2. Storage and retrieval in a unified store

- **ADR rule**:
  - Entities are stored in a unified `WorldEntityStore` (currently `InMemoryWorldEntityStore`).
  - Entities can be queried by `worldId` and optionally filtered by `type`.
  - REST endpoints:
    - `GET /worlds/:worldId/entities?type=<type>`
    - `POST /worlds/:worldId/entities`
- **Status**: Compliant
- **Evidence**:
  - **Store**:
    - `InMemoryWorldEntityStore` in `worldEntitiesStore.ts`:
      - Internal array `entities: WorldEntity[]`.
      - `listByWorld(worldId: string, type?: WorldEntityType)`:
        - Filters by `worldId` and, if provided, by `type`.
      - `createEntity(worldId, type, name, summary, beginningTimestamp?, endingTimestamp?)`:
        - Validates `worldId` and `name` (non-empty).
        - Creates a new `WorldEntity` with a generated `id`.
        - Conditionally sets event-specific timestamps when `type === "event"`.
  - **HTTP API**:
    - `apps/services/world/app.ts`:
      - `GET /worlds/:worldId/entities`:
        - Reads `worldId` from params and optional `type` from query.
        - Calls `entityStore.listByWorld(worldId, type)` and returns `{ entities }`.
      - `POST /worlds/:worldId/entities`:
        - Protected by `authenticate("gm")`.
        - Reads `worldId` from params and `type`, `name`, `summary`, `beginningTimestamp`, `endingTimestamp` from the body.
        - Defaults `type` to `"location"` if omitted (sensible default).
        - Calls `entityStore.createEntity(...)` and returns `{ entity }` with `201 Created` on success.
  - **E2E coverage**:
    - Features under `apps/web/tests/e2e` exercise the world entity APIs through the UI:
      - `world-entities-create.feature`: creates `creature` and `faction` entities for a world.
      - `world-events-create.feature` / `world-events-timestamps.feature`: create `event` entities and set timestamps.
      - `world-locations-create.feature`: creates `location` entities.
      - `world-view-all-entities.feature`: uses the unified “All” view, which relies on listing all entity types for a world.
- **Notes**:
  - There is currently no explicit validation that a given `worldId` exists in `InMemoryWorldStore` before creating entities; this is acceptable for current scope but worth noting if stronger referential integrity is desired later.
- **Actions**:
  - [ ] Consider adding a referential integrity check (optional) so `createEntity` (or the HTTP layer) verifies that `worldId` corresponds to an existing world before creating entities.

---

### 3. Type-specific behaviour and extensibility

- **ADR rule**:
  - For now, all types share the same structure (`name`, `summary`), but type-specific attributes may be added as optional fields or via a discriminated union.
- **Status**: Compliant
- **Evidence**:
  - The core `WorldEntity` fields are uniform across types (`id`, `worldId`, `type`, `name`, `summary`).
  - Event-specific attributes:
    - Optional `beginningTimestamp` and `endingTimestamp` are included directly on `WorldEntity` and only set when `type === "event"`.
    - `createEntity` contains explicit logic:
      - `if (type === "event") { ... set timestamps ... }`
  - This is consistent with the ADR’s suggestion to add type-specific attributes as optional fields on the unified model.
  - E2E tests validate event-specific behaviour:
    - `world-events-timestamps.feature` tests adding timestamps to events and asserts correct persistence/visibility.
- **Actions**:
  - [ ] If additional type-specific attributes become common or complex, consider evolving `WorldEntity` into a discriminated union while preserving the unified API surface.

---

### 4. Querying and “view all entities” behaviour

- **ADR rule** (from consequences):
  - The unified model should make it easy to implement cross-entity queries such as “all entities in a world”.
- **Status**: Compliant
- **Evidence**:
  - `listByWorld(worldId, type?)` supports:
    - All entities for a world when `type` is omitted.
    - Type-filtered views when `type` is specified.
  - `GET /worlds/:worldId/entities` is consumed by:
    - The UI’s type-specific tabs (Locations, Creatures, Factions, Events) via filtered calls.
    - The “All” view in `world-view-all-entities.feature`, which shows all entities or an empty message for a world.
- **Actions**:
  - [ ] If cross-entity queries need richer filtering (e.g. name search, date ranges), extend query parameters and reflect that in ADR 0005 or a follow-up.

---

### 5. Overall assessment and recommendations

- **Overall status vs ADR 0005**: **Compliant**
  - Unified `WorldEntity` model with a `type` discriminator is implemented as specified.
  - A single `InMemoryWorldEntityStore` backs all world content, providing list/create operations and optional type filtering.
  - REST endpoints for listing and creating entities (`/worlds/:worldId/entities`) exist and match the ADR’s shape.
  - Type-specific behaviour (event timestamps) is implemented via optional fields on the unified model.
  - E2E tests validate creation and viewing of locations, creatures, factions, events (with timestamps), and the “all entities” world view.

#### Recommended follow-ups

1. **Referential integrity between worlds and entities**  
   - Optionally enforce that `worldId` used when creating entities must correspond to an existing world in `InMemoryWorldStore` (and any future persistent store).

2. **Growing the type system**  
   - As new entity types or attributes appear, keep `WorldEntityType` and `WorldEntity` aligned with ADR 0005 (or extend it via a new ADR) to avoid divergence between docs and implementation.

3. **Future persistence layer**  
   - When moving from in-memory to a real data store, preserve the unified entity model and query semantics (filter by `worldId` and optional `type`), as these are core to the ADR’s intent.

