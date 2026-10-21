import { defineFigure } from "../../core/define";

const X = [-52, 0, 52];
const H = [30, 46, 62];

/** Three plans, one chosen. Use for pricing, plan pickers, upgrades and tiers. */
export const plans = defineFigure({
  name: "Plans",
  label: "Three pricing tiers with one chosen",
  offset: 8,
  setup: ({ spring }) => ({ lifts: X.map(() => spring(0)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    let chosen = 1;
    if (state === "idle" && ctx.pointer.over > 0.3) {
      chosen = X.reduce((best, x, i) => (Math.abs(g.x - x) < Math.abs(g.x - X[best]!) ? i : best), 0);
    }
    if (state === "loading") chosen = Math.floor(ctx.time * 2.5) % 3;
    if (state === "empty") chosen = -1;

    scene.box(0, 0, 0, 160, 50, 4, "base");
    m.lifts.forEach((lift, i) => {
      const on = i === chosen;
      const L = lift.to(on ? 12 : 0).value;
      const tone = state === "empty" ? "ghost" : !on ? "base" : state === "idle" || state === "loading" ? "hi" : ctx.verdict();
      const x = X[i]! + (on ? shake : 0), top = 4 + H[i]! + L;
      scene.box(x, 0, 4 + L, 34, 34, H[i]!, tone);
      if (state !== "empty") for (let r = 0; r < i + 1; r++) scene.line([x - 10, -8 + r * 6, top + 0.05], [x + 6, -8 + r * 6, top + 0.05], "muted");
      if (on && state === "success") scene.check(x, 6, top, "ok", ctx.fade());
      if (on && state === "error") scene.cross(x, 6, top, "err", ctx.fade());
    });
  },
});
