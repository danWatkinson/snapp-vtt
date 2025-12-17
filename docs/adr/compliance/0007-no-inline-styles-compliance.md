## ADR 0007 – Avoid Inline Styles in Web UI: Compliance Statement

### Summary

Overall status: **Largely Compliant, with a few intentional exceptions**

The web UI has been refactored to favour Tailwind utilities and `snapp-*` CSS tokens instead of inline styles for visual design. Most components now express colors, borders, and backgrounds via classes, with inline styles reserved for font hints and genuinely dynamic values, in line with ADR 0007 and its documented exceptions.

### Evidence of compliance

- **Tailwind and `snapp-*` utilities**
  - Shared layout and visual patterns (panels, headings, buttons) now use Tailwind plus custom classes like `snapp-heading`, `snapp-panel`, `snapp-primary-btn`.
  - Previously duplicated `style={{ ... }}` blocks for panels and headings have been replaced with shared classes in `globals.css`.

- **Reduced inline styles**
  - Inline styles specifying colors, borders, and backgrounds have been largely removed from components such as `Banner`, `HeaderAuth`, and the main tab views.
  - Where inline `style` remains, it is typically limited to font family hints (e.g. Cinzel) while colors and other tokens are class‑based, matching the ADR’s “allowed exceptions”.

- **PR and review practices**
  - Recent refactors and new components follow the pattern of using classes instead of raw `style={{ ... }}`.

### Gaps and deviations

- A small number of components may still contain **non‑dynamic inline styles** for decorative purposes that could, in principle, be moved into `snapp-*` utilities.
- There is no automated lint rule yet to prevent reintroduction of inline visual styles in future changes.

### Recommended follow‑ups

- Add a simple **lint/check or PR guideline** to flag new inline styles in JSX for review, with explicit reference to ADR 0007’s exceptions.
- Gradually migrate any remaining static inline styles into `globals.css` as `snapp-*` classes when touching those components.
