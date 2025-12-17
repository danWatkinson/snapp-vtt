## Review of 0006 – Campaigns, Sessions, and Scenes Domain Model

**Date**: 2025-12-17  
**Scope**: Codebase at `main` compared against `docs/adr/0006-campaigns-sessions-scenes.md`.

---

### 1. Campaign domain and separation from World domain

- **ADR rule**:
  - Introduce a dedicated **Campaign domain/service** responsible for Campaigns, Sessions, and Scenes.
  - Keep this domain separate from the World domain, which owns Worlds and World Entities.
- **Status**: Compliant
- **Evidence**:
  - There is a distinct **campaign service** under `apps/services/campaign`:
    - Core domain model and store in `campaignStore.ts`.
    - HTTP API surface in `app.ts`.
    - HTTPS server bootstrap in `server.ts` (as per ADR 0004).
  - World domain is isolated under `apps/services/world`:
    - `worldStore.ts` and `worldEntitiesStore.ts` manage Worlds and World Entities.
    - `world/app.ts` exposes World APIs.
  - Campaign data models only **reference** worlds and entities via IDs (`worldId`, `entityIds`); they do not duplicate world/entity details.
- **Notes**:
  - This clean separation follows the ADR’s intent and supports independent evolution of world vs. narrative/play structure.

---

### 2. Hierarchy: Campaigns, Sessions, Scenes

- **ADR model**:
  - **Campaign**
    - `id`, `name`, `summary`
  - **Session**
    - `id`, `campaignId`, `name`, optional scheduling fields
  - **Scene**
    - `id`, `sessionId`, `name`, `summary`, `worldId`, `entityIds[]`
- **Status**: Compliant (with additional fields)
- **Evidence**:
  - `apps/services/campaign/campaignStore.ts`:
    - `Campaign`:
      - `id: string;`
      - `name: string;`
      - `summary: string;`
      - `playerIds: string[];`
      - `currentMoment: number;` (campaign timeline timestamp)
      - This extends the ADR model with `playerIds` and `currentMoment` but preserves the core fields.
    - `Session`:
      - `id: string;`
      - `campaignId: string;`
      - `name: string;`
      - Scheduling timestamps are not yet implemented, but `campaignId` and `name` match the ADR.
    - `Scene`:
      - `id: string;`
      - `sessionId: string;`
      - `name: string;`
      - `summary: string;`
      - `worldId: string;`
      - `entityIds: string[];`
      - Directly matches the ADR’s Scene shape, including the cross-domain references.
  - **Hierarchy enforcement in store methods**:
    - `createCampaign(name, summary)`:
      - Enforces non-empty name.
      - Ensures name uniqueness.
    - `createSession(campaignId, name)`:
      - Validates non-empty `campaignId` and `name`.
      - Currently does **not** validate that `campaignId` exists; see notes below.
    - `createScene(sessionId, name, summary, worldId, entityIds)`:
      - Validates non-empty `sessionId`, `name`, and `worldId`.
      - Does not currently check that `sessionId` references an existing session or that `worldId` / `entityIds` reference existing World/WorldEntity records.
- **Notes**:
  - The core hierarchy (Campaign → Session → Scene) is present and modelled as per the ADR.
  - Referential integrity (ensuring IDs refer to existing objects) is not yet strictly enforced in the campaign store; this is acceptable at this stage but worth tightening over time.
- **Actions**:
  - [ ] Consider adding referential checks in `createSession` and `createScene` to ensure `campaignId` and `sessionId` refer to existing Campaigns/Sessions.
  - [ ] In a future iteration, optionally validate that `worldId` and `entityIds` correspond to real Worlds/WorldEntities (see ADR 0005).

---

### 3. Service responsibilities and cross-domain references

- **ADR rule**:
  - World service:
    - Owns Worlds and World Entities and exposes their APIs.
  - Campaign service:
    - Owns Campaigns, Sessions, and Scenes.
    - Stores references to Worlds and Entities via IDs only (`worldId`, `entityIds`).
    - Does **not** duplicate World or World Entity data.
- **Status**: Compliant
- **Evidence**:
  - Campaign domain (`campaignStore.ts`):
    - Scenes store only `worldId: string` and `entityIds: string[]`; no world/entity names, summaries, or other details are duplicated.
    - StoryArcs store `eventIds: string[]` referencing world event entities, again by ID only.
  - World domain (`worldStore.ts`, `worldEntitiesStore.ts`) remains authoritative for:
    - World names/descriptions.
    - Entity names, summaries, and timestamps (for events).
  - Campaign service does not embed or cache world/entity details; any UI that needs names or summaries must combine data from both services (as reflected in the web UI and E2E tests).
- **Actions**:
  - [ ] When introducing more complex scene or story-arc views in the UI, continue to fetch world/entity details from the World service rather than denormalising them into the Campaign service.

---

### 4. API shape for campaigns, sessions, and scenes

- **ADR rule**:
  - Campaigns:
    - `GET /campaigns`, `POST /campaigns`
  - Sessions:
    - `GET /campaigns/:campaignId/sessions`
    - `POST /campaigns/:campaignId/sessions`
  - Scenes:
    - `GET /sessions/:sessionId/scenes`
    - `POST /sessions/:sessionId/scenes`
- **Status**: Compliant (with additional endpoints for players, story arcs, events, and timeline)
- **Evidence**:
  - `apps/services/campaign/app.ts`:
    - **Campaigns**:
      - `GET /campaigns` → `store.listCampaigns()`.
      - `POST /campaigns` (GM-only via `authenticate("gm")`) → `store.createCampaign(name, summary)`.
    - **Sessions**:
      - `GET /campaigns/:campaignId/sessions` → `store.listSessions(campaignId)`.
      - `POST /campaigns/:campaignId/sessions` (GM-only) → `store.createSession(campaignId, name)`.
    - **Scenes**:
      - `GET /sessions/:sessionId/scenes` → `store.listScenes(sessionId)`.
      - `POST /sessions/:sessionId/scenes` → `store.createScene(sessionId, name, summary, worldId, entityIds)`.
    - **Additional endpoints** (beyond ADR minimum):
      - Players in campaign: `GET /campaigns/:campaignId/players`, `POST /campaigns/:campaignId/players` (GM-only).
      - Story arcs: `GET /campaigns/:campaignId/story-arcs`, `POST /campaigns/:campaignId/story-arcs` (GM-only).
      - Story arc events: `GET /story-arcs/:storyArcId/events`, `POST /story-arcs/:storyArcId/events` (GM-only).
      - Timeline: `GET /campaigns/:campaignId/timeline`, `POST /campaigns/:campaignId/timeline/advance` (GM-only).
  - **E2E tests**:
    - `campaigns-create.feature`: validates campaign creation via UI and indirectly the `POST /campaigns` endpoint.
    - `campaigns-sessions-create.feature`: exercises session creation and listing for a campaign.
    - `campaigns-scenes-create.feature`: creates a session, then a scene within it that references a world and world entities.
    - `campaigns-players-add`, `campaigns-players-auto-story-arc`, `campaigns-story-arcs-add`, `campaigns-story-arcs-events-add`, `campaigns-timeline`: validate the richer API surface (players, story arcs, events, and timeline) in line with ADR extensions and future considerations.
- **Actions**:
  - [ ] Keep the OpenAPI spec for the campaign service (`docs/api/campaign-openapi.yaml`) in sync with these endpoints, including Sessions and Scenes.

---

### 5. Overall assessment and recommendations

- **Overall status vs ADR 0006**: **Compliant**
  - A dedicated campaign service exists and owns Campaigns, Sessions, Scenes (and extended concepts like players, story arcs, and timelines).
  - The data model follows the ADR’s hierarchy and uses ID-based references to Worlds and World Entities.
  - API endpoints for listing/creating campaigns, sessions, and scenes are implemented as specified.
  - E2E tests comprehensively exercise campaign/session/scene flows via the UI, confirming correct integration with World entities and auth.

#### Recommended follow-ups

1. **Referential integrity**  
   - Add optional checks in `createSession` and `createScene` to ensure referenced `campaignId` and `sessionId` exist, and consider validating `worldId`/`entityIds` against the World service for stronger invariants.

2. **Scheduling fields for sessions**  
   - When scheduling/played-at semantics become important, extend `Session` to include `scheduledAt` / `playedAt` timestamps as per the ADR, and expose them via the API.

3. **Documentation and API specs**  
   - Ensure the campaign OpenAPI spec fully reflects the Sessions and Scenes endpoints, including the relationships to `worldId` and `entityIds`, to keep ADRs, docs, and implementation aligned.

