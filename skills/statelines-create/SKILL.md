---
name: statelines-create
description: Draw a new statelines figure for a moment in an app (a screen, a flow, a status) from a short idea. Use when the user types /statelines-create <idea> or asks for a new statelines figure, an animated empty state, or a state illustration in the statelines style.
---

# statelines-create

You are drawing one new figure for the statelines library. The result is a single TypeScript file that calls `defineFigure`, plus its React export and a catalog entry.

## Before drawing

1. Name the moment, not the object. "The screen after a password reset email is sent" is a moment; "an envelope" is not.
2. Write all five states in one line each: what is at rest (`idle`), what loops (`loading`), what settles on success, what settles on error, and what is absent (`empty`). If any line is vague, ask the user.
3. Pick one pointer gesture for `idle`: lift, lean, follow, open, or pick. One, never two.

## Rules

Follow docs/RULES.md exactly. The ones agents break most often:

- Colour only through `ctx.verdict()`, `"ok"` or `"err"`. Never pick a colour.
- Read `ctx.time` only inside the `loading` branch. Use `ctx.fade()` for marks and `ctx.shake()` for errors; they sleep on their own.
- Create springs only in `setup`. If the figure has countable items, create them for the maximum and read `ctx.count(default, max, min)` in `draw`.
- If the loading state is a process with an end (uploading, sending, typing), drive it with `ctx.progress(period)` so the user's `progress` option works. Call `spring.set()` only when `!ctx.determinate`.
- No text inside the figure. Draw lines where words would be.
- Keep the drawing inside roughly ±70 world units across and 90 up, so it fits the 5:4 frame. Use `offset` to centre it.
- Reuse `sheet`, `envelope`, `person`, `parcel` and `tray` from `src/figures/shapes.ts` before inventing a new object.

## API

Read docs/ANATOMY.md for the full context and scene API. The shape of every figure:

```ts
import { defineFigure } from "../../core/define";
import { wrap } from "../../engine/math";

export const example = defineFigure({
  name: "Example",
  label: "One sentence describing the drawing",
  setup: ({ spring }) => ({ lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let lift = ctx.hover * 10;
    if (state === "loading") { lift = 10 * Math.sin(wrap(ctx.time, 1) * Math.PI); m.lift.set(lift); }
    const L = m.lift.to(lift).value;

    scene.box(0, 0, 0, 100, 80, 4);
    scene.box(shake, 0, 4 + L, 40, 40, 30, state === "loading" ? "hi" : state === "empty" ? "ghost" : ctx.verdict());
    if (state === "success") scene.check(0, 0, 34 + L, "ok", ctx.fade());
    if (state === "error") scene.cross(shake, 0, 34 + L, "err", ctx.fade());
  },
});
```

## Finish

1. Export it from its shelf's `index.ts`, add `export const Example = createComponent(figures.example);` to `src/react/index.ts`, and add it to `apps/site/src/catalog.ts` with a one-line use.
2. Run `pnpm test`. Every state must draw, idle must come to rest, loading must keep moving, the pointer must be answered.
3. Run `pnpm site`, open `apps/site/dist/index.html`, and check the figure in every state in both themes. Fix anything that does not read at a glance at 200px.
