## API Overview

This document provides a high-level overview of the Snapp VTT backend services and points to the canonical OpenAPI specifications.

### Services and Base URLs (local development)

- **Auth service**
  - **Responsibility**: User accounts, password authentication, and role management (`admin`, `gm`, `player`).
  - **Default base URL**: `https://localhost:4400` (configurable via `AUTH_PORT` or `PORT`).
  - **OpenAPI spec**: `docs/api/auth-openapi.yaml`.

- **World service**
  - **Responsibility**: Worlds and world entities (e.g. locations, characters, items, events).
  - **Default base URL**: `https://localhost:4501` (configurable via `WORLD_PORT` or `PORT`).
  - **OpenAPI spec**: `docs/api/world-openapi.yaml`.

- **Campaign service**
  - **Responsibility**: Campaigns, sessions, scenes, players, story arcs, and campaign timelines.
  - **Default base URL**: `https://localhost:4600` (configurable via `CAMPAIGN_PORT` or `PORT`).
  - **OpenAPI spec**: `docs/api/campaign-openapi.yaml`.

### Authentication and Authorisation

- All protected endpoints described in the service OpenAPI specs use **Bearer tokens** issued by the auth service.
- Clients:
  - Obtain a token via `POST /auth/login` on the auth service.
  - Send the token in the `Authorization` header as `Bearer <token>` when calling protected endpoints on auth, world, or campaign services.

### Source of Truth

- The OpenAPI specifications under `docs/api/` are the **canonical source of truth** for the external HTTP contracts of each service.
- When adding or changing endpoints, update:
  - The relevant service implementation under `apps/services/**/app.ts`.
  - The corresponding OpenAPI file under `docs/api/`.
  - Any affected ADRs (e.g. `0002`, `0003`, `0006`) if the change is architectural in nature.
