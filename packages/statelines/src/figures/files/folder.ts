import { defineFigure } from "../../core/define";
import { smoothstep } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { badge } from "../shapes";

const FILE_Y = [-26, -15, -4];
const BASE = 4;
const FLOOR = BASE + 6;

/** Files slide into an open folder. Use for projects, collections and empty folders. */
export const folder = defineFigure({
  name: "Folder",
  label: "Files sliding into an open folder",
  offset: 4,
  setup: ({ spring }) => ({
    open: spring(0.12, 120, 18),
    files: FILE_Y.map((_, k) => ({ z: spring(FLOOR + 2, 150, 20), opacity: spring(k < 2 ? 1 : 0, 150, 22) })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const open = { idle: 0.12 + 0.6 * Math.min(1, ctx.hover), loading: 0.5, success: 0.3, error: 0.45, empty: 0.85 }[state];
    const angle = m.open.to(open).value;
    const shell: Tone = state === "loading" ? "base" : ctx.verdict();

    scene.box(14, 0, 0, 152, 92, BASE, "base");
    scene.box(0, 0, BASE, 110, 76, 6, shell);
    scene.box(0, -36, FLOOR, 110, 4, 64, shell);
    scene.box(-34, -36, FLOOR + 64, 34, 4, 7, shell);

    const q = state === "loading" ? ctx.progress(2.4) * (ctx.determinate ? 0.9 : 1) : 0;
    m.files.forEach((file, k) => {
      let z = FLOOR + 2, opacity = 1, tone: Tone = "base";
      if (state === "idle") opacity = k < 2 ? 1 : 0;
      if (state === "empty") opacity = 0;
      if (state === "loading") {
        opacity = q > k * 0.25 ? 1 - smoothstep((q - 0.9) / 0.08) : 0;
        z = FLOOR + 2 + 60 * (1 - smoothstep((q - k * 0.25) / 0.18));
        if (!ctx.determinate) { file.z.set(z); file.opacity.set(opacity); }
        if (z > FLOOR + 3) tone = "hi";
      }
      // The last file will not go in: it hangs above the folder.
      if (state === "error" && k === 2) { z = 44; tone = "err"; }
      if (state === "success") tone = "ok";
      const Z = file.z.to(z).value, O = file.opacity.to(opacity).value;
      const x = tone === "err" ? shake : 0, face = FILE_Y[k]! + 1.55;
      scene.box(x, FILE_Y[k]!, Z, 88, 3, 50, tone, O);
      // A title line near the top of each file, clear of the front flap.
      scene.line([x - 36, face, Z + 42], [x - 8, face, Z + 42], "muted", { opacity: O });
      scene.line([x - 36, face, Z + 36], [x - 18, face, Z + 36], "faint", { opacity: O });
    });
    if (state === "empty") scene.box(0, FILE_Y[1]!, FLOOR + 2, 88, 3, 50, "ghost");

    const h = 46, top = FLOOR + h * Math.cos(angle), reach = 38 + h * Math.sin(angle);
    const front: Vec3[] = [[-55, 38, FLOOR], [55, 38, FLOOR], [55, reach, top], [-55, reach, top]];
    scene.panel(front, shell);

    badge(scene, 72, 6, BASE, state, ctx.fade());
  },
});
