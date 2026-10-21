import { defineFigure } from "../../core/define";
import { bump, wrap } from "../../engine/math";

const ROWS = 4;
const COLS = 5;
const DEFAULT = { r: 2, c: 3 };
const tileX = (c: number) => -48 + c * 24;
const tileY = (r: number) => -22 + r * 20;
const TILES = Array.from({ length: ROWS * COLS }, (_, n) => ({ r: Math.floor(n / COLS), c: n % COLS }))
  .sort((a, b) => tileX(a.c) + tileY(a.r) - (tileX(b.c) + tileY(b.r)));

/** A month of days with one picked. Use for booking, scheduling, date pickers and deadlines. */
export const calendar = defineFigure({
  name: "Calendar",
  label: "A month of days with one picked",
  offset: 2,
  setup: ({ spring }) => ({ lifts: Array.from({ length: ROWS * COLS }, () => spring(0)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(7);
    let pick: { r: number; c: number } | null = state === "loading" || state === "empty" ? null : DEFAULT;
    if (state === "idle" && ctx.pointer.over > 0.3) {
      const c = Math.round((g.x + 48) / 24), r = Math.round((g.y + 22) / 20);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) pick = { r, c };
    }

    scene.box(0, 4, 0, 124, 104, 4, "base");
    scene.box(0, -42, 4, 124, 14, 6, state === "empty" ? "muted" : "base");
    scene.cylinder(-30, -44, 10, 4, 8, "base");
    scene.cylinder(30, -44, 10, 4, 8, "base");

    for (const { r, c } of TILES) {
      const on = !!pick && pick.r === r && pick.c === c;
      let lift = on ? 8 : 0;
      if (state === "loading") lift = 4 * bump(wrap(ctx.time * 1.2 - (r + c) * 0.1, 1));
      const L = m.lifts[r * COLS + c]!.to(lift).value;
      const tone = state === "empty" ? "ghost"
        : on ? (state === "idle" ? "hi" : ctx.verdict())
        : state === "loading" && L > 2 ? "hi"
        : c === COLS - 1 ? "muted" : "base";
      const x = tileX(c) + (on ? shake : 0), y = tileY(r);
      scene.box(x, y, 4 + L, 20, 16, 3, tone);
      if (on && state === "success") scene.check(x, y, 7 + L, "ok", ctx.fade());
      if (on && state === "error") scene.cross(x, y, 7 + L, "err", ctx.fade());
    }
  },
});
