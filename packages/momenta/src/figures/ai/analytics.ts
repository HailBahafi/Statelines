import { defineFigure } from "../../core/define";
import { bump, wrap } from "../../engine/math";

const MAX = 10;
const SPAN = 132;
/** A rising series with some texture, so any bar count reads as real data. */
const value = (i: number, n: number) => 22 + (34 * i) / Math.max(1, n - 1) + 7 * Math.sin(i * 2.1);

/** A bar chart. Use for dashboards, reports, insights and "no data yet". `count`: bars, 3–10. */
export const analytics = defineFigure({
  name: "Analytics",
  label: "A bar chart",
  offset: 12,
  setup: ({ spring }) => ({ bars: Array.from({ length: MAX }, (_, i) => spring(value(i, 7), 140, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const n = ctx.count(7, MAX, 3);
    const pitch = SPAN / n, width = Math.min(12, pitch * 0.6);
    const barX = (i: number) => -SPAN / 2 + pitch * (i + 0.5);
    let focus = -1;
    if (state === "idle" && ctx.pointer.over > 0.3) focus = Math.max(0, Math.min(n - 1, Math.floor((g.x + SPAN / 2) / pitch)));

    scene.box(0, 0, 0, SPAN + 18, 36, 4, "base");
    scene.line([-SPAN / 2 - 4, 12, 4.05], [SPAN / 2 + 4, 12, 4.05], "faint");
    for (let i = 0; i < n; i++) {
      const bar = m.bars[i]!, data = value(i, n);
      let h = data;
      if (state === "loading") { h = 8 + 32 * bump(wrap(ctx.time * 1.3 - i * (0.84 / n), 1)); bar.set(h); }
      if (state === "error") h = 4;
      if (i === focus) h += 10;
      const H = bar.to(h).value;
      const last = i === n - 1;
      const tone = state === "empty" ? "ghost"
        : state === "loading" ? (H > 26 ? "hi" : "base")
        : i === focus ? "hi"
        : state === "success" && last ? "ok"
        : state === "error" ? "muted" : "base";
      scene.box(barX(i) + (state === "error" ? shake : 0), 0, 4, width, width, Math.max(0.5, H), tone);
    }

    if (state === "success") scene.check(barX(n - 1), 0, 4 + value(n - 1, n) + 6, "ok", ctx.fade());
    if (state === "error") scene.cross(shake, 0, 30, "err", ctx.fade());
  },
});
