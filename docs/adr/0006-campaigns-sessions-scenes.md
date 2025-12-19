## 0006 – Campaigns, Sessions, and Scenes Domain Model

- **Status**: Accepted  
- **Date**: 2025-12-15  
  _For ADR lifecycle and conventions, see ADR 0001 – Rules of Engagement for the VTT System._

### Context

Worlds and World Entities (Locations, Creatures, Factions, Concepts) describe *what exists* in the game universe.  
Game Masters and Players, however, experience that universe through *stories and play sessions*:

- A **Campaign** is a long-running story arc.
- A **Session** is a concrete play session (e.g. an evening of play) within a Campaign.
- A **Scene** is a focused unit of play within a Session (e.g. \"Negotiation in the Throne Room\"), which *references* World Entities but is not itself a World Entity.

We need a clear model for how Campaigns, Sessions, and Scenes relate to Worlds and their entities, and where responsibility for this domain should live.

### Decision

- **Campaign domain**
  - Introduce a dedicated **Campaign domain/service** responsible for:
    - Managing Campaigns.
    - Managing Sessions within each Campaign.
    - Managing Scenes within each Session.
  - This domain is separate from the World domain (which owns Worlds and World Entities).

- **Hierarchy**
  - **Campaign**
    - `id`
    - `name`
    - `summary`
  - **Session**
    - `id`
    - `campaignId` – foreign key to Campaign
    - `name`
    - `scheduledAt` / `playedAt` (initially optional)
  - **Scene**
    - `id`
    - `sessionId` – foreign key to Session
    - `name`
    - `summary`
    - `worldId` – the World this Scene takes place in
    - `entityIds` – array of World Entity IDs (Locations, Creatures, Factions, etc.) referenced in the Scene

  - **Referential integrity (desired invariants)**
    - `Session.campaignId` SHOULD refer to an existing Campaign.
    - `Scene.sessionId` SHOULD refer to an existing Session.
    - `Scene.worldId` and all `Scene.entityIds` SHOULD refer to existing World / World Entity records in the World service.
    - These invariants MAY initially be enforced only partially; stricter guarantees (including cross-service validation) can be introduced in a follow-up ADR as requirements tighten.

- **Service responsibilities**
  - The **World service**:
    - Owns Worlds and World Entities (as per ADR 0005).
    - Exposes APIs for querying Worlds and their entities.
  - The **Campaign service**:
    - Owns Campaigns, Sessions, and Scenes.
    - Stores references to Worlds and World Entities via IDs (`worldId`, `entityIds`).
    - Does **not** duplicate World or World Entity data.

- **API shape (initial)**
  - Campaigns:
    - `GET /worlds/:worldId/campaigns` – list campaigns for a world.
    - `POST /campaigns` – create a campaign (requires `worldId` in request body).
  - Sessions:
    - `GET /campaigns/:campaignId/sessions` – list sessions for a campaign.
    - `POST /campaigns/:campaignId/sessions` – create a session for a campaign.
  - Scenes:
    - `GET /sessions/:sessionId/scenes` – list scenes for a session.
    - `POST /sessions/:sessionId/scenes` – create a scene (including `worldId` and `entityIds`).

### Consequences

- **Separation of concerns**
  - Worlds and World Entities remain purely descriptive and reusable.
  - Campaigns, Sessions, and Scenes model the *temporal* and *narrative* structure of play.
  - Scenes reference, but do not own, Worlds and World Entities, avoiding duplication and keeping domains clean.

- **Flexibility and reuse**
  - The same World and entities can appear in multiple Campaigns, Sessions, and Scenes.
  - Scenes can accumulate play-related metadata (GM notes, initiative order, status flags) without affecting the World model.

- **Complexity**
  - Introduces an additional service/domain (Campaign service) and associated APIs.
  - Requires careful handling of references (e.g. ensuring `worldId` and `entityIds` refer to existing objects).
  - Cross-domain operations (e.g. UI showing Scene details with entity names) will require orchestrating calls between the Campaign and World services.

- **Future considerations**
  - We may introduce richer scheduling and timeline features on Sessions and Scenes (e.g. calendar integration, status tracking).
  - Scenes might evolve to support nested sub-scenes, branching paths, or templates.
  - We may add consistency checks (e.g. ensuring `entityIds` all belong to the referenced `worldId`) at the Campaign service level or via cross-service validation.


