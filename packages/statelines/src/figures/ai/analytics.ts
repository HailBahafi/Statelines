import { defineFigure } from "../../core/define";
import { bump, clamp, wrap } from "../../engine/math";
import type { Tone } from "../../engine/scene";

const MAX = 10;
const SPAN = 132;
/** The chart's corner: a back wall behind the bars and a side wall at the left, both ruled. */
const BACK = -20, SIDE = -SPAN / 2 - 10, WALL = 70;
const GRID = [18, 34, 50, 66];
/** A rising series with some texture, so any bar count reads as real data. */
const value = (i: number, n: number) => 22 + (34 * i) / Math.max(1, n - 1) + 7 * Math.sin(i * 2.1);

/** A bar chart. Use for dashboards, reports, insights and "no data yet". `count`: bars, 3–10. */
export const analytics = /*#__PURE__*/ defineFigure({
  name: "Analytics",
  label: "A bar chart",
  offset: 20,
  setup: ({ spring }) => ({
    bars: Array.from({ length: MAX }, (_, i) => spring(value(i, 7), 140, 16)),
    fall: spring(0, 130, 15),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const empty = state === "empty";
    const n = ctx.count(7, MAX, 3);
    const pitch = SPAN / n, width = Math.min(12, pitch * 0.6);
    const barX = (i: number) => -SPAN / 2 + pitch * (i + 0.5);
    let focus = -1;
    if (state === "idle" && ctx.pointer.over > 0.3) focus = clamp(Math.floor((g.x + SPAN / 2) / pitch), 0, n - 1);
    const F = m.fall.to(state === "error" ? 1 : 0).value;

    scene.box(0, 4, 0, SPAN + 30, 52, 4, "base");
    // The walls and their gridlines.
    const wall: Tone = empty ? "ghost" : "base";
    scene.box(4, BACK - 1.5, 4, SPAN + 22, 3, WALL, wall);
    scene.box(SIDE - 1.5, 4, 4, 3, 51, WALL, wall);
    if (!empty) {
      for (const z of GRID) {
        scene.line([SIDE, BACK + 0.05, 4 + z], [SPAN / 2 + 14, BACK + 0.05, 4 + z], "faint");
        scene.line([SIDE + 0.05, BACK, 4 + z], [SIDE + 0.05, 29, 4 + z], "faint");
      }
    }

    for (let i = 0; i < n; i++) {
      const bar = m.bars[i]!, data = value(i, n);
      const last = i === n - 1;
      let h = data;
      if (state === "loading") { h = 8 + 32 * bump(wrap(ctx.time * 1.3 - i * (0.84 / n), 1)); bar.set(h); }
      if (state === "success") h = data + (8 * i) / Math.max(1, n - 1);
      if (state === "error") h = 5;
      if (i === focus) h += 10;
      const H = bar.to(h).value;
      const tone: Tone = empty ? "ghost"
        : state === "loading" ? (H > 26 ? "hi" : "base")
        : state === "success" ? "ok"
        : state === "error" ? (last ? "err" : "muted") : "base";
      scene.box(barX(i) + (state === "error" ? shake : 0), 0, 4, width, width, Math.max(0.5, H), tone);
    }

    // On error the last bar's column has broken off and lies on the plate in front.
    if (F > 0.02) {
      const len = value(n - 1, n) - 8, x = barX(n - 1) - len / 2 + 6, z = 4 + 30 * (1 - F);
      scene.box(x, 18, z, len, width, width, "err", Math.min(1, F * 1.5));
    }
  },
});
