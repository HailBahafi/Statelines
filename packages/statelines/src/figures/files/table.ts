import { defineFigure } from "../../core/define";
import { falloff } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge } from "../shapes";

const MAX_ROWS = 8;
const PITCH = 15;
const ROW_W = 104;
const ROW_X = -12;
/** Column edges, as offsets from the row's left end. The first column is wider, like a name column. */
const EDGES = [36, 60, 84];
const CELLS: [number, number][] = [[4, 28], [40, 54], [64, 78], [88, 100]];

/** Rows of a spreadsheet arrive one by one. Use for imports, CSV uploads and data syncs. `count`: rows, 1–8. */
export const table = defineFigure({
  name: "Table",
  label: "Rows of a spreadsheet arriving one by one",
  offset: 4,
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
    const left = ROW_X - ROW_W / 2;

    scene.box(0, 0, 0, 152, rows * PITCH + 22, 4, "base");

    m.rows.forEach((row, r) => {
      if (r >= rows) { row.z.set(28); row.opacity.set(0); return; }
      const y = rowY(r), present = r < count, header = r === 0;
      if (state === "empty") { scene.box(ROW_X, y, 4, ROW_W, PITCH - 3, 2, "ghost"); return; }
      let z = present ? 4 : 28;
      if (state === "idle" && present) z += 7 * ctx.hover * falloff(g.y - y, 8);
      const Z = row.z.to(z).value, O = row.opacity.to(present ? 1 : 0).value;
      const wrong = state === "error" && r === bad;
      const arriving = state === "loading" && r === count - 1;
      const tone: Tone = wrong ? "err" : state === "success" ? "ok" : arriving ? "hi" : header ? "muted" : "base";
      const x = ROW_X + (wrong ? shake : 0), h = header ? 5 : 3, t = Z + h + 0.05, L = left + (wrong ? shake : 0);
      scene.box(x, y, Z, ROW_W, PITCH - 3, h, tone, O);
      // Column rules across the row's top, and a value in each cell.
      for (const e of EDGES) scene.line([L + e, y - (PITCH - 3) / 2, t], [L + e, y + (PITCH - 3) / 2, t], "faint", { opacity: O });
      CELLS.forEach(([a, b], c) => {
        const end = header ? b : a + (b - a) * (0.45 + 0.55 * (((r * 7 + c * 3) % 5) / 4));
        scene.line([L + a, y, t], [L + end, y, t], header ? "base" : "muted", { opacity: O, bold: header });
      });
    });

    const by = state === "error" ? rowY(bad) : rowY(rows - 1);
    badge(scene, ROW_X + ROW_W / 2 + 18, by, 4, state, ctx.fade(), 11);
  },
});
