## 0005 – World Entities Domain Model

- **Status**: Accepted  
- **Date**: 2025-12-15

### Context

As a World Builder, we want to populate Worlds with various types of content (Locations, Creatures, Factions, Concepts) so that Game Masters and Players can experience them. These different entity types share common characteristics (they belong to a World, have names and descriptions) but may have type-specific attributes in the future.

We need to decide how to model these entities: as separate domain models with their own stores and APIs, or as a unified "World Entity" model with a type discriminator.

### Decision

- **Unified World Entity model**
  - All world content (Locations, Creatures, Factions, Concepts) is modeled as a single `WorldEntity` type with a `type` discriminator field.
  - The `WorldEntity` interface includes:
    - `id`: unique identifier
    - `worldId`: reference to the parent World
    - `type`: one of `"location" | "creature" | "faction" | "concept"`
    - `name`: display name
    - `summary`: descriptive text

- **Storage and retrieval**
  - Entities are stored in a unified `WorldEntityStore` (currently `InMemoryWorldEntityStore`).
  - Entities can be queried by `worldId` and optionally filtered by `type`.
  - The world service exposes REST endpoints:
    - `GET /worlds/:worldId/entities?type=<type>` - list entities for a world, optionally filtered by type
    - `POST /worlds/:worldId/entities` - create a new entity (type specified in request body)

- **Type-specific behavior**
  - For now, all entity types share the same structure (`name`, `summary`).
  - Future type-specific attributes can be added as optional fields on `WorldEntity` or via a discriminated union pattern.
  - The UI can present type-specific views/forms while still using the unified API.

### Consequences

- **Simplicity**
  - Single store and API surface reduces complexity compared to separate models for each entity type.
  - Consistent CRUD operations across all entity types.
  - Easier to implement cross-entity queries (e.g. "all entities in a world").

- **Flexibility**
  - Easy to add new entity types by extending the `WorldEntityType` union.
  - Type-specific attributes can be added incrementally without breaking existing code.

- **Potential limitations**
  - If entity types diverge significantly in structure or behavior, the unified model may become awkward.
  - Type-specific validation or business logic may need to be handled at the service layer rather than in the domain model.
  - Querying by type requires explicit filtering rather than leveraging separate tables/collections.

- **Future considerations**
  - If type-specific attributes become substantial, we may need to evolve to a discriminated union or separate models while maintaining the unified API surface.
  - The current simple structure (`name`, `summary`) is intentionally minimal to support rapid iteration; richer schemas can be added as requirements emerge.

