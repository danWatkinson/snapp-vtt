## 0001 – Rules of Engagement for the VTT System

- **Status**: Accepted  
- **Date**: 2025-12-15

### Context

The Virtual Table Top (VTT) system is intended to be long-lived, extensible, and easy to reason about. The user wants:

- Explicit, written architectural decisions.
- Strong typing and consistency across front-end and back-end.
- High confidence in behaviour via tests, including E2E tests written in Gherkin.
- Clear service boundaries with each API managing its own state.
- A disciplined development process: starting from failing E2E tests and ending with deliberate refactoring.

Codifying these as rules of engagement provides a stable foundation for future decisions and implementation work.

### Decision

1. **Architectural Decision Records (ADRs)**
   - All significant architectural decisions must be recorded as ADRs under `docs/adr`.
   - ADRs must capture at least: Status, Date, Context, Decision, Consequences.
   - Architectural changes (not just code refactors) require updating or adding ADRs.

2. **Language and UI framework**
   - All production code (UI and services) is written in **TypeScript**.
   - The primary user interface is built with **Next.js**.

3. **APIs and services**
   - The system is composed of domain-oriented **API services**.
   - Each API service **manages its own state** and may choose the most appropriate data store for its responsibility.
   - All API services are **RESTful**, **discoverable**, and **documented** (e.g. via OpenAPI or similar).
   - API services must be wrapped with **CLIs** that provide a clean, scriptable surface (useful for orchestration, demos, and tests).

4. **Testing strategy**
   - All APIs must be wrapped with **API tests** that validate their behaviour.
   - All UIs must be covered by **E2E tests written in Gherkin** syntax, executed by an automated test runner.
   - **100% unit test coverage** is required for all production code (lines, branches, functions, statements), enforced via tooling.

5. **Development workflow**
   - For any new feature:
     - Work **starts** by writing a **failing E2E test** (in Gherkin) that clearly describes the desired user-visible behaviour and error messages.
     - Developers then drive the implementation from the outside in, adding or refining API and unit tests as needed.
   - Work **finishes** by:
     - Reviewing the affected code for opportunities to simplify in light of the new behaviour.
     - Performing targeted refactoring to keep the codebase clean, without changing observable behaviour.

### Consequences

- ADRs provide an explicit trail of architectural decisions, simplifying onboarding and future changes.
- TypeScript and Next.js establish a modern, strongly-typed foundation for UI and services.
- Service-level ownership of state encourages clear boundaries but requires mindful design of cross-service interactions.
- RESTful, documented APIs and CLI wrappers improve discoverability, testability, and automation, at the cost of some upfront investment.
- Starting with failing E2E tests enforces a user-centric perspective and encourages meaningful failure messages, but may increase initial development time.
- Ending each feature with a refactoring pass promotes long-term maintainability and adherence to clean code principles.

Implementation status and drift for each ADR are tracked in matching review documents under `docs/` (for example, `docs/review-0001-rules-of-engagement-compliance.md` for this ADR). The ADRs themselves remain the single source of truth for the intended design.

---

### ADR Lifecycle

- **New ADRs**
  - All significant architectural decisions MUST be recorded as ADRs under `docs/adr` using the naming pattern `NNNN-title.md` (e.g. `0008-new-decision.md`).
  - Each ADR MUST include at least: Status, Date, Context, Decision, Consequences.

- **Evolving decisions**
  - When a decision changes materially, prefer adding a **new ADR** that supersedes an older one rather than rewriting history.
  - When an ADR is superseded:
    - Update its **Status** to `Superseded by 000X`.
    - Add a short note at the top linking to the new ADR.
  - Minor clarifications that do not change the meaning of the decision (typos, wording improvements, expanded examples) MAY be made in-place without creating a new ADR.



