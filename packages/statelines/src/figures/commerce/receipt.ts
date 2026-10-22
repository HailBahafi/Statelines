import { defineFigure } from "../../core/define";
import type { Tone, Vec3 } from "../../engine/scene";
import { frontArc } from "../shapes";

const PRINTER = { w: 72, d: 54, h: 30 };
const TOP = 4 + PRINTER.h;
const SLIP = { y: -8, w: 46 };
const FACE = SLIP.y + 1.05;
const FULL = 74;
const LINES = [34, 22, 30, 18, 34, 26, 20];

/** A receipt prints and is stamped paid. Use for invoices, receipts, approvals and paid states. */
export const receipt = /*#__PURE__*/ defineFigure({
  name: "Receipt",
  label: "A receipt printing and being stamped paid",
  offset: 4,
  setup: ({ spring }) => ({ length: spring(34, 120, 18), scrap: spring(0, 140, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let length = 34 + ctx.hover * 10;
    if (state === "loading") { length = 10 + (FULL - 10) * ctx.loop(2.4); m.length.set(length); }
    if (state === "success") length = FULL;
    // A jam: the slip tears off short and the torn piece falls onto the plate.
    if (state === "error") length = 14;
    if (empty) length = 0;
    const H = m.length.to(length).value, S = m.scrap.to(state === "error" ? 1 : 0).value;
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();

    scene.box(0, 0, 0, 124, 100, 4, "base");

    // The printer: a block with a slot on top, a small display and a status light on its face.
    const front = PRINTER.d / 2 + 0.05;
    scene.box(0, 0, 4, PRINTER.w, PRINTER.d, PRINTER.h, empty ? "ghost" : "base");
    if (!empty) {
      scene.rect(-SLIP.w / 2 - 3, SLIP.y - 2, SLIP.w / 2 + 3, SLIP.y + 2, TOP + 0.05, "muted");
      scene.polyline([[-26, front, 12], [-2, front, 12], [-2, front, 24], [-26, front, 24]], "muted", { closed: true });
      scene.polyline(frontArc(20, front, 18, 3, 0, Math.PI * 2, 10), state === "loading" ? "hi" : tone === "base" ? "muted" : tone);
    }

    // The slip, standing up out of the slot, printed from the top down.
    if (empty) {
      scene.box(0, SLIP.y, TOP, SLIP.w, 2, 40, "ghost");
      return;
    }
    if (H > 0.5) {
      const x = shake, at = (u: number, z: number): Vec3 => [x + u, FACE, z];
      scene.box(x, SLIP.y, TOP, SLIP.w, 2, H, tone);
      const top = TOP + H, left = -SLIP.w / 2;
      // The torn edge along its top.
      scene.polyline(Array.from({ length: 13 }, (_, i) => at(left + (i * SLIP.w) / 12, top - (i % 2 ? 3 : 0.5))), "muted");
      LINES.forEach((w, i) => {
        const z = top - 9 - i * 7;
        if (z > TOP + 4) scene.line(at(left + 6, z), at(left + 6 + w, z), i === 0 ? "base" : "muted", { bold: i === 0 });
      });
      if (state === "success") {
        // The paid stamp: a double ring with a bar across it.
        const sz = TOP + 20, o = ctx.fade(0.5);
        scene.polyline(frontArc(x + 10, FACE + 0.05, sz, 10, 0, Math.PI * 2, 24), "ok", { opacity: o, bold: true });
        scene.polyline(frontArc(x + 10, FACE + 0.05, sz, 7, 0, Math.PI * 2, 20), "ok", { opacity: o });
        scene.line([x + 4, FACE + 0.05, sz], [x + 16, FACE + 0.05, sz], "ok", { opacity: o, bold: true });
      }
    }
    if (S > 0.02) {
      // The torn-off piece, lying on the plate in front of the printer.
      const px = 30, py = 38, z = 4 + 30 * (1 - S);
      scene.box(px, py, z, 30, 20, 1.5, "err", Math.min(1, S * 1.5));
      scene.line([px - 9, py - 3, z + 1.6], [px + 7, py - 3, z + 1.6], "muted", { opacity: S });
      scene.line([px - 9, py + 3, z + 1.6], [px + 2, py + 3, z + 1.6], "muted", { opacity: S });
    }
  },
});
