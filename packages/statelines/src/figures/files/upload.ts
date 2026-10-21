import { defineFigure } from "../../core/define";
import { clamp, smoothstep } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge, sheet, tray } from "../shapes";

const FLOOR = 4 + 3;
const WALL = 14;
const HIGH = 66;

/** A sheet drops into a drop zone while the bar fills. Use for file, image and attachment uploads. */
export const upload = defineFigure({
  name: "Upload",
  label: "A sheet dropping into an upload zone",
  offset: -2,
  setup: ({ spring }) => ({
    z: spring(HIGH), progress: spring(0, 120, 20), x: spring(0), y: spring(0),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const lean = ctx.lean(16), shake = ctx.shake();
    let z = HIGH - ctx.hover * 10, progress = 0, x = lean.x, y = lean.y;

    if (state === "loading") {
      const q = ctx.progress(2.4);
      x = y = 0;
      if (ctx.determinate) {
        progress = q;
        z = HIGH - (HIGH - FLOOR) * smoothstep(q);
      } else {
        progress = smoothstep(q / 0.85);
        z = HIGH - (HIGH - FLOOR) * smoothstep(q / 0.85);
        m.z.set(z); m.progress.set(progress); m.x.set(x); m.y.set(y);
      }
    } else if (state === "success") {
      progress = 1; z = FLOOR; x = y = 0;
    } else if (state === "error") {
      // Stuck halfway: the sheet hangs above the zone and the bar stops.
      progress = 0.55; z = 40; x = y = 0;
    } else if (state === "empty") {
      z = FLOOR; x = y = 0;
    }

    const Z = m.z.to(z).value, P = m.progress.to(progress).value;
    const X = m.x.to(x).value + shake, Y = m.y.to(y).value;
    const empty = state === "empty";
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
    const drawSheet = () => {
      if (empty) scene.box(0, 0, FLOOR, 56, 44, 2, "ghost");
      else sheet(scene, X, Y, Z, 56, 44, tone);
      if (Z < FLOOR + 6) badge(scene, X, Y, Z + 2, state, ctx.fade(), 11);
    };

    scene.box(0, 10, 0, 132, 116, 4, "base");
    // The bar runs along the plate in front of the zone.
    scene.line([-48, 60, 4.05], [48, 60, 4.05], "faint", { bold: true });
    if (P > 0.01) scene.line([-48, 60, 4.05], [-48 + 96 * clamp(P), 60, 4.05], state === "loading" ? "hi" : ctx.verdict("hi"), { bold: true });

    // The zone is an open tray; the sheet is drawn inside it once it has dropped below the rim.
    const inside = Z < FLOOR + WALL;
    tray(scene, 92, 76, WALL, 4, state === "success" ? "ok" : "base", () => {
      if (!empty) scene.rect(-32, -26, 32, 26, FLOOR + 0.05, "ghost");
      if (inside) drawSheet();
    });
    if (!inside) {
      drawSheet();
      if (state === "error") badge(scene, X, Y, Z + 2, state, ctx.fade(), 11);
    }
  },
});
