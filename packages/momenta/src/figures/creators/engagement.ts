import { defineFigure } from "../../core/define";
import { clamp, wrap } from "../../engine/math";
import { heart } from "../shapes";

const POST = { x: -14, y: 0, w: 58, h: 74 };
const FRONT = POST.y + 2;
const BARS = [{ y: -16, h: 30 }, { y: 0, h: 44 }, { y: 16, h: 22 }];

/** A post with hearts rising off it and its likes, comments and shares beside. Use for engagement and post analytics. */
export const engagement = defineFigure({
  name: "Engagement",
  label: "Hearts rising from a post beside three metrics",
  offset: 18,
  setup: ({ spring }) => ({ bars: BARS.map(b => spring(b.h, 140, 16)), big: spring(0, 180, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const { x, w, h } = POST, px = x + shake;

    scene.box(4, 0, 0, 140, 60, 4, "base");
    if (state === "empty") {
      scene.box(px, POST.y, 4, w, 4, h, "ghost");
      BARS.forEach(b => scene.box(46, b.y, 4, 10, 10, 10, "ghost"));
      return;
    }
    scene.box(px, POST.y, 4, w, 4, h, ctx.verdict());
    scene.polyline([[px - 22, FRONT, 22], [px + 22, FRONT, 22], [px + 22, FRONT, 70], [px - 22, FRONT, 70]], "muted", { closed: true });
    scene.polyline([[px - 22, FRONT, 32], [px - 6, FRONT, 50], [px + 4, FRONT, 40], [px + 22, FRONT, 58]], "muted");
    scene.line([px - 22, FRONT, 14], [px + 6, FRONT, 14], "muted");

    BARS.forEach((b, i) => {
      let target = b.h;
      if (state === "loading") { target = b.h * (0.4 + 0.6 * Math.abs(Math.sin(ctx.time * 1.6 + i))); m.bars[i]!.set(target); }
      if (state === "error") target = 4;
      if (state === "idle") target = b.h + ctx.hover * 8 * (i === 1 ? 1 : 0.5);
      const H = m.bars[i]!.to(target).value;
      const tone = state === "loading" ? "hi" : state === "error" ? "muted" : i === 1 ? ctx.verdict() : "base";
      scene.box(46, b.y, 4, 10, 10, Math.max(0.5, H), tone);
    });

    if (state === "loading") {
      for (let k = 0; k < 4; k++) {
        const q = wrap(ctx.time * 0.7 + k / 4, 1);
        heart(scene, px + 14 - k * 9, POST.y, h + 8 + q * 46, 12 + 4 * (1 - q), "hi", clamp((1 - q) * 1.4));
      }
    }
    const big = m.big.to(state === "success" ? 1 : state === "idle" ? ctx.hover * 0.7 : 0).value;
    if (big > 0.02) heart(scene, px, POST.y, h + 22, 26 * big, state === "success" ? "ok" : "hi", Math.min(1, big * 1.5));
    if (state === "error") scene.cross(px, POST.y + 20, 4, "err", ctx.fade());
  },
});
