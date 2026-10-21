import { defineFigure } from "../../core/define";
import { smoothstep } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";

const FILE_Y = [-26, -15, -4];

/** Files slide into an open folder. Use for projects, collections and empty folders. */
export const folder = defineFigure({
  name: "Folder",
  label: "Files sliding into an open folder",
  setup: ({ spring }) => ({
    open: spring(0.12, 120, 18),
    files: FILE_Y.map((_, k) => ({ z: spring(8, 150, 20), opacity: spring(k < 2 ? 1 : 0, 150, 22) })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const open = { idle: 0.12 + 0.6 * Math.min(1, ctx.hover), loading: 0.5, success: 0.45, error: 0.45, empty: 0.85 }[state];
    const angle = m.open.to(open).value;

    scene.box(0, 0, 0, 110, 76, 6, "base");
    scene.box(0, -36, 6, 110, 4, 64, ctx.verdict());
    scene.box(-34, -36, 70, 34, 4, 7, ctx.verdict());

    const q = state === "loading" ? ctx.progress(2.4) * (ctx.determinate ? 0.9 : 1) : 0;
    m.files.forEach((file, k) => {
      let z = 8, opacity = 1, tone: "base" | "err" | "hi" = "base";
      if (state === "idle") opacity = k < 2 ? 1 : 0;
      if (state === "empty") opacity = 0;
      if (state === "loading") {
        opacity = q > k * 0.25 ? 1 - smoothstep((q - 0.9) / 0.08) : 0;
        z = 8 + 60 * (1 - smoothstep((q - k * 0.25) / 0.18));
        if (!ctx.determinate) { file.z.set(z); file.opacity.set(opacity); }
        if (z > 9) tone = "hi";
      }
      if (state === "error" && k === 2) { z = 36; tone = "err"; }
      const Z = file.z.to(z).value, O = file.opacity.to(opacity).value;
      scene.box(tone === "err" ? shake : 0, FILE_Y[k]!, Z, 88, 3, 50, tone, O);
    });

    const h = 46, top = 6 + h * Math.cos(angle), reach = 38 + h * Math.sin(angle);
    const front: Vec3[] = [[-55, 38, 6], [55, 38, 6], [55, reach, top], [-55, reach, top]];
    scene.panel(front, state === "empty" ? "base" : ctx.verdict());

    if (state === "success") scene.check(0, 6, 80, "ok", ctx.fade());
    if (state === "error") scene.cross(shake, -15, 92, "err", ctx.fade());
  },
});
