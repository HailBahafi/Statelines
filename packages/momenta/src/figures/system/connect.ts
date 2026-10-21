import { defineFigure } from "../../core/define";
import { bump, clamp, wrap } from "../../engine/math";

const GAP_START = -26;
const GAP = 52;

/** A bridge reaches across to another block. Use for integrations, linked accounts and pairing. */
export const connect = defineFigure({
  name: "Connect",
  label: "A bridge reaching from one block to another",
  offset: 8,
  setup: ({ spring }) => ({ length: spring(10, 120, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let length = 10 + 22 * clamp(ctx.hover);
    if (state === "loading") { length = 10 + 26 * bump(wrap(ctx.time, 1.6) / 1.6); m.length.set(length); }
    if (state === "success") length = GAP;
    if (state === "error") length = 34;
    if (state === "empty") length = 0;
    const L = m.length.to(length).value;

    scene.box(-46, 0, 0, 40, 40, 34, "base");
    scene.disc(-46, 0, 34.05, 8, "muted");
    if (state === "loading") {
      for (let k = 0; k < 3; k++) {
        const x = GAP_START + GAP * wrap(ctx.time * 0.8 + k / 3, 1);
        scene.disc(x, 0, 30, 2.2, "hi", { fill: true });
      }
    }
    if (L > 0.5) {
      const tone = state === "loading" ? "hi" : ctx.verdict();
      scene.box(GAP_START + L / 2 + (state === "error" ? shake : 0), 0, 12, L, 12, 10, tone);
    }
    scene.box(46, 0, 0, 40, 40, 34, state === "empty" ? "ghost" : ctx.verdict());
    if (state !== "empty") scene.rect(40, -6, 52, 6, 34.05, "muted");

    if (state === "success") scene.check(0, 0, 30, "ok", ctx.fade());
    if (state === "error") scene.cross(17, 0, 30, "err", ctx.fade());
  },
});
