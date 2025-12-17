## Development Workflow

This document describes the expected day-to-day development workflow for the Snapp VTT system, as codified in [0001 – Rules of Engagement](adr/0001-rules-of-engagement.md).

### Overview

The workflow follows a **test-first, outside-in, refactor-last** approach:

1. **Start** with a failing E2E test (Gherkin) that describes the desired user-visible behaviour.
2. **Drive** implementation from the outside in, adding API and unit tests as needed.
3. **Finish** with a deliberate refactoring pass to simplify and clean up the codebase.

### Step-by-Step Process

#### 1. Start with a Failing E2E Test

For any new feature or user-visible change:

- Write a **failing E2E test** in Gherkin syntax (`.feature` file) under `apps/web/tests/e2e/`.
- The test should clearly describe:
  - The desired user-visible behaviour.
  - Expected error messages (if applicable).
  - The context and steps that lead to the outcome.
- Implement step definitions in `apps/web/tests/e2e/steps/` (or reuse existing steps from `common.steps.ts`).
- Run the test to confirm it fails for the right reason: `npm run test:e2e`.

**Why?** Starting with a failing E2E test enforces a user-centric perspective and encourages meaningful failure messages. It also provides a clear, executable specification of what we're building.

**Note**: The project uses `playwright-bdd` to execute Gherkin feature files. Feature files are automatically discovered from `apps/web/tests/e2e/**/*.feature`, and step definitions from `apps/web/tests/e2e/steps/**/*.ts`. Common step definitions (e.g. admin user setup, admin login) are in `common.steps.ts` and can be imported by other step definition files.

#### 2. Drive Implementation from Outside In

With the failing E2E test in place:

- **Add or update API tests** (if new endpoints or service behaviour is needed):
  - Add tests in `apps/services/**/*.test.ts` using `supertest` to exercise REST endpoints.
  - Ensure tests validate observable behaviour, not just implementation details.
- **Add or update unit tests** (for business logic):
  - Add tests alongside the code under `apps/services/**/*.test.ts` or `apps/web/lib/**/*.test.{ts,tsx}`.
  - Maintain **100% unit test coverage** (enforced via `vitest.config.mts`).
- **Implement the feature**:
  - Make the E2E test pass.
  - Make all API and unit tests pass.
  - Keep the implementation simple and focused on passing the tests.

**Why?** Driving from the outside in ensures we build what users need, and the layered tests provide confidence that each layer works correctly.

#### 3. Finish with a Refactoring Pass

Once all tests pass:

- **Review the affected code** for opportunities to simplify:
  - Can we extract common patterns?
  - Are there clearer names or structures?
  - Can we reduce duplication?
- **Perform targeted refactoring**:
  - Refactor without changing observable behaviour (all tests should still pass).
  - Keep refactoring focused and incremental.
- **Update ADRs** (if needed):
  - If the change introduces architectural decisions or changes service boundaries, add or update an ADR under `docs/adr/`.
  - Update OpenAPI specs under `docs/api/` if API contracts changed.

**Why?** Ending with a refactoring pass promotes long-term maintainability and keeps the codebase clean and easy to reason about.

### Pull Request Checklist

When opening a pull request, use the checklist in `.github/PULL_REQUEST_TEMPLATE.md` to ensure the workflow was followed:

- [ ] E2E test first: New behaviour described by a failing E2E Gherkin test added first.
- [ ] API and unit tests: Added or updated as needed.
- [ ] Refactoring pass: Completed without changing observable behaviour.
- [ ] ADRs updated: Relevant ADRs added or updated for architectural changes.

### Testing Commands

- **Unit tests**: `npm run test:unit` (runs Vitest with 100% coverage requirement).
- **E2E tests**: `npm run test:e2e` (runs Playwright with Gherkin feature files).
- **All tests**: `npm run test` (runs both unit and E2E tests).

### Exceptions and Edge Cases

- **Bug fixes**: For fixing bugs in existing behaviour, you may start with a failing unit or API test rather than an E2E test, but consider whether an E2E test would better capture the user-visible issue.
- **Refactoring-only PRs**: For PRs that only refactor without changing behaviour, the E2E-first step may not apply, but ensure all tests still pass and consider whether the refactoring warrants an ADR update.
- **Infrastructure changes**: For changes to build tooling, CI/CD, or development environment setup, the E2E-first workflow may not apply, but ensure tests still pass and document the change appropriately.

### Related Documentation

- [0001 – Rules of Engagement](adr/0001-rules-of-engagement.md) – The foundational ADR that defines this workflow.
- [0002 – Tech Stack and High-Level Testing Approach](adr/0002-tech-stack-and-testing.md) – Details on testing tools and strategies.
- [API Overview](api-overview.md) – How to discover and use service APIs.
- [Review of 0001 Compliance](review-0001-rules-of-engagement-compliance.md) – Current compliance status against the rules of engagement.
