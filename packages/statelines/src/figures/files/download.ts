import { defineFigure } from "../../core/define";
import { bump, lerp, smoothstep } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge, sheet } from "../shapes";

const STORE: [number, number] = [-46, 6];
const STORE_S = 54;
const STORE_H = 44;
const TRAY: [number, number] = [40, -10];
const TRAY_Z = 4 + 6;

/** A sheet arcs out of storage onto a tray. Use for downloads and exports. */
export const download = defineFigure({
  name: "Download",
  label: "A sheet arcing out of storage onto a tray",
  offset: 0,
  setup: ({ spring }) => ({ p: spring(0, 110, 20), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(10);
    let p = 0, lift = ctx.hover * 10;

    if (state === "loading") {
      const q = ctx.progress(2.2);
      lift = 0;
      if (ctx.determinate) p = q;
      else { p = smoothstep(q / 0.85); m.p.set(p); m.lift.set(0); }
    } else if (state === "success") {
      p = 1;
    } else if (state === "error") {
      // Interrupted mid-flight.
      p = 0.5;
    }

    const P = m.p.to(p).value, L = m.lift.to(lift).value;
    const [sx, sy] = STORE, [tx, ty] = TRAY, top = 4 + STORE_H;
    const x = lerp(sx, tx, P) + lean.x * (1 - P) + shake;
    const y = lerp(sy, ty, P) + lean.y * (1 - P);
    const z = lerp(top + 2, TRAY_Z, P) + 40 * bump(P) + L * (1 - P);
    const empty = state === "empty";
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();

    scene.box(-3, -2, 0, 156, 84, 4, "base");

    // Storage: a cabinet with drawers on its face and a slot on top.
    const face = sy + STORE_S / 2 + 0.05;
    scene.box(sx, sy, 4, STORE_S, STORE_S, STORE_H, "base");
    for (const h of [18, 33]) {
      scene.line([sx - 22, face, 4 + h], [sx + 22, face, 4 + h], "muted");
      scene.line([sx - 5, face, 4 + h - 6], [sx + 5, face, 4 + h - 6], "muted", { bold: true });
    }
    scene.line([sx - 5, face, 4 + 38], [sx + 5, face, 4 + 38], "muted", { bold: true });
    scene.rect(sx - 18, sy - 3, sx + 18, sy + 3, top + 0.05, state === "loading" ? "hi" : "muted");

    // The tray, with a rim and the place the sheet lands.
    scene.box(tx, ty, 4, 62, 52, 6, state === "success" ? "ok" : "base");
    scene.rect(tx - 26, ty - 21, tx + 26, ty + 21, TRAY_Z + 0.05, "faint");

    if (empty) { scene.box(tx, ty, TRAY_Z, 44, 34, 2, "ghost"); return; }
    sheet(scene, x, y, z, 44, 34, tone);
    badge(scene, x, y, z + 2, state, ctx.fade(), 11);
  },
});
