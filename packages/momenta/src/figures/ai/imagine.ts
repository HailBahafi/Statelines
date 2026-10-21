import { defineFigure } from "../../core/define";
import { falloff, hash2 } from "../../engine/math";

const N = 6;
const PITCH = 17;
const ART = [
  "##....",
  "##..#.",
  "...###",
  "..####",
  ".#####",
  "######",
];
const cell = (i: number) => (i - (N - 1) / 2) * PITCH;
const CELLS = Array.from({ length: N * N }, (_, n) => ({ i: n % N, j: Math.floor(n / N) }))
  .sort((a, b) => a.i + a.j - (b.i + b.j));

/** An image resolves tile by tile. Use for image generation, rendering and previews. */
export const imagine = defineFigure({
  name: "Imagine",
  label: "An image resolving tile by tile",
  offset: 4,
  setup: ({ spring }) => ({ heights: Array.from({ length: N * N }, () => spring(1, 150, 18)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const g = ctx.ground(4);
    const q = state === "loading" ? ctx.progress(3) : 0;
    const reveal = state === "loading" ? (ctx.determinate ? q * 1.05 : Math.min(1.05, (q * 3) / 2.4)) : state === "empty" ? 0 : 1.05;

    scene.box(0, 0, 0, 116, 116, 4, ctx.verdict());
    for (const { i, j } of CELLS) {
      const x = cell(i), y = cell(j), filled = ART[j]![i] === "#", seed = hash2(i, j);
      const shown = seed < reveal;
      let h = shown ? (filled ? 10 : 3) : 1;
      if (state === "idle") h += 10 * ctx.hover * falloff(Math.hypot(x - g.x, y - g.y), 16);
      const H = m.heights[j * N + i]!.to(h).value;
      const tone = state === "empty" ? "ghost"
        : state === "error" && seed > 0.82 ? "err"
        : !shown ? "faint"
        : state === "loading" && reveal - seed < 0.12 ? "hi"
        : filled ? "base" : "muted";
      scene.box(x, y, 4, 15, 15, Math.max(0.5, H), tone);
    }

    if (state !== "error") {
      const tone = state === "loading" ? "hi" : state === "success" ? "ok" : "muted";
      const pulse = state === "loading" ? 1 + 0.25 * Math.sin(ctx.time * 6) : 1;
      scene.sparkle(56, -64, 44, 9 * pulse, tone);
    }
    if (state === "success") scene.check(30, 66, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(30, 66, 4, "err", ctx.fade());
  },
});
