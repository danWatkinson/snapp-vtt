## ADR 0004 – HTTPS-Only Transport Security: Compliance Statement

### Summary

Overall status: **Compliant (development), with clear direction for higher environments**

Local development and E2E testing are fully aligned with ADR 0004: all services run over HTTPS using shared self‑signed certificates, the UI and tests talk to `https://localhost:*` endpoints, and certificate locations and overrides are documented. Staging/production topologies are not yet fully specified in code, but ADR 0004 already anticipates an edge‑terminated HTTPS model.

### Evidence of compliance

- **HTTPS in local development**
  - Auth, World, and Campaign services start via HTTPS using Node’s `https.createServer` wrappers in their respective `server.ts` files.
  - The Next.js app is run behind an HTTPS server for local dev.

- **Certificates and configuration**
  - Default local certificate/key paths (in the sibling `Snapp-other` repo) are respected by services.
  - `docs/development-workflow.md` documents default cert paths and environment variable overrides (`HTTPS_CERT_DIR`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`).

- **Frontend-service communication**
  - Frontend clients use `https://` URLs (via `NEXT_PUBLIC_*_SERVICE_URL` env vars) when calling auth/world/campaign services.
  - CORS is configured appropriately for HTTPS origins.

- **E2E tests over HTTPS**
  - Playwright config uses `https://localhost:3000` as `baseURL` and `ignoreHTTPSErrors: true` to accommodate self‑signed certs.
  - All Gherkin E2E tests exercise the system end‑to‑end over HTTPS.

### Gaps and deviations

- Staging/production deployment topology is not yet fully implemented in this repo (e.g. no explicit manifests or infra code), so some ADR 0004 production considerations remain aspirational.
- Additional tools (beyond Playwright) are not yet configured, but none currently violate the HTTPS requirement.

### Recommended follow‑ups

- When a staging/production deployment target is chosen, create a follow‑up ADR to **lock in the TLS topology** (per‑service HTTPS vs edge‑terminated HTTPS) and document any internal HTTP hops.
- Ensure any future test runners or tools that talk to localhost services are also configured to trust dev certs or use `ignoreHTTPSErrors` when appropriate.
