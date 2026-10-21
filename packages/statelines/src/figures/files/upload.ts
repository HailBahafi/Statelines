import { defineFigure } from "../../core/define";
import { clamp, smoothstep } from "../../engine/math";
import { sheet } from "../shapes";

/** A sheet drops into a drop zone while the bar fills. Use for file, image and attachment uploads. */
export const upload = defineFigure({
  name: "Upload",
  label: "A sheet dropping into an upload zone",
  setup: ({ spring }) => ({
    z: spring(62), progress: spring(0, 120, 20), x: spring(0), y: spring(0), opacity: spring(1, 140, 22),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const lean = ctx.lean(20), shake = ctx.shake();
    let z = 62 - ctx.hover * 10, progress = 0, x = lean.x, y = lean.y, opacity = 1;

    if (state === "loading") {
      const q = ctx.progress(2.4);
      x = y = 0;
      if (ctx.determinate) {
        progress = q;
        z = 62 - 38 * smoothstep(q / 0.9);
        opacity = 1 - smoothstep((q - 0.92) / 0.08);
      } else {
        progress = smoothstep(q / 0.85);
        z = 62 - 38 * smoothstep(q / 0.7);
        opacity = 1 - smoothstep((q - 0.75) / 0.12);
        m.z.set(z); m.progress.set(progress); m.opacity.set(opacity); m.x.set(x); m.y.set(y);
      }
    } else if (state === "success") {
      progress = 1; z = 24; opacity = 0; x = y = 0;
    } else if (state === "error") {
      progress = 0.55; z = 44; x = y = 0;
    } else if (state === "empty") {
      z = 56;
    }

    const Z = m.z.to(z).value, P = m.progress.to(progress).value, O = m.opacity.to(opacity).value;
    const X = m.x.to(x).value + shake, Y = m.y.to(y).value;

    scene.box(0, 0, 0, 120, 92, 22, state === "success" ? "ok" : "base");
    scene.rect(-34, -28, 34, 28, 22, state === "success" ? "ok" : "ghost");
    scene.line([-48, 46, 9], [48, 46, 9], "faint", { bold: true });
    if (P > 0.01) scene.line([-48, 46, 9], [-48 + 96 * clamp(P), 46, 9], ctx.verdict("hi"), { bold: true });

    if (state === "empty") scene.box(X, Y, Z, 56, 44, 2, "ghost");
    else sheet(scene, X, Y, Z, 56, 44, state === "error" ? "err" : "base", O);

    if (state === "success") scene.check(0, 0, 22, "ok", ctx.fade());
    if (state === "error") scene.cross(X + 10, Y + 10, Z + 2, "err", ctx.fade());
  },
});
