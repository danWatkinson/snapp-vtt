# Seeding Refactor Checklist

## Goal
Refactor seeding from automatic service startup to a standalone CLI tool that seeds data via HTTP APIs.

---

## Phase 1: Create the Seeding CLI Tool

### 1.1 Create CLI Tool Structure
- [ ] Create `apps/tools/seed-cli.ts` (or decide on location)
- [ ] Set up yargs CLI structure with command-line arguments:
  - [ ] `--username` (required)
  - [ ] `--password` (required)
  - [ ] `--auth-url` (default: https://localhost:3001)
  - [ ] `--world-url` (default: https://localhost:3002)
  - [ ] `--campaign-url` (default: https://localhost:3003)
  - [ ] `--asset-url` (default: https://localhost:3004)
  - [ ] `--worlds-file` (required)
  - [ ] `--campaigns-file` (required)
- [ ] Add script entry to `package.json` (e.g., `"seed": "ts-node apps/tools/seed-cli.ts"`)

### 1.2 Authentication Helper
- [ ] Create `authenticate()` helper function that:
  - [ ] Makes POST request to `{authUrl}/auth/login` with username/password
  - [ ] Returns JWT token
  - [ ] Handles errors gracefully
  - [ ] Supports self-signed certificates (rejectUnauthorized: false)

### 1.3 HTTP Request Helper
- [ ] Create `makeRequest()` helper function that:
  - [ ] Takes method, URL, token, body
  - [ ] Handles HTTPS with self-signed certs
  - [ ] Returns parsed JSON response
  - [ ] Handles errors with useful messages

### 1.4 Asset Lookup Helper
- [ ] Create `lookupAssetByFileName()` function that:
  - [ ] Authenticates to asset service
  - [ ] GETs `/assets` endpoint
  - [ ] Finds asset by `originalFileName`
  - [ ] Returns asset ID or undefined

### 1.5 World Seeding Logic
- [ ] Read and parse worlds JSON file
- [ ] For each world:
  - [ ] Check if world already exists (GET `/worlds` and check by name)
  - [ ] Create world via POST `/worlds` (skip if exists)
  - [ ] If `splashImageFileName` provided:
    - [ ] Look up asset ID using `lookupAssetByFileName()`
    - [ ] PATCH `/worlds/:id` to set `splashImageAssetId`
  - [ ] For each entity:
    - [ ] POST `/worlds/:id/entities` to create entity
  - [ ] Log progress (world created, entities created, etc.)

### 1.6 Campaign Seeding Logic
- [ ] Read and parse campaigns JSON file
- [ ] Get world name-to-ID mapping (GET `/worlds` from world service)
- [ ] For each campaign:
  - [ ] Check if campaign already exists (GET `/campaigns` and check by name)
  - [ ] Create campaign via POST `/campaigns` (skip if exists)
  - [ ] If `currentMoment` provided, set it (may need PATCH endpoint or handle in creation)
  - [ ] For each player:
    - [ ] POST `/campaigns/:id/players` to add player
  - [ ] For each session:
    - [ ] POST `/campaigns/:id/sessions` to create session
    - [ ] For each scene:
      - [ ] Look up world ID from world name
      - [ ] POST `/campaigns/:id/sessions/:sessionId/scenes` (or appropriate endpoint)
  - [ ] For each story arc:
    - [ ] POST `/campaigns/:id/story-arcs` to create story arc
    - [ ] For each event ID:
      - [ ] POST `/campaigns/:id/story-arcs/:arcId/events` (or appropriate endpoint)
  - [ ] Log progress

### 1.7 Error Handling & Idempotency
- [ ] Handle "already exists" errors gracefully (skip, don't fail)
- [ ] Handle missing dependencies (world not found for scene, etc.)
- [ ] Provide clear error messages with context
- [ ] Make operations idempotent (can run multiple times safely)

### 1.8 Logging & Output
- [ ] Log authentication success/failure
- [ ] Log each world/campaign creation
- [ ] Log summary at end (X worlds, Y campaigns seeded)
- [ ] Use consistent formatting (colors, indentation)

---

## Phase 2: Remove Automatic Seeding from Services

### 2.1 World Service
- [ ] Remove `seedWorlds()` call from `apps/services/world/server.ts`
- [ ] Remove `lookupAssetByFileName` function from `server.ts` (move to CLI tool)
- [ ] Remove `bootstrap()` async wrapper if it was only for seeding
- [ ] Simplify server startup to just create app and listen
- [ ] Remove `WorldSeedOptions` import if no longer needed in server.ts

### 2.2 Campaign Service
- [ ] Remove `seedCampaigns()` call from `apps/services/campaign/server.ts`
- [ ] Simplify server startup (remove `.then()` chain for seeding)
- [ ] Ensure server starts even if seeding would have failed

### 2.3 Update CLI Commands (Optional)
- [ ] Consider if `snapp-world seed-worlds` and `snapp-campaign seed-campaigns` should:
  - [ ] Be removed entirely, OR
  - [ ] Be updated to use the new HTTP-based seeding tool, OR
  - [ ] Be kept for direct store seeding (if still useful for tests)

---

## Phase 3: Update Configuration & Documentation

### 3.1 Environment Variables
- [ ] Remove `WORLD_WORLDS_FILE` from `.env` (or document it's no longer used by services)
- [ ] Remove `CAMPAIGN_CAMPAIGNS_FILE` from `.env` (or document it's no longer used by services)
- [ ] Document new seeding approach in README or docs

### 3.2 Documentation
- [ ] Update README.md with new seeding instructions
- [ ] Document the new `snapp-seed` command
- [ ] Add example usage
- [ ] Document required file formats (worlds.json, campaigns.json)

### 3.3 Package.json Scripts
- [ ] Add `"seed"` script to package.json
- [ ] Consider adding convenience scripts like:
  - [ ] `"seed:dev"` - seeds with default dev URLs
  - [ ] `"seed:local"` - seeds local services

---

## Phase 4: Testing & Validation

### 4.1 Manual Testing
- [ ] Test seeding with fresh services (no existing data)
- [ ] Test idempotency (run twice, should handle gracefully)
- [ ] Test with missing files (should error clearly)
- [ ] Test with invalid credentials (should error clearly)
- [ ] Test with missing dependencies (world not found for scene, etc.)
- [ ] Test splash image lookup and assignment
- [ ] Verify all entities, sessions, scenes, story arcs are created correctly

### 4.2 Integration Testing
- [ ] Verify services start cleanly without seed files
- [ ] Verify services are accessible after seeding
- [ ] Verify data is accessible via API after seeding
- [ ] Test with different service URLs (if applicable)

### 4.3 Edge Cases
- [ ] Test with empty JSON files
- [ ] Test with malformed JSON
- [ ] Test with missing optional fields
- [ ] Test with duplicate names (should handle gracefully)

---

## Phase 5: Cleanup

### 5.1 Code Cleanup
- [ ] Remove unused imports from server files
- [ ] Remove unused helper functions
- [ ] Review and remove any dead code related to automatic seeding

### 5.2 File Cleanup
- [ ] Consider if `worldSeeder.ts` and `campaignSeeder.ts` are still needed:
  - [ ] If CLI tool uses HTTP APIs, these might not be needed
  - [ ] OR refactor them to be used by CLI tool (but via HTTP, not direct store access)
  - [ ] OR keep them for the CLI commands that seed directly to stores

### 5.3 Documentation Cleanup
- [ ] Remove references to automatic seeding from code comments
- [ ] Update any ADRs or design docs that mention seeding approach

---

## Notes

- **Service URLs**: Default to localhost dev ports, but allow override for different environments
- **Idempotency**: Important for running multiple times - check existence before creating
- **Error Handling**: Should be clear and actionable - tell user what went wrong and how to fix
- **Progress Logging**: Helpful for large seed files - show what's being created
- **Asset Lookup**: Need to authenticate to asset service to look up splash images by filename

---

## Dependencies to Check

- [ ] Verify all required API endpoints exist:
  - [ ] POST `/worlds`
  - [ ] PATCH `/worlds/:id`
  - [ ] POST `/worlds/:id/entities`
  - [ ] POST `/campaigns`
  - [ ] POST `/campaigns/:id/sessions`
  - [ ] POST `/campaigns/:id/sessions/:sessionId/scenes` (verify exact endpoint)
  - [ ] POST `/campaigns/:id/players`
  - [ ] POST `/campaigns/:id/story-arcs`
  - [ ] POST `/campaigns/:id/story-arcs/:arcId/events` (verify exact endpoint)
  - [ ] GET `/assets` (for asset lookup)
- [ ] Check if any endpoints need to be created or modified

---

## Success Criteria

- [ ] Services start without requiring seed files
- [ ] CLI tool successfully seeds worlds and campaigns via HTTP
- [ ] Seeding is idempotent (can run multiple times)
- [ ] Clear error messages for common failure cases
- [ ] Documentation updated
- [ ] All tests pass (if applicable)
