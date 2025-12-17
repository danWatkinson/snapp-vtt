## ADR 0006 – Campaigns, Sessions, and Scenes Domain Model: Compliance Statement

### Summary

Overall status: **Compliant (with minor integrity checks left as future enhancements)**

The Campaign service implements Campaigns, Sessions, and Scenes as separate but related concepts, with IDs linking them together and to Worlds and World Entities. The API shape and separation from the World service match ADR 0006’s decisions.

### Evidence of compliance

- **Separate Campaign domain/service**
  - A dedicated Campaign service under `apps/services/campaign` owns Campaigns, Sessions, and Scenes.
  - The World service remains responsible only for Worlds and World Entities, with no duplication of campaign data.

- **Hierarchy and references**
  - `Session` records store a `campaignId` referencing a Campaign.
  - `Scene` records store a `sessionId` and additionally carry `worldId` and `entityIds` to reference World and World Entities.
  - Data access patterns in the service and UI treat these relationships as expected (e.g. listing sessions per campaign, scenes per session).

- **REST API shape**
  - Endpoints exist for listing/creating campaigns, sessions, and scenes (e.g. `GET/POST /campaigns`, `GET/POST /campaigns/:campaignId/sessions`, `GET/POST /sessions/:sessionId/scenes`).
  - The UI’s planning flows (campaign creation, sessions, scenes, story arcs) are implemented on top of these APIs and tested via E2E features.

### Gaps and deviations

- Referential integrity checks (e.g. rejecting a `Scene` whose `sessionId` doesn’t exist, or whose `entityIds` don’t belong to the given `worldId`) are not fully enforced yet; behaviour is mostly well‑behaved thanks to UI and seed flows.
- Richer scheduling/timeline metadata for sessions/scenes is still minimal, as expected for the current stage.

### Recommended follow‑ups

- Implement **lightweight referential integrity checks** in the Campaign service for `campaignId`, `sessionId`, `worldId`, and `entityIds`, and update ADR 0006 to reflect the stronger guarantees when they’re added.
- As story‑arc and timeline features expand, keep the **World service as the source of truth** for world/entity data and avoid denormalising large chunks into the Campaign service.
