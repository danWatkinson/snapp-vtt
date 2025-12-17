## Description

<!-- Provide a brief description of the changes in this PR. -->

## Development Workflow Checklist

This PR follows the development workflow defined in [0001 – Rules of Engagement](docs/adr/0001-rules-of-engagement.md) and documented in [Development Workflow](docs/development-workflow.md).

- [ ] **E2E test first**: New user-visible behaviour is described by a failing E2E test written in Gherkin (`.feature` file) added first.
- [ ] **API and unit tests**: API tests (for service endpoints) and unit tests (for business logic) have been added or updated as needed.
- [ ] **Refactoring pass**: A refactoring pass has been completed to simplify and clean up the codebase without changing observable behaviour.
- [ ] **ADRs updated**: Relevant ADRs have been added or updated for any architectural changes (not just code refactors).

## Testing

- [ ] All existing tests pass (`npm run test:unit && npm run test:e2e`).
- [ ] Unit test coverage remains at 100% (excluding intentionally excluded files like `app.ts`, `server.ts`, `cli.ts`, seeders).
- [ ] New E2E tests (if any) pass and demonstrate the desired user-visible behaviour.

## Documentation

- [ ] OpenAPI specifications under `docs/api/` have been updated if any API endpoints were added or changed.
- [ ] `README.md` or other relevant documentation has been updated if user-facing behaviour changed.

## Notes

<!-- Any additional context, questions, or notes for reviewers. -->
