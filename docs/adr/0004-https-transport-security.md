## 0004 – HTTPS-Only Transport Security

- **Status**: Accepted  
- **Date**: 2025-12-15  
  _For ADR lifecycle and conventions, see ADR 0001 – Rules of Engagement for the VTT System._

### Context

As a Security Engineer, we want to avoid any communication over raw HTTP so that all communication is secure. This applies to both production deployments and local development environments.

The system consists of:
- A Next.js web UI
- Multiple RESTful API services (auth, world, and future domain services)
- E2E tests that exercise the full stack

All of these components need to communicate securely, and we want to ensure that even in local development, we're using encrypted transport to match production security expectations.

### Decision

- **All services run HTTPS directly (development topology)**
  - In local development, the Next.js dev server runs over HTTPS (wrapped in a custom HTTPS server using Node's `https` module).
  - In local development, all API services (auth, world, etc.) run over HTTPS using Express wrapped in Node's `https.createServer()`.
  - No HTTP servers are exposed externally in local development; all communication is encrypted.

- **Frontend-to-service communication**
  - The frontend makes direct HTTPS calls to service endpoints (e.g. `https://localhost:3001/auth/login`, `https://localhost:3002/worlds`).
  - Service URLs are configurable via environment variables (`NEXT_PUBLIC_AUTH_SERVICE_URL`, `NEXT_PUBLIC_WORLD_SERVICE_URL`) to support different environments.
  - CORS is configured on all services to allow requests from the HTTPS web UI origin.

- **Local development certificates**
  - Local development uses self-signed certificates stored in a shared location (configurable via `HTTPS_CERT_DIR`, `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH`).
  - Default location: `../Snapp-other/certs/localhost-key.pem` and `localhost-cert.pem`.
  - E2E tests are configured with `ignoreHTTPSErrors: true` to accept self-signed certs.

### Environments

- **Local development**
  - All services run HTTPS directly as described above, using self-signed certificates from a shared location.
  - E2E tests (`npm run test:e2e`) target `https://localhost:3000` and are configured to accept these self-signed certificates.

- **Staging / Production**
  - External clients MUST always communicate with the system over HTTPS.
  - It is acceptable for TLS to terminate at an edge proxy / load balancer, with HTTP between the edge and backend services, provided:
    - No raw HTTP endpoints are exposed publicly.
    - The edge is configured to enforce HTTPS and redirect or reject plain HTTP.
  - The exact production TLS topology (per-service HTTPS vs edge-terminated HTTPS) will be captured in a future ADR once deployment infrastructure is fixed.

### Service ports (development defaults)

- Web UI: `https://localhost:3000` (configurable via `WEB_PORT`).
- Auth service: `https://localhost:3001` (configurable via `AUTH_PORT`).
- World service: `https://localhost:3002` (configurable via `WORLD_PORT`).
- Campaign service: `https://localhost:3003` (configurable via `CAMPAIGN_PORT`).
- Assets service: `https://localhost:3004` (configurable via `ASSET_PORT`).

### Consequences

- **Security benefits**
  - All communication is encrypted, even in local development, matching production security posture.
  - No risk of accidentally exposing HTTP endpoints that could be intercepted.
  - Forces developers to think about HTTPS configuration and certificate management from day one.

- **Development complexity**
  - Requires managing certificates for local development (though this is a one-time setup).
  - Self-signed certs require browser/E2E test configuration to accept them.
  - Slightly more complex service startup code (wrapping Express/Next.js in HTTPS servers).

- **Operational considerations**
  - Production deployments will need proper certificate management (e.g. Let's Encrypt, platform-managed certs).
  - Service discovery and routing in production may need to account for HTTPS endpoints.
  - Environment-specific configuration (dev vs staging vs prod) must handle certificate paths and service URLs appropriately.

- **Testing**
  - E2E tests must be configured to accept self-signed certificates.
  - All test scenarios run over HTTPS, providing confidence that HTTPS-related issues will be caught early.

