# ADR 0001: Avoid Inline Styles in Web UI

## Status

Accepted

## Context

The `apps/web` frontend was using a mix of Tailwind utility classes and React inline `style={{ ... }}` objects for visual styling (colors, borders, shadows, background gradients, etc.). This made it harder to:

- See at a glance where a visual decision (e.g. a specific brown/gold color) was coming from.
- Maintain a consistent look and feel across components.
- Refactor or theme the application, since magic values were scattered through JSX.

We’ve since introduced several shared UI components (`Banner`, `HeaderAuth`, `WorldTab`, `UsersTab`, `LoginDialog`, `DomainTabs`, `SessionsTab`) which initially continued this pattern.

## Decision

For the web UI, we will **avoid inline styles** in React components and instead:

- Prefer **Tailwind CSS utility classes** for layout, spacing, typography, and standard colors.
- Use a small set of **project-specific CSS utility classes and design tokens** defined in `globals.css` for:
  - Shared colors (e.g. heading, muted text, borders).
  - Reusable panel / card styles (borders, backgrounds, shadows).
  - Buttons (primary, danger) and pills.
  - Specialty elements like the header avatar background.
- Keep JSX clean by only referencing classes (Tailwind + `snapp-*` utilities), not `style={{ ... }}` objects, except for truly dynamic or computed values that cannot be expressed as classes.

Examples:

- Instead of:

```tsx
<h2 className="text-lg font-medium" style={{ fontFamily: "'Cinzel', serif", color: "#3d2817" }}>
  User Management
</h2>
```

we now use:

```tsx
<h2 className="text-lg font-medium snapp-heading" style={{ fontFamily: "'Cinzel', serif" }}>
  User Management
</h2>
```

- Instead of repeated inline panel styles:

```tsx
<section
  className="space-y-3 rounded-lg border p-4"
  style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}
>
```

we now use a shared class:

```tsx
<section className="space-y-3 rounded-lg border p-4 snapp-panel">
```

## Consequences

- **Pros**:
  - Visual tokens (colors, borders, shadows) are centralised in `globals.css`, making theme changes easier.
  - JSX is easier to scan; components read as structure + semantics rather than mixing structure and raw color values.
  - E2E tests and DevTools inspection are more consistent, since class names encode semantic meaning (e.g. `snapp-panel`, `snapp-primary-btn`).

- **Cons**:
  - Slightly more upfront work when introducing new visual patterns, as we may need to add or adjust `snapp-*` utilities.
  - Some one-off styles may still require inline `style={{ ... }}` when they are highly dynamic or not worth a named utility.

## Guidelines

- When adding or updating components in `apps/web`:
  - **First reach for Tailwind utilities** for layout, spacing, and common colors.
  - If you find yourself reusing the same `style={{ ... }}` in more than one place, promote it to a `snapp-*` class in `globals.css`.
  - Reserve inline `style` for:
    - Truly dynamic values that depend on runtime data (e.g. a gradient based on user input).
    - Temporary experimentation that will be refactored before merging.
- When reviewing PRs, treat new inline styles in JSX as a smell and prefer a class-based solution where practical.
