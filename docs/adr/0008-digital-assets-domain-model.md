## 0008 – Digital Assets Domain Model

- **Status**: Accepted  
- **Date**: 2025-12-17  
  _For ADR lifecycle and conventions, see ADR 0001 – Rules of Engagement for the VTT System._

### Context

As a World Builder, we want to upload and manage **digital assets** (such as images and sound files) so that we can reference them when constructing Worlds, World Entities, Campaigns, Sessions, and Scenes.

Today, Worlds, World Entities, Campaigns, Sessions, and Scenes are modeled as separate domains (see ADR 0005 – World Entities Domain Model and ADR 0006 – Campaigns, Sessions, and Scenes Domain Model). However, there is no dedicated place to:

- Store reusable media assets (e.g. background images, character portraits, ambience tracks, sound effects).
- Associate metadata (name, tags, type, ownership) with those assets.
- Reference those assets from other domains without duplicating files or tightly coupling storage concerns to each domain.

We need a **Digital Assets** domain that:

- Provides a single source of truth for uploaded assets.
- Allows assets to be referenced from other domains via IDs.
- Enforces basic constraints and invariants (file type, size, ownership).
- Can evolve independently (e.g. to support CDN hosting, thumbnails, transcoding) without forcing changes in the World or Campaign domains.

### Decision

- **Digital Asset domain/service**
  - Introduce a dedicated **Digital Asset domain/service** responsible for:
    - Accepting uploads of digital assets (initially images and audio files) from authorised users.
    - Storing metadata about each asset.
    - Providing read-only access to asset metadata and file URLs for other domains and the UI.
  - This domain is separate from the World and Campaign domains. It **owns** assets and their storage locations; other domains hold references.

- **Asset model**
  - Define a `DigitalAsset` model with at least the following fields:
    - `id`: unique identifier.
    - `ownerUserId`: the user who uploaded the asset.
    - `name`: human-friendly display name (editable).
    - `originalFileName`: original file name from the upload.
    - `mediaType`: canonical media type (e.g. `"image" | "audio"`).
    - `mimeType`: MIME type string (e.g. `"image/png"`, `"audio/mpeg"`).
    - `sizeBytes`: file size in bytes.
    - `createdAt` / `updatedAt`: timestamps.
    - `tags`: optional array of strings for searching/filtering.
    - `storageUrl` or equivalent storage reference (implementation detail; may be a URL or a storage key).

- **Supported file types (initial)**
  - The service initially accepts a constrained set of file types:
    - Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`.
    - Audio: `.mp3`, `.wav`, `.ogg`.
  - The service enforces:
    - A maximum file size per asset (exact limit to be defined in implementation and documented in API/UI).
    - Validation of file type against an allowlist based on MIME type and/or extension.

- **Service responsibilities and boundaries**
  - The **Digital Asset service**:
    - Owns `DigitalAsset` records and their storage references.
    - Provides APIs for upload, listing, and retrieval of metadata.
    - Does **not** interpret domain-specific meaning of assets (e.g. "this is a campaign background image"); that is left to the consuming domains.
  - Other domains (World, Campaign, etc.):
    - Store **only asset IDs** when they need to reference media.
    - Use the Digital Asset service (directly or via a client) to resolve metadata and URLs at runtime.

- **API shape (initial)**
  - Assets:
    - `POST /assets`
      - Authenticated endpoint for authorised roles (e.g. `gm`).
      - Accepts multipart/form-data upload of a single file, plus optional metadata (e.g. `name`, `tags`).
      - Validates file type and size; returns `201 Created` with the created `DigitalAsset` representation.
    - `GET /assets`
      - Lists assets visible to the current user (initially, assets they own; future ADRs may relax or extend this visibility model).
      - Supports basic filtering (e.g. by `mediaType`, `name` fragment, `tags`).
    - `GET /assets/:assetId`
      - Returns metadata for a single asset, including a URL or reference used by the UI to load the actual media.

- **Referencing assets from other domains**
  - **World / Campaign / Scene models do not embed asset binaries.**
  - Where they need to reference media, they store **foreign keys** such as:
    - `imageAssetId` for a World background image or World Entity portrait.
    - `audioAssetId` for a Scene ambience or sound effect.
  - UI components resolve these IDs via the Digital Asset service and use the returned metadata/URLs to render media.

- **Authorisation and ownership**
  - Upload and management of assets is restricted to authenticated users with appropriate roles (e.g. `gm`).
  - Ownership invariants:
    - `DigitalAsset.ownerUserId` MUST match the authenticated user at upload time.
    - The initial implementation MAY restrict listing to assets owned by the current user.
  - Future ADRs can extend this to shared libraries, campaign/world-level asset libraries, or per-role visibility.

### Consequences

- **Separation of concerns**
  - Media storage and lifecycle concerns are centralised in the Digital Asset domain, keeping the World and Campaign domains focused on game structure and narrative.
  - Other domains remain agnostic of how and where files are stored (local disk, object storage, CDN), relying only on IDs and URLs.

- **Reusability and consistency**
  - The same asset can be referenced by multiple Worlds, World Entities, Campaigns, Sessions, and Scenes without duplication.
  - Validation rules (file types, size limits) are defined once in the Digital Asset service and reused across the system.

- **Complexity and dependencies**
  - Introducing a new service adds operational and implementation complexity (deployment, storage configuration, permission model).
  - UI flows that show Scenes, Worlds, or Entities with media will need to orchestrate calls to the Digital Asset service to resolve asset IDs.

- **Future evolution**
  - The Digital Asset service can evolve to support:
    - Thumbnails, previews, or transcoded variants.
    - CDN-backed delivery and caching.
    - Quotas per user or per campaign/world.
  - If asset access needs to be restricted (e.g. private vs public assets), additional authorisation rules and signing mechanisms for URLs can be introduced in follow-up ADRs.
