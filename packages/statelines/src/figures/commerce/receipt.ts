import { defineFigure } from "../../core/define";
import { bump } from "../../engine/math";

const LINES = [44, 30, 40, 24, 44, 20];
const SEAL = [8, 24] as const;

/** A receipt is stamped. Use for invoices, receipts, approvals and paid states. */
export const receipt = defineFigure({
  name: "Receipt",
  label: "A receipt being stamped",
  offset: -4,
  setup: ({ spring }) => ({ z: spring(56) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let z = 56 - ctx.hover * 16;
    if (state === "loading") { z = 56 - 52 * bump(ctx.loop(1.4)); m.z.set(z); }
    if (state === "success" || state === "error") z = 62;
    const Z = m.z.to(z).value;

    scene.box(-6, 0, 0, 70, 112, 2, ctx.verdict());
    LINES.forEach((w, i) => {
      const y = -42 + i * 11, x0 = -34;
      scene.line([x0, y, 2.05], [x0 + w, y, 2.05], state === "empty" ? "ghost" : i === 0 ? "base" : "muted");
    });

    if (state === "success" || state === "error") {
      const tone = ctx.verdict(), o = ctx.fade();
      scene.disc(SEAL[0], SEAL[1], 2.05, 17, tone, { opacity: o });
      scene.disc(SEAL[0], SEAL[1], 2.05, 13, tone, { opacity: o * 0.6 });
      if (state === "success") scene.check(SEAL[0], SEAL[1], 2.05, "ok", o);
      else scene.cross(SEAL[0], SEAL[1], 2.05, "err", o);
    }

    const x = SEAL[0] + shake, y = SEAL[1], tone = state === "empty" ? "muted" : state === "loading" ? "hi" : "base";
    scene.cylinder(x, y, Z, 17, 9, tone);
    scene.cylinder(x, y, Z + 9, 5, 16, tone);
    scene.cylinder(x, y, Z + 25, 10, 6, tone);
  },
});
