import { defineFigure } from "../../core/define";
import { bump, lerp, smoothstep } from "../../engine/math";
import { sheet } from "../shapes";

/** A sheet arcs out of storage onto a tray. Use for downloads and exports. */
export const download = defineFigure({
  name: "Download",
  label: "A sheet arcing out of storage onto a tray",
  setup: ({ spring }) => ({ p: spring(0, 110, 20), lift: spring(0), opacity: spring(1, 140, 22) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(14);
    let p = 0, lift = ctx.hover * 10, opacity = 1;

    if (state === "loading") {
      const q = ctx.progress(2.2);
      lift = 0;
      if (ctx.determinate) p = q;
      else {
        p = smoothstep(q / 0.8);
        opacity = 1 - smoothstep((q - 0.86) / 0.1);
        m.p.set(p); m.opacity.set(opacity); m.lift.set(0);
      }
    } else if (state === "success" || state === "empty") {
      p = 1;
    } else if (state === "error") {
      p = 0.45;
    }

    const P = m.p.to(p).value, L = m.lift.to(lift).value, O = m.opacity.to(opacity).value;
    const x = lerp(-24, 38, P) + lean.x * (1 - P) + shake;
    const y = lerp(-24, 38, P) + lean.y * (1 - P);
    const z = lerp(42, 6, P) + 36 * bump(P) + L * (1 - P);

    scene.box(-24, -24, 0, 64, 64, 40, state === "empty" ? "muted" : "base");
    scene.rect(-44, -28, -4, -20, 40, state === "loading" ? "hi" : "faint");
    scene.box(38, 38, 0, 64, 52, 4, state === "success" ? "ok" : "base");

    if (state === "empty") scene.box(38, 38, 4, 44, 34, 2, "ghost");
    else sheet(scene, x, y, z, 44, 34, state === "error" ? "err" : "base", O);

    if (state === "success") scene.check(x, y, z + 2, "ok", ctx.fade());
    if (state === "error") scene.cross(x, y, z + 2, "err", ctx.fade());
  },
});
