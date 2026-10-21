import { defineFigure } from "../../core/define";
import { bump, wrap } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge } from "../shapes";

const R = 40;
const H = 14;

/** Three disks of a database. Use for saving, syncing and storage. */
export const database = defineFigure({
  name: "Database",
  label: "Three stacked disks of a database",
  offset: 10,
  setup: ({ spring }) => ({ disks: [0, 1, 2].map(k => ({ z: spring(4 + k * 20), x: spring(0) })) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const gap = state === "success" ? 16 : 20 + 8 * ctx.hover;
    let top = 0, topX = 0;

    scene.box(0, 0, 0, 112, 112, 4, "base");
    m.disks.forEach((disk, k) => {
      let z = 4 + k * gap, x = 0, lift = 0;
      if (state === "loading") {
        lift = bump(wrap(ctx.time * 1.4 - k * 0.25, 1) * 2);
        z += 6 * lift;
        disk.z.set(z);
      }
      // A failed write: the top disk slides off the stack.
      if (state === "error" && k === 2) { x = 26; z += 6; }
      const Z = disk.z.to(z).value, X = disk.x.to(x).value + (k === 2 ? shake : 0);
      const tone: Tone = state === "empty" ? "ghost"
        : state === "loading" && lift > 0.5 ? "hi"
        : k === 2 ? ctx.verdict() : "base";
      scene.cylinder(X, 0, Z, R, H, tone);
      if (state !== "empty") {
        // Each disk has a status light on its front.
        const light: Tone = state === "loading" ? "hi" : tone === "base" ? "muted" : tone;
        scene.arc(X, 0, Z + H / 2, R, 0.45, 0.85, light, { bold: true });
        scene.arc(X, 0, Z + H / 2, R, 1.15, 1.35, "faint");
      }
      if (k === 2) { top = Z + H; topX = X; }
    });

    badge(scene, topX, 0, top, state, ctx.fade());
  },
});
