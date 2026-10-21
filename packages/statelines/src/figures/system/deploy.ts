import { defineFigure } from "../../core/define";

const MAX = 6;
const GAP = 16;

/** Layers of a release lift into place. Use for deploys, publishing and builds. `count`: layers, 2–6. */
export const deploy = defineFigure({
  name: "Deploy",
  label: "Layers of a release lifting into place",
  setup: ({ spring }) => ({
    layers: Array.from({ length: MAX }, (_, i) => ({ z: spring(i * GAP), x: spring(0), y: spring(0) })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(9);
    const layers = ctx.count(4, MAX, 2);
    const gap = layers > 4 ? (GAP * 4) / layers + 2 : GAP;
    const last = layers - 1;
    let top = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < layers; i++) {
      const layer = m.layers[i]!;
      let z = i * gap, x = lean.x * i, y = lean.y * i, lift = 0;
      if (state === "loading") { lift = Math.max(0, Math.sin(ctx.time * 4.2 - i * (3.8 / layers))); z += lift * 15; }
      if (state === "success") z = i * 9;
      if (state === "error" && i === last - 1) x += 20;
      if (state === "error" && i === last) { x += 8; y -= 18; z += 8; }
      const Z = layer.z.to(z).value, X = layer.x.to(x).value + (i === last ? shake : 0), Y = layer.y.to(y).value;
      const tone = state === "empty" && i > 0 ? "ghost"
        : state === "loading" && lift > 0.55 ? "hi"
        : i === last ? ctx.verdict() : "base";
      scene.box(X, Y, Z, 104, 104, 7, tone);
      if (i === last) top = { x: X, y: Y, z: Z + 7 };
    }

    if (state === "success") scene.check(top.x, top.y, top.z, "ok", ctx.fade());
    if (state === "error") scene.cross(top.x, top.y, top.z, "err", ctx.fade());
  },
});
