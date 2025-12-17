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
  - `npm run cli:auth -- start` – start the auth HTTPS service.
  - `npm run cli:auth -- seed-users` – seed users from the configured JSON file (or `--file path/to/users.json`).

- World service:
  - `npm run cli:world -- start` – start the world HTTPS service.
  - `npm run cli:world -- seed-worlds` – seed worlds and entities from the configured JSON file (or `--file path/to/worlds.json`).

- Campaign service:
  - `npm run cli:campaign -- start` – start the campaign HTTPS service.
  - `npm run cli:campaign -- seed-campaigns` – seed campaigns, sessions, scenes, story arcs, and events from the configured JSON file (or `--file path/to/campaigns.json`).

### Seeding Data

To seed worlds or campaigns into running services, use the `snapp-seed` CLI tool. The tool automatically detects the file type:

```bash
# Seed worlds
npm run seed -- \
  --username admin \
  --password admin123 \
  --file /tmp/worlds.json

# Seed campaigns
npm run seed -- \
  --username admin \
  --password admin123 \
  --file /tmp/campaigns.json
```

**Options:**
- `--username`, `-u` (required): Username for authentication
- `--password`, `-p` (required): Password for authentication
- `--file`, `-f` (required): Path to worlds or campaigns JSON file (type is auto-detected)
- `--auth-url` (default: `https://localhost:3001`): Auth service URL
- `--world-url` (default: `https://localhost:3002`): World service URL
- `--campaign-url` (default: `https://localhost:3003`): Campaign service URL
- `--asset-url` (default: `https://localhost:3004`): Asset service URL

The seeding tool:
- Authenticates with the auth service to get a JWT token
- Creates worlds and their entities via HTTP APIs
- Sets world splash images by looking up assets from the asset service
- Creates campaigns, sessions, scenes, players, and story arcs via HTTP APIs
- Handles existing data gracefully (idempotent - can run multiple times)
- Provides clear progress logging

**Note:** Services no longer automatically seed data on startup. Use the seeding CLI tool to populate data after services are running.

### Seeding Multiple Worlds and Campaigns

To seed all worlds and campaigns from a folder containing multiple subfolders (each with `worlds.json` and/or `campaigns.json` files), use the `seedAll` command:

```bash
# Seed all worlds and campaigns from subfolders
npm run seedAll -- \
  --username admin \
  --password admin123 \
  --folder ./seeds
```

The `seedAll` command:
- Scans the specified folder for subdirectories
- Processes each subdirectory, looking for `worlds.json` and `campaigns.json` files
- Seeds worlds first, then campaigns in each subdirectory
- Skips missing files gracefully (e.g., if a subdirectory only has `worlds.json`)
- Authenticates once at the start for efficiency

**Options:**
- `--username`, `-u` (required): Username for authentication
- `--password`, `-p` (required): Password for authentication
- `--folder`, `-f` (required): Path to folder containing subfolders with seed files
- `--auth-url` (default: `https://localhost:3001`): Auth service URL
- `--world-url` (default: `https://localhost:3002`): World service URL
- `--campaign-url` (default: `https://localhost:3003`): Campaign service URL
- `--asset-url` (default: `https://localhost:3004`): Asset service URL

Example folder structure:
```
seeds/
  eldoria/
    worlds.json
    campaigns.json
  shadowmere/
    worlds.json
    campaigns.json
  the-wastelands/
    worlds.json
```


