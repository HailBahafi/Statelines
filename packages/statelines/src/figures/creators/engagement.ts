import { defineFigure } from "../../core/define";
import { clamp, wrap } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { badge, frontArc, heart } from "../shapes";

const POST = { x: -18, y: 0, w: 58, d: 5, h: 78 };
const FRONT = POST.y + POST.d / 2 + 0.05;
const BARS = [{ y: -16, h: 30 }, { y: 0, h: 46 }, { y: 16, h: 22 }];
const BAR_X = 44;

/** A post with hearts rising off it and its likes, comments and shares beside. Use for engagement and post analytics. */
export const engagement = defineFigure({
  name: "Engagement",
  label: "Hearts rising from a post beside three metrics",
  offset: 18,
  setup: ({ spring }) => ({ bars: BARS.map(b => spring(b.h, 140, 16)), big: spring(0, 180, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const { w, h } = POST, px = POST.x + shake;
    const on = (u: number, z: number): Vec3 => [px + u, FRONT, z];

    scene.box(4, 0, 0, 148, 72, 4, "base");
    if (state === "empty") {
      scene.box(px, POST.y, 4, w, POST.d, h, "ghost");
      BARS.forEach(b => scene.box(BAR_X, b.y, 4, 10, 10, 8, "ghost"));
      return;
    }

    // The post: a photo, a like button and a caption, all on its face.
    const frame: Tone = state === "loading" ? "hi" : ctx.verdict();
    scene.box(px, POST.y, 4, w, POST.d, h, frame);
    scene.polyline([on(-22, 34), on(22, 34), on(22, 74), on(-22, 74)], "muted", { closed: true });
    scene.polyline([on(-22, 34), on(-8, 52), on(0, 44), on(10, 58), on(22, 42)], "muted");
    scene.polyline(frontArc(px + 12, FRONT, 66, 3.5, 0, Math.PI * 2, 12), "muted");
    scene.polyline(frontArc(px - 17, FRONT, 23, 3, 0, Math.PI * 2, 12), state === "success" ? "ok" : "muted");
    scene.line(on(-9, 25), on(16, 25), "muted");
    scene.line(on(-9, 17), on(6, 17), "faint");

    BARS.forEach((b, i) => {
      let target = b.h;
      if (state === "loading") { target = b.h * (0.4 + 0.6 * Math.abs(Math.sin(ctx.time * 1.6 + i))); m.bars[i]!.set(target); }
      if (state === "success") target = b.h + 12;
      if (state === "error") target = 3;
      if (state === "idle") target = b.h + ctx.hover * 8 * (i === 1 ? 1 : 0.5);
      const H = m.bars[i]!.to(target).value;
      const tone: Tone = state === "loading" ? "hi" : state === "error" ? "muted" : i === 1 ? ctx.verdict() : "base";
      scene.box(BAR_X, b.y, 4, 10, 10, Math.max(0.5, H), tone);
    });

    if (state === "loading") {
      for (let k = 0; k < 4; k++) {
        const q = wrap(ctx.time * 0.7 + k / 4, 1);
        heart(scene, px + 14 - k * 9, POST.y, h + 10 + q * 40, 12 + 4 * (1 - q), "hi", clamp((1 - q) * 1.4));
      }
    }
    const big = m.big.to(state === "success" ? 1 : state === "idle" ? ctx.hover * 0.7 : 0).value;
    if (big > 0.02) heart(scene, px, POST.y, h + 24, 26 * big, state === "success" ? "ok" : "base", Math.min(1, big * 1.5));
    badge(scene, POST.x, 20, 4, state, ctx.fade());
  },
});
