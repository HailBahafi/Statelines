import { defineFigure } from "../../core/define";
import { clamp, falloff } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge } from "../shapes";

const MAX = 7;
const SPAN = 132;
const POSTS = -2;
const BARS = -24;
const RAIL = 16;
const views = (i: number) => 16 + ((i * 37) % 5) * 7 + i * 2;

/** A rail of published posts with their views counting up as a tracker passes. Use for campaign tracking and post monitoring. `count`: posts, 3–7. */
export const tracking = defineFigure({
  name: "Tracking",
  label: "Posts on a rail with views counting up",
  offset: 12,
  setup: ({ spring }) => ({ cursor: spring(1, 90, 16), bars: Array.from({ length: MAX }, (_, i) => spring(views(i), 140, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const empty = state === "empty";
    const n = ctx.count(5, MAX, 3), pitch = SPAN / n, tile = Math.min(16, pitch - 4);
    const postX = (i: number) => -SPAN / 2 + pitch * (i + 0.5);
    let cursor = 1;
    if (state === "loading") { cursor = ctx.progress(n * 0.45); if (!ctx.determinate) m.cursor.set(cursor); }
    // The tracker stalls on the third post.
    if (state === "error") cursor = (2.5 / n);
    if (state === "empty") cursor = 0;
    const C = m.cursor.to(cursor).value, cx = -SPAN / 2 + SPAN * C;
    const stuck = state === "error" ? 2 : -1;

    scene.box(0, 0, 0, SPAN + 24, 94, 4, "base");
    // The rail runs along the front, and the tracker rides it.
    scene.box(0, RAIL, 4, SPAN + 8, 6, 3, empty ? "ghost" : "muted");

    for (let i = 0; i < n; i++) {
      const x = postX(i), passed = x < cx && i !== stuck;
      if (empty) { scene.box(x, POSTS, 4, tile, tile, 3, "ghost"); continue; }
      let h = passed ? views(i) : 2;
      if (state === "success") h = views(i) + 6;
      if (state === "idle") h += 10 * ctx.hover * falloff(x - g.x, 10);
      const H = m.bars[i]!.to(h).value;
      const tone: Tone = i === stuck ? "err"
        : state === "loading" && Math.abs(x - cx) < pitch * 0.6 ? "hi"
        : state === "success" ? "ok" : "base";
      scene.box(x, BARS, 4, 8, 8, Math.max(0.5, H), passed || state === "success" ? tone : "faint");
      scene.box(x + (i === stuck ? shake : 0), POSTS, 4, tile, tile, 3, tone);
      // A tiny picture on each post.
      const k = tile / 16;
      scene.polyline([[x - 5 * k, POSTS + 5 * k, 7.05], [x - 1 * k, POSTS - 1 * k, 7.05], [x + 2 * k, POSTS + 2 * k, 7.05], [x + 5 * k, POSTS - 4 * k, 7.05]], "muted");
    }

    if (!empty) {
      const tone: Tone = state === "error" ? "err" : state === "loading" ? "hi" : state === "success" ? "ok" : "base";
      const x = clamp(cx, -SPAN / 2, SPAN / 2) + (state === "error" ? shake : 0);
      scene.box(x, RAIL, 7, 10, 10, 6, tone);
      scene.line([x, RAIL - 5, 10], [x, POSTS + tile / 2 + 2, 7.05], tone === "base" ? "muted" : tone);
    }
    const bx = state === "success" ? -SPAN / 2 + 14 : clamp(cx, -SPAN / 2, SPAN / 2) - 20;
    badge(scene, bx, 34, 4, state, ctx.fade());
  },
});
