import { defineFigure } from "../../core/define";
import { falloff } from "../../engine/math";
import type { Tone } from "../../engine/scene";

const MAX_ROWS = 8;
const PITCH = 13;
const W = 132;
const TITLE = 13;
const HEAD = 10;
/** The gutter of row numbers runs down the left; four columns fill the rest. */
const GUTTER = -53;
const COL = (W / 2 - GUTTER) / 4;
const EDGES = [1, 2, 3].map(k => GUTTER + k * COL);
const SLAB = 4 + 4;
const HIGH = 40;

/** A spreadsheet window whose rows arrive one by one. Use for imports, CSV uploads and data syncs. `count`: rows, 1–8. */
export const table = defineFigure({
  name: "Table",
  label: "Rows arriving in a spreadsheet window",
  offset: 2,
  setup: ({ spring }) => ({
    rows: Array.from({ length: MAX_ROWS }, (_, r) => ({
      z: spring(r < 3 ? SLAB : HIGH, 150, 20), opacity: spring(r < 3 ? 1 : 0, 150, 22), x: spring(0, 120, 14),
    })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(SLAB);
    const rows = ctx.count(5, MAX_ROWS, 1);
    const bad = Math.min(3, rows - 1);
    const empty = state === "empty";
    const D = TITLE + HEAD + rows * PITCH + 4, y0 = -D / 2, body = y0 + TITLE + HEAD;
    const rowY = (r: number) => body + r * PITCH + PITCH / 2;
    let count = rows;
    if (state === "idle") count = Math.min(3, rows);
    if (state === "empty") count = 0;
    if (state === "error") count = bad + 1;
    if (state === "loading") {
      const q = ctx.progress(rows * 0.5 + 0.7);
      count = ctx.determinate ? Math.round(q * rows) : Math.min(rows, Math.floor(q * (rows + 1.4)) + 1);
    }
    const frame: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";

    scene.box(0, 0, 0, W + 18, D + 18, 4, "base");
    // The window: its body, a title bar with three dots, and the header row of column letters.
    scene.box(0, 0, 4, W, D, 4, empty ? "ghost" : "base");
    scene.box(0, y0 + TITLE / 2, SLAB, W, TITLE, 2, frame);
    if (!empty) {
      for (let k = 0; k < 3; k++) scene.disc(-W / 2 + 8 + k * 7, y0 + TITLE / 2, SLAB + 2.05, 2.4, k === 0 && state === "error" ? "err" : "muted", { fill: true });
      scene.line([-12, y0 + TITLE / 2, SLAB + 2.05], [18, y0 + TITLE / 2, SLAB + 2.05], "muted");
      const hy = y0 + TITLE + HEAD / 2;
      scene.box((GUTTER + W / 2 - 1) / 2, hy, SLAB, W / 2 - 1 - GUTTER, HEAD - 2, 2, frame);
      for (let c = 0; c < 4; c++) {
        const cx = GUTTER + (c + 0.5) * COL;
        scene.line([cx - 3, hy, SLAB + 2.05], [cx + 3, hy, SLAB + 2.05], "muted", { bold: true });
      }
      scene.line([GUTTER, y0 + TITLE + 1, SLAB + 0.05], [GUTTER, D / 2 - 2, SLAB + 0.05], "faint");
    }

    // Rows that have landed go under the grid; a row still dropping is drawn over it.
    const falling: (() => void)[] = [];
    m.rows.forEach((row, r) => {
      if (r >= rows) { row.z.set(HIGH); row.opacity.set(0); row.x.set(0); return; }
      const y = rowY(r), present = r < count;
      if (empty) { scene.box(GUTTER / 2 + W / 4, y, SLAB, W / 2 - GUTTER - 2, PITCH - 2, 2, "ghost"); return; }
      let z = present ? SLAB : HIGH;
      if (state === "idle" && present) z += 6 * ctx.hover * falloff(g.y - y, 8);
      const wrong = state === "error" && r === bad;
      // The bad row slid off the side of the sheet.
      const Z = row.z.to(z).value, O = row.opacity.to(present ? 1 : 0).value, X = row.x.to(wrong ? 46 : 0).value;
      if (O < 0.02) return;
      const arriving = state === "loading" && r === count - 1;
      const tone: Tone = wrong ? "err" : state === "success" ? "ok" : arriving ? "hi" : "base";
      const draw = () => {
        const L = GUTTER + 1 + X + (wrong ? shake : 0), cx = L + (W / 2 - 1 - GUTTER) / 2, t = Z + 2.05;
        scene.box(cx, y, Z, W / 2 - 1 - GUTTER, PITCH - 2, 2, tone, O);
        for (let c = 0; c < 4; c++) {
          const a = L + c * COL + 4, len = (COL - 9) * (0.45 + 0.55 * (((r * 7 + c * 3) % 5) / 4));
          scene.line([a, y, t], [a + len, y, t], tone === "base" ? "muted" : tone, { opacity: O });
        }
        scene.line([GUTTER - 8, y, SLAB + 0.05], [GUTTER - 4, y, SLAB + 0.05], "muted", { opacity: O, bold: true });
      };
      if (Z > SLAB + 0.5 || X > 0.5) falling.push(draw); else draw();
    });
    if (!empty) for (const e of EDGES) scene.line([e, y0 + TITLE + 1, SLAB + 2.05], [e, D / 2 - 2, SLAB + 2.05], "muted");
    falling.forEach(f => f());
  },
});
