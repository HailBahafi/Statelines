---
"statelines": minor
---

All 101 figures are redrawn to look like the real object they name, with its recognisable parts: a camera has a lens barrel, viewfinder and shutter; a radar has a sweeping scope; a receipt prints from a printer. Each figure stands on a plate with real depth, and every state changes form as well as colour: something is delivered, lifted, opened, dropped, stuck or broken.

Success and error no longer draw a tick or a cross. The green or red tone together with that change of form carries the verdict. The `marks` option is still accepted for compatibility but has no effect, and `scene.check` / `scene.cross` are deprecated and draw nothing.

Approval no longer throws when it enters error, which used to stop every figure on the page.

The whole library is now about 70 KB gzipped (was about 30 KB); importing a few figures still bundles only those.
