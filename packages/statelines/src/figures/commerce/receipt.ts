import { defineFigure } from "../../core/define";
import { bump } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";

const LINES = [44, 30, 40, 24, 44, 20];
const SEAL = [8, 24] as const;
const PAPER = { x: -6, w: 70, d: 112 };
const DESK = 4;
const TOP = DESK + 2;

/** A receipt is stamped. Use for invoices, receipts, approvals and paid states. */
export const receipt = defineFigure({
  name: "Receipt",
  label: "A receipt being stamped",
  offset: -2,
  setup: ({ spring }) => ({ z: spring(60) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let z = 60 - ctx.hover * 16;
    if (state === "loading") { z = 60 - (60 - TOP) * bump(ctx.loop(1.4)); m.z.set(z); }
    if (state === "success" || state === "error") z = 66;
    const Z = m.z.to(z).value;

    scene.box(-6, 0, 0, 120, 144, DESK, "base");
    scene.box(PAPER.x, 0, DESK, PAPER.w, PAPER.d, 2, empty ? "ghost" : ctx.verdict());
    // The torn edge along the bottom of the receipt.
    const left = PAPER.x - PAPER.w / 2, edge = PAPER.d / 2;
    if (!empty) {
      const teeth: Vec3[] = Array.from({ length: 15 }, (_, i) => [left + (i * PAPER.w) / 14, edge - (i % 2 ? 4 : 0), TOP + 0.05]);
      scene.polyline(teeth, "muted");
    }
    LINES.forEach((w, i) => {
      const y = -42 + i * 11, x0 = -34;
      scene.line([x0, y, TOP + 0.05], [x0 + w, y, TOP + 0.05], empty ? "ghost" : i === 0 ? "base" : "muted", { bold: i === 0 });
    });
    if (!empty) scene.line([-34, 44, TOP + 0.05], [-14, 44, TOP + 0.05], "base", { bold: true });

    if (state === "success" || state === "error") {
      // The stamp's imprint: a double ring with the verdict inside.
      const tone = ctx.verdict(), o = ctx.fade();
      scene.disc(SEAL[0], SEAL[1], TOP + 0.05, 17, tone, { opacity: o });
      scene.disc(SEAL[0], SEAL[1], TOP + 0.05, 14, tone, { opacity: o * 0.6 });
      if (state === "success") scene.check(SEAL[0], SEAL[1], TOP + 0.05, "ok", o);
      else scene.cross(SEAL[0], SEAL[1], TOP + 0.05, "err", o);
    }

    const x = SEAL[0] + shake, y = SEAL[1];
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : "base";
    scene.cylinder(x, y, Z, 17, 9, tone);
    scene.cylinder(x, y, Z + 9, 5, 16, tone);
    scene.cylinder(x, y, Z + 25, 10, 6, tone);
  },
});
