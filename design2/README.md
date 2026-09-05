# Design round two

Five structurally different layouts, built 2026-09-05 after round one was rejected. Each board keeps the same content and the same real knots; only the skeleton changes:

- **A · The object alone** — the knot fills the viewport, text enters from the bottom.
- **B · Tape of days** — horizontal timeline, today largest on the right, gaps as breaks in the tape.
- **C · Negative** — a grid of empty days; today is the only filled cell.
- **D · Fabric** — a vertical fabric of day rows, today as its own block on top, gaps as hatched rows. **Chosen** and expanded (`Main.dc.html`, `TkaninaTelefon.dc.html`, `TkaninaNoc.dc.html`).
- **E · Machine** — the format explained step by step; the image is the last step.

Shared: Syne + Newsreader; the page takes its colors from today's palette (`TkaninaNoc` shows the same page on a dark-palette day). `build.ts` injects knots from `../src/knot.ts`. The site in `../src/site.ts` is the implementation of D.
