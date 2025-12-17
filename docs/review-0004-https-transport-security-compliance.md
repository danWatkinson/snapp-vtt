## Review of 0004 – HTTPS-Only Transport Security

**Date**: 2025-12-17  
**Scope**: Codebase at `main` compared against `docs/adr/0004-https-transport-security.md`.

---

### 1. All services run HTTPS directly

- **ADR rule**:
  - Next.js dev server runs over HTTPS (wrapped in Node’s `https`).
  - All API services (auth, world, campaign) run over HTTPS using `https.createServer()`.
  - No HTTP servers are exposed externally.
- **Status**: Compliant (for current dev topology)
- **Evidence**:
  - **Web UI (Next.js)**:
    - `apps/web/next-https-dev.ts`:
      - Imports `https` and wraps the Next.js request handler in `https.createServer(...)`.
      - Reads key/cert from:
        - `HTTPS_CERT_DIR` or default `../Snapp-other/certs`.
        - `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` or defaults `localhost-key.pem` / `localhost-cert.pem`.
      - Listens on `WEB_PORT` or `3000`, logging: `Web UI listening on https://localhost:<port>`.
    - Dev scripts:
      - `npm run dev:web` (via `next-https-dev.ts`) exposes the UI as `https://localhost:3000`.
  - **Auth service**:
    - `apps/services/auth/server.ts`:
      - Uses `https.createServer` with key/cert from the same `HTTPS_*` environment variables / default cert directory.
      - Listens on `AUTH_PORT` or `PORT` or `4400`, logging: `Auth service listening on https://localhost:<port>`.
      - No parallel HTTP server exists for auth.
  - **World service**:
    - `apps/services/world/server.ts`:
      - Uses `https.createServer` with certs from `HTTPS_*` variables / default cert dir.
      - Listens on `WORLD_PORT` or `PORT` or `4501`, logging: `World service listening on https://localhost:<port>`.
      - No HTTP server is started.
  - **Campaign service**:
    - `apps/services/campaign/server.ts`:
      - Uses `https.createServer` with certs from `HTTPS_*` variables / default cert dir, both in the normal and “seeding failed” paths.
      - Listens on `CAMPAIGN_PORT` or `PORT` or `4600`, logging: `Campaign service listening on https://localhost:<port>`.
  - There is no code path that exposes an unencrypted HTTP endpoint for these services; all external entry points use HTTPS.
- **Actions**:
  - [ ] When adding new services, follow the same pattern: wrap Express in `https.createServer` and avoid exposing raw HTTP listeners.

---

### 2. Frontend-to-service communication over HTTPS

- **ADR rule**:
  - Frontend makes direct HTTPS calls to service endpoints (e.g. `https://localhost:4400/auth/login`, `https://localhost:4501/worlds`).
  - Service URLs are configurable via `NEXT_PUBLIC_*` env vars.
  - CORS is configured to allow the HTTPS web UI origin.
- **Status**: Compliant
- **Evidence**:
  - **Service URLs**:
    - Auth client (`apps/web/lib/clients/authClient.ts` – from prior review):
      - `const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "https://localhost:4400";`
      - All auth API calls (`/auth/login`, `/users`, `/users/:username/roles`, etc.) use this HTTPS base URL.
    - World/campaign clients follow the same pattern (HTTPS default URLs, overridable via `NEXT_PUBLIC_*_SERVICE_URL`).
  - **CORS configuration**:
    - Auth service app (`apps/services/auth/app.ts`):
      - Uses `cors({ origin: "https://localhost:3000" })`, matching the HTTPS web UI origin.
    - World and campaign services similarly configure CORS to accept the HTTPS web UI.
  - **E2E tests**:
    - Playwright baseURL: `https://localhost:3000` in `playwright.config.ts`.
    - API calls within E2E steps (e.g. `auth-roles.steps.ts`, `common.steps.ts`) target `AUTH_SERVICE_URL` values that are HTTPS (`https://localhost:4400` or `https://localhost:3001` in dev, via env).
- **Notes / trade-offs**:
  - There are no hard-coded `http://` URLs for service calls; HTTPS is the default for both UI and APIs.
- **Actions**:
  - [ ] For non-local environments (staging/prod), ensure `NEXT_PUBLIC_*_SERVICE_URL` values point to HTTPS endpoints with valid certificates.

---

### 3. Local development certificates and configuration

- **ADR rule**:
  - Local dev uses self-signed certificates stored in a shared location (default `../Snapp-other/certs/localhost-key.pem` / `localhost-cert.pem`).
  - Paths overrideable by `HTTPS_CERT_DIR`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`.
- **Status**: Compliant
- **Evidence**:
  - All HTTPS server entry points (web, auth, world, campaign) use the same pattern:
    - Determine `certDir` from `HTTPS_CERT_DIR` or default `../Snapp-other/certs`.
    - Build `keyPath` and `certPath` from `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` or those defaults.
    - Call `fs.readFileSync(keyPath)` / `fs.readFileSync(certPath)` and pass them to `https.createServer`.
  - This enforces a single certificate source for local development and supports customising paths via environment.
- **Notes / trade-offs**:
  - The code assumes the cert files exist and will crash loudly if they do not, which is appropriate for catching misconfiguration early.
  - In production, these paths will likely be different and handled via environment/infra configuration.
- **Actions**:
  - [x] Document the expected local cert location and environment overrides in developer onboarding docs (`docs/development-workflow.md` – see “Local HTTPS and certificates” section).

---

### 4. Testing over HTTPS (including self-signed certs)

- **ADR rule**:
  - E2E tests must be configured to accept self-signed certificates; all test scenarios should run over HTTPS.
- **Status**: Compliant
- **Evidence**:
  - **Playwright configuration**:
    - `playwright.config.ts`:
      - `use: { baseURL: "https://localhost:3000", trace: "on-first-retry", ignoreHTTPSErrors: true }`.
      - `ignoreHTTPSErrors: true` ensures that self-signed local certificates do not break tests.
  - **E2E tests**:
    - All E2E flows are driven through the HTTPS web UI (`https://localhost:3000`) and APIs exposed over HTTPS.
    - The suite (`npm run test:e2e`) runs against the HTTPS dev topology:
      - Web on `https://localhost:3000`.
      - Auth/world/campaign on HTTPS ports as configured.
- **Actions**:
  - [ ] If additional test runners or tools are introduced (e.g. API-only tests using other HTTP clients), ensure they are also configured to trust dev certificates when pointing at `https://localhost:*`.

---

### 5. Service ports and configuration

- **ADR rule**:
  - Web UI: `https://localhost:3000` (configurable).
  - Auth: `https://localhost:4400` (configurable).
  - World: `https://localhost:4501` (configurable).
- **Status**: Compliant (with minor port remapping in local dev as configured)
- **Evidence**:
  - Defaults in code:
    - Web UI: `WEB_PORT ?? 3000` in `next-https-dev.ts`.
    - Auth: `AUTH_PORT ?? PORT ?? 4400` in `auth/server.ts`.
    - World: `WORLD_PORT ?? PORT ?? 4501` in `world/server.ts`.
    - Campaign: `CAMPAIGN_PORT ?? PORT ?? 4600` in `campaign/server.ts` (additional service beyond ADR’s initial list).
  - These defaults match the ADR’s intent; any deviations in local dev (e.g. using `3001` for auth via env) are handled by environment variables without breaking the HTTPS-only guarantee.
- **Actions**:
  - [ ] Keep the port allocation documented and avoid collisions as new services are added.

---

### 6. Overall assessment and recommendations

- **Overall status vs ADR 0004**: **Compliant**
  - All externally-exposed components (Next.js dev server, auth/world/campaign services) are wrapped in HTTPS servers.
  - Frontend and tests talk to services over HTTPS, with no raw HTTP endpoints in normal use.
  - Local dev uses a shared self-signed certificate setup, with environment overrides for flexibility.
  - Playwright E2E tests are configured to accept self-signed certs and run against `https://localhost:3000`.

#### Recommended follow-ups

1. **Production certificate management**  
   - As deployments mature, capture in a new ADR or ops runbook how certificates are issued/rotated (e.g. platform TLS termination vs. service-level certs).

2. **Documentation polish**  
   - Developer docs now explain:
     - The default local certificate location (`../Snapp-other/certs/localhost-key.pem` and `localhost-cert.pem`).
     - Which environment variables (`HTTPS_CERT_DIR`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`, `WEB_PORT`, `AUTH_PORT`, `WORLD_PORT`, `CAMPAIGN_PORT`) are relevant for HTTPS configuration.
   - Keep these sections up to date as topology or certificate handling evolves.

3. **Future services alignment**  
   - When adding new domain services, enforce the same HTTPS-only pattern (no ad-hoc HTTP dev servers) and update ADR 0004 if port allocations or topology change materially.

