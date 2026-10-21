import { defineFigure } from "../../core/define";
import { clamp, falloff } from "../../engine/math";

const MAX = 7;
const SPAN = 132;
const views = (i: number) => 18 + ((i * 37) % 5) * 9 + i * 3;

/** A rail of published posts with their views counting up as a tracker passes. Use for campaign tracking and post monitoring. `count`: posts, 3–7. */
export const tracking = defineFigure({
  name: "Tracking",
  label: "Posts on a rail with views counting up",
  offset: 14,
  setup: ({ spring }) => ({ cursor: spring(1, 90, 16), bars: Array.from({ length: MAX }, (_, i) => spring(views(i), 140, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const n = ctx.count(5, MAX, 3), pitch = SPAN / n;
    const postX = (i: number) => -SPAN / 2 + pitch * (i + 0.5);
    let cursor = 1;
    if (state === "loading") { cursor = ctx.progress(n * 0.45); if (!ctx.determinate) m.cursor.set(cursor); }
    if (state === "error") cursor = 0.55;
    if (state === "empty") cursor = 0;
    const C = m.cursor.to(cursor).value, cx = -SPAN / 2 + SPAN * C;

    scene.box(0, 0, 0, SPAN + 22, 54, 4, "base");
    scene.box(0, 12, 4, SPAN + 6, 6, 3, state === "empty" ? "ghost" : "muted");

    for (let i = 0; i < n; i++) {
      const x = postX(i), passed = x < cx;
      if (state === "empty") { scene.box(x, 12, 7, 14, 14, 2, "ghost"); continue; }
      let h = passed ? views(i) : 3;
      if (state === "idle") h += 10 * ctx.hover * falloff(x - g.x, 10);
      const H = m.bars[i]!.to(h).value;
      const stuck = state === "error" && i === Math.floor(C * n);
      const tone = stuck ? "err" : state === "loading" && Math.abs(x - cx) < pitch ? "hi" : state === "success" && i === n - 1 ? "ok" : "base";
      scene.box(x + (stuck ? shake : 0), -10, 4, 8, 8, Math.max(0.5, H), passed ? tone : "faint");
      scene.box(x, 12, 7, 14, 14, 2, tone);
      scene.line([x - 4, 12, 9.05], [x + 4, 12, 9.05], "muted");
    }
    if (state !== "empty" && state !== "success") {
      const tone = state === "error" ? "err" : state === "loading" ? "hi" : "muted";
      scene.polyline([[cx + shake, 30, 4], [cx + shake, 30, 26], [cx + shake, -28, 26]], tone, { bold: true });
    }
    if (state === "success") scene.check(postX(n - 1), -10, views(n - 1) + 10, "ok", ctx.fade());
    if (state === "error") scene.cross(clamp(cx, -60, 60) + shake, 30, 30, "err", ctx.fade());
  },
});
