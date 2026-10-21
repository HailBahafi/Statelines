import { defineFigure } from "../../core/define";
import { bump, wrap } from "../../engine/math";

/** Three disks of a database. Use for saving, syncing and storage. */
export const database = defineFigure({
  name: "Database",
  label: "Three stacked disks of a database",
  offset: 6,
  setup: ({ spring }) => ({ disks: [0, 1, 2].map(k => ({ z: spring(k * 20), x: spring(0) })) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const gap = state === "success" ? 17 : 20 + 10 * ctx.hover;
    let top = 0, topX = 0;

    m.disks.forEach((disk, k) => {
      let z = k * gap, x = 0, lift = 0;
      if (state === "loading") {
        lift = bump(wrap(ctx.time * 1.4 - k * 0.25, 1) * 2);
        z += 7 * lift;
        disk.z.set(z);
      }
      if (state === "error" && k === 2) { x = 18; z += 6; }
      const Z = disk.z.to(z).value, X = disk.x.to(x).value + (k === 2 ? shake : 0);
      const tone = state === "empty" ? "ghost"
        : state === "loading" && lift > 0.5 ? "hi"
        : k === 2 ? ctx.verdict() : "base";
      scene.cylinder(X, 0, Z, 46, 14, tone);
      if (k === 2) { top = Z + 14; topX = X; }
    });

    if (state === "success") scene.check(topX, 0, top, "ok", ctx.fade());
    if (state === "error") scene.cross(topX, 0, top, "err", ctx.fade());
  },
});
