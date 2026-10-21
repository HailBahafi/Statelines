import { defineFigure } from "../../core/define";
import { falloff } from "../../engine/math";

const MAX_ROWS = 8;
const COLS = 4;
const PITCH = 17;
const colX = (c: number) => -42 + c * 28;

/** Rows of a spreadsheet arrive one by one. Use for imports, CSV uploads and data syncs. `count`: rows, 1–8. */
export const table = defineFigure({
  name: "Table",
  label: "Rows of a spreadsheet arriving one by one",
  setup: ({ spring }) => ({
    rows: Array.from({ length: MAX_ROWS }, (_, r) => ({
      z: spring(r < 3 ? 4 : 28, 150, 20), opacity: spring(r < 3 ? 1 : 0, 150, 22),
    })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(4);
    const rows = ctx.count(5, MAX_ROWS, 1);
    const bad = Math.min(3, rows - 1);
    const rowY = (r: number) => -((rows - 1) * PITCH) / 2 + r * PITCH;
    let count = rows;
    if (state === "idle") count = Math.min(3, rows);
    if (state === "empty") count = 0;
    if (state === "loading") {
      const q = ctx.progress(rows * 0.5 + 0.7);
      count = ctx.determinate ? Math.round(q * rows) : Math.min(rows, Math.floor(q * (rows + 1.4)) + 1);
    }

    scene.box(0, 0, 0, 124, rows * PITCH + 12, 4, state === "success" ? "ok" : "base");

    m.rows.forEach((row, r) => {
      if (r >= rows) { row.z.set(28); row.opacity.set(0); return; }
      const y = rowY(r), present = r < count;
      let z = present ? 4 : 28;
      if (state === "idle" && present) z += 7 * ctx.hover * falloff(g.y - y, 8);
      const Z = row.z.to(z).value, O = row.opacity.to(present ? 1 : 0).value;

      if (state === "empty") {
        for (let c = 0; c < COLS; c++) scene.box(colX(c), y, 4, 24, 12, 2, "ghost");
        return;
      }
      const wrong = state === "error" && r === bad;
      const tone = wrong ? "err" : r === 0 ? "muted" : "base";
      for (let c = 0; c < COLS; c++) {
        scene.box(colX(c) + (wrong ? shake : 0), y, Z, 24, 12, r === 0 ? 5 : 3, tone, O);
      }
    });

    if (state === "success") scene.check(0, 0, 26, "ok", ctx.fade());
    if (state === "error") scene.cross(58 + shake, rowY(bad), 10, "err", ctx.fade());
  },
});
