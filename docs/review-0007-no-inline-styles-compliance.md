## Review of 0007 – No Inline Styles in Web UI

**Date**: 2025-12-17  
**Scope**: `apps/web` frontend compared against `docs/adr/0007-no-inline-styles.md` (ADR 0001: Avoid Inline Styles in Web UI).

---

### 1. Overall status

- **ADR decision**:
  - Avoid inline `style={{ ... }}` in React components for visual styling (colors, borders, shadows, backgrounds, etc.).
  - Prefer Tailwind utility classes and project-specific CSS utilities (`snapp-*` classes in `globals.css`).
  - Reserve inline styles for truly dynamic values that cannot be expressed as classes (or temporary experimentation).
- **Status**: **Largely compliant**  
  - The vast majority of components use Tailwind + `snapp-*` classes with no inline visual styling.
  - A small, bounded set of components still use inline styles for static visual tokens (colors, borders, shadows, background gradients) that could be promoted to CSS utilities.

---

### 2. Evidence of compliance

- **Tailwind + `snapp-*` usage**:
  - Layout and visual styling across `apps/web/app/components/**` is primarily expressed via:
    - Tailwind classes (e.g. `flex`, `border`, `rounded-lg`, `bg-black/50`, `text-sm`, etc.).
    - Custom `snapp-*` classes for brand tokens and patterns (e.g. `snapp-panel`, `snapp-heading`, `snapp-muted`, `snapp-primary-btn`, `snapp-error-box`, `snapp-avatar-bg`).
  - Examples:
    - `Banner.tsx`:
      - Header container uses `snapp-header` and Tailwind utilities for layout and borders.
      - Subtitle uses `snapp-muted` rather than inline colors.
    - `LoginDialog.tsx`:
      - Dialog uses `snapp-panel` plus Tailwind for the modal shell.
      - Error box, inputs, and buttons use `snapp-error-box`, `snapp-error-text`, `snapp-input`, `snapp-primary-btn`, with no inline color/border styles.
    - `WorldTab`, `CampaignsTab`, and other tabs/panels rely on shared UI components (`Section`, `Heading`, `EmptyState`, `ListItem`, `TabButton`, etc.) that encapsulate styling via classes.
  - **Font family handling**:
    - As shown in the ADR’s examples, Cinzel font is applied via an inline `style={{ fontFamily: "'Cinzel', serif" }}` while color and other tokens are moved to `snapp-heading`.
    - This pattern is followed in multiple components (`Heading`, `Banner`, `LoginDialog`, `Modal` titles), aligning with the ADR’s own example.

---

### 3. Remaining inline styles (exceptions)

These are the primary places where inline styles still encode static visual tokens rather than dynamic values:

- **`Section.tsx`** (reusable panel component):
  - `variant = "styled"` applies:
    - `style={{ borderColor: '#8b6f47', backgroundColor: 'rgba(244, 232, 208, 0.6)' }}` on `<section>` / `<form>`.
  - This duplicates “panel” coloring that could live in a dedicated `snapp-panel-*` class.

- **`Modal.tsx`**:
  - `variant = "styled"` applies:
    - `dialogStyle` with `borderColor`, `backgroundColor`, `boxShadow`.
    - `titleStyle` with `fontFamily` and `color`.
  - `fontFamily` inline is consistent with the ADR example, but the color, background, and shadow could be encoded via a `snapp-modal-styled` class (with `snapp-heading` for text color).

- **`EmptyState.tsx`**:
  - `variant = "muted"` applies:
    - `style={{ color: '#5a4232' }}` on `<p>`.
  - This is a static color that could be expressed as an additional utility (`snapp-muted-strong` or similar) instead of inline.

- **`SplashScreen.tsx`**:
  - Uses inline style on the outer container:
    - `borderColor`, `backgroundImage`, `backgroundSize`, `backgroundColor` for the patterned hero.
  - Inner rotated container:
    - `style={{ transform: "rotate(-15deg" }}` (note: missing closing parenthesis, but functionally fine in the browser).
  - Title `<span>`:
    - Inline `fontFamily`, `color`, and `textShadow`.
  - This is the most decorative component and uses inline styles heavily for a specific visual design.

- **`HeaderAuth.tsx`**:
  - Avatar background element:
    - `style={{ opacity: 0.85 }}` on a `div` with `snapp-avatar-bg`.
  - Opacity here is a static visual tweak and could be moved into the CSS class.

- **`Heading.tsx`**:
  - Always applies `style={{ fontFamily: "'Cinzel', serif" }}`, optionally merged with incoming `style`.
  - This aligns with the ADR’s example (font family via style, colors via classes) and is **not** considered a violation.

Overall, **no inline styles are used for ad-hoc colors or borders in arbitrary feature components** any more; they are confined to a few shared UI components and the hero splash screen.

---

### 4. Assessment vs ADR guidelines

- **Positive alignment**:
  - Core visual tokens (colors, borders, shadows, backgrounds) for panels, errors, inputs, and primary buttons are centralised in CSS (`snapp-*` classes).
  - JSX in most components is clean and declarative, with styling expressed via class names rather than raw style objects.
  - The remaining font-related inline styles are consistent with the ADR’s own example.

- **Deviations (improvement opportunities)**:
  - Several remaining inline styles are **static design choices**, not dynamic values:
    - Panel-like styling in `Section` and `Modal` styled variants.
    - Static colors in `EmptyState`.
    - Decorative background and text styles in `SplashScreen`.
    - Fixed opacity in `HeaderAuth`’s avatar background.
  - These would benefit from being moved into:
    - Additional `snapp-*` utility classes in `globals.css` (e.g. `snapp-panel-styled`, `snapp-modal-styled`, `snapp-empty-muted-strong`, `snapp-splash-bg`, `snapp-splash-title`, `snapp-avatar-faded`).
    - Tailwind utility classes where appropriate (transform/rotate, opacity variants, shadows, etc.).

---

### 5. Recommended follow-ups

1. **Promote remaining static inline styles to `snapp-*` utilities**
   - For each of the components below, define corresponding CSS utilities and replace the inline styles:
     - `Section`:
       - Add a `snapp-panel-styled` (or similar) class capturing the current border/background styling of the `"styled"` variant and switch the component to use that class instead of `style={{ ... }}`.
     - `Modal`:
       - Create a `snapp-modal-styled` class for the current border/background/shadow.
       - Use `snapp-heading` (or a new heading variant) for the title color, leaving `fontFamily` inline if desired.
     - `EmptyState`:
       - Introduce a `snapp-muted-strong` (or similar) class for the darker muted text color used by the `"muted"` variant.
     - `HeaderAuth`:
       - Fold the avatar opacity into `snapp-avatar-bg` or a new class to avoid an inline `opacity`.

2. **Decide on treatment of highly decorative components (e.g. SplashScreen)**
   - Option A (more compliant):
     - Extract the splash background, rotation, and title styles into named CSS classes:
       - `snapp-splash-bg` (gradient, border, background color).
       - `snapp-splash-tilt` (rotation transform).
       - `snapp-splash-title` (font family, color, text shadow).
   - Option B (pragmatic exception):
     - Document SplashScreen as an intentional exception in ADR 0007 (or a follow-on note) if maintaining its design in pure CSS classes is deemed too heavy relative to its one-off nature.

3. **PR review rule of thumb**
   - Continue treating new inline `style={{ ... }}` usages as a smell during review, except for:
     - Font families where a class token is not yet defined (or would be overkill).
     - Genuinely dynamic values (e.g. user-driven gradient, runtime-computed transforms).
   - Encourage authors to add or reuse `snapp-*` utilities rather than introducing persistent inline visual tokens.

---

### 6. Conclusion

The repo is **largely compliant** with ADR 0007’s intent: styling is predominantly handled via Tailwind and centralised `snapp-*` utilities, and JSX is mostly free of inline visual styles.  

The remaining inline styles are limited to a handful of shared UI components and a decorative splash screen. Turning those last static style objects into named CSS utilities (or explicitly documenting them as exceptions) would bring the implementation to full compliance and further strengthen the design system story.

