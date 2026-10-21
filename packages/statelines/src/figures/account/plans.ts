import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge, coins } from "../shapes";

const X = [-54, 0, 54];
const H = [28, 42, 56];
const Y = -10;
const SIZE = 34;

/** Three plans, one chosen. Use for pricing, plan pickers, upgrades and tiers. */
export const plans = defineFigure({
  name: "Plans",
  label: "Three pricing tiers with one chosen",
  offset: 14,
  setup: ({ spring }) => ({ lifts: X.map(() => spring(0)), spill: spring(0, 160, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const empty = state === "empty";
    let chosen = 1;
    if (state === "idle" && ctx.pointer.over > 0.3) {
      chosen = X.reduce((best, x, i) => (Math.abs(g.x - x) < Math.abs(g.x - X[best]!) ? i : best), 0);
    }
    if (state === "loading") chosen = Math.floor(ctx.time * 2.5) % 3;
    if (empty) chosen = -1;
    const lift = state === "success" ? 16 : state === "loading" ? 12 : state === "idle" ? 4 + 8 * ctx.hover : 0;
    const spill = clamp(m.spill.to(state === "error" ? 1 : 0).value, 0, 1.1);

    scene.box(0, 0, 0, 176, 84, 4, "base");

    m.lifts.forEach((spring, i) => {
      const on = i === chosen;
      const L = Math.max(0, spring.to(on ? lift : 0).value);
      const tone: Tone = empty ? "ghost" : !on ? "base" : state === "loading" ? "hi" : ctx.verdict();
      const x = X[i]! + (on ? shake : 0), z = 4 + L, top = z + H[i]!;
      scene.box(x, Y, z, SIZE, SIZE, H[i]!, tone);
      if (empty) return;
      // Features listed on the front face, one more per tier.
      const face = Y + SIZE / 2 + 0.05, line: Tone = tone === "base" ? "muted" : tone;
      for (let r = 0; r <= i; r++) {
        const lz = top - 10 - r * 8;
        scene.line([x - 11, face, lz], [x - 7, face, lz], line, { bold: true });
        scene.line([x - 3, face, lz], [x + 11, face, lz], line === "muted" ? "faint" : line);
      }
      // The price: a stack of coins on top, taller for the higher tier. On error the top coin slips off.
      const n = i + 1 - (on && state === "error" ? 1 : 0);
      if (n > 0) coins(scene, x, Y, top, n, tone === "base" ? "base" : tone, tone, 10);
    });

    if (state === "error" && chosen >= 0) {
      const x = X[chosen]!, h = 4 + H[chosen]! + (chosen + 1) * 5;
      const cx = x - 20 * spill, cy = Y + 34 * spill, cz = Math.max(4, h - (h - 4) * clamp(spill));
      scene.cylinder(cx, cy, cz, 10, 4, "err");
    }

    const bx = chosen >= 0 ? X[chosen]! + 14 : 0;
    badge(scene, bx, 26, 4, state, ctx.fade(), 12);
  },
});
