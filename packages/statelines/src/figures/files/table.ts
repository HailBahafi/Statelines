import { defineFigure } from "../../core/define";
import type { Tone, Vec3 } from "../../engine/scene";

const MAX_ROWS = 8;
/** The monitor stands on the plate facing the lower left; the sheet is drawn on the plane of its face. */
const MY = 6;
const FACE = MY + 3 + 0.05;
const L = -56, RT = 56;
/** The formula bar, the header row of column letters, then the rows, from the top of the screen down. */
const BAR = [92, 99] as const;
const HEAD = 85;
const PITCH = 7;
const BOTTOM = HEAD - MAX_ROWS * PITCH;
/** The gutter of row numbers runs down the left; four columns fill the rest. */
const GUTTER = -46;
const COL = (RT - GUTTER) / 4;
const EDGES = [0, 1, 2, 3].map(k => GUTTER + k * COL);

/** A spreadsheet window whose rows arrive one by one. Use for imports, CSV uploads and data syncs. `count`: rows, 1–8. */
export const table = /*#__PURE__*/ defineFigure({
  name: "Table",
  label: "Rows arriving in a spreadsheet window",
  offset: 8,
  setup: ({ spring }) => ({
    rows: Array.from({ length: MAX_ROWS }, (_, r) => ({ opacity: spring(r < 3 ? 1 : 0, 150, 22), x: spring(0, 120, 14) })),
    sel: spring(2, 150, 20),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const rows = ctx.count(5, MAX_ROWS, 1);
    const bad = Math.min(3, rows - 1);
    const empty = state === "empty";
    let count = rows, typed = 1;
    if (state === "idle") count = Math.min(3, rows);
    if (state === "empty") count = 0;
    if (state === "error") count = bad + 1;
    if (state === "loading") {
      const q = ctx.progress(rows * 0.5 + 0.7);
      count = ctx.determinate ? Math.round(q * rows) : Math.min(rows, Math.floor(q * (rows + 1.4)) + 1);
      if (!ctx.determinate) typed = Math.min(1, Math.max(0, q * (rows + 1.4) - (count - 1)));
    }
    const frame: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    const P = (x: number, z: number, lift = 0): Vec3 => [x, FACE + lift, z];
    const top = (r: number) => HEAD - r * PITCH, mid = (r: number) => HEAD - (r + 0.5) * PITCH;

    scene.box(0, 0, 0, 150, 100, 4, "base");
    // The stand: a foot on the plate and a neck behind the screen.
    scene.box(0, MY - 2, 4, 44, 26, 3, frame);
    scene.box(0, MY - 7, 7, 10, 5, 20, frame);
    // The monitor, with a thicker chin below the screen.
    scene.box(0, MY, 22, 124, 6, 82, frame);
    if (empty) {
      scene.polyline([P(L, BAR[1]), P(RT, BAR[1]), P(RT, BOTTOM), P(L, BOTTOM)], "ghost", { closed: true });
      for (let r = 0; r <= MAX_ROWS; r += 2) scene.line(P(L, top(r)), P(RT, top(r)), "ghost");
      return;
    }
    scene.panel([P(L, 101), P(RT, 101), P(RT, BOTTOM), P(L, BOTTOM)], "base");
    scene.line(P(-3, 25.5), P(3, 25.5), "muted", { bold: true });
    // The formula bar: the function button, then the field with the active cell's contents.
    scene.polyline([P(L + 1, BAR[0]), P(L + 9, BAR[0]), P(L + 9, BAR[1]), P(L + 1, BAR[1])], "muted", { closed: true });
    scene.line(P(L + 3.5, (BAR[0] + BAR[1]) / 2), P(L + 6.5, (BAR[0] + BAR[1]) / 2), "muted", { bold: true });
    scene.polyline([P(L + 12, BAR[0]), P(RT - 1, BAR[0]), P(RT - 1, BAR[1]), P(L + 12, BAR[1])], "faint", { closed: true });
    // The header row of column letters and the gutter of row numbers.
    for (let c = 0; c < 4; c++) {
      const cx = GUTTER + (c + 0.5) * COL;
      scene.line(P(cx - 2, (HEAD + 91) / 2), P(cx + 2, (HEAD + 91) / 2), "muted", { bold: true });
    }
    for (let r = 0; r < MAX_ROWS; r++) scene.line(P(L + 3, mid(r)), P(L + 7, mid(r)), r < count ? "muted" : "faint");
    // The grid, each set of lines drawn as one path that doubles back along the border.
    const hz: Vec3[] = [], vt: Vec3[] = [];
    for (let r = 0; r <= MAX_ROWS + 1; r++) {
      const z = r === 0 ? 91 : top(r - 1), [a, b] = r % 2 ? [RT, L] : [L, RT];
      hz.push(P(a, z), P(b, z));
    }
    EDGES.forEach((x, k) => { const [a, b] = k % 2 ? [BOTTOM, 91] : [91, BOTTOM]; vt.push(P(x, a), P(x, b)); });
    scene.polyline(hz, "faint");
    scene.polyline(vt, "muted");

    // The cells of each row that has arrived: a label in the first column, figures in the rest.
    const cells = (r: number, tone: Tone, dx: number, dz: (x: number) => number, O: number, grow = 1, lift = 0) => {
      for (let c = 0; c < 4; c++) {
        const len = (c === 0 ? 14 : 8) + 6 * (((r * 7 + c * 3) % 5) / 4), a = c === 0 ? EDGES[0]! + 3 : EDGES[c]! + COL - 3 - len;
        const b = a + len * Math.max(0, Math.min(1, grow * 4 - c));
        if (b > a + 0.3) scene.line(P(a + dx, mid(r) + dz(a + dx), lift), P(b + dx, mid(r) + dz(b + dx), lift), tone, { opacity: O });
      }
    };
    let slid: (() => void) | undefined;
    m.rows.forEach((row, r) => {
      if (r >= rows) { row.opacity.set(0); row.x.set(0); return; }
      const present = r < count, wrong = state === "error" && r === bad;
      const O = row.opacity.to(present ? 1 : 0).value, X = row.x.to(wrong ? 22 : 0).value;
      if (O < 0.02) return;
      const arriving = state === "loading" && r === count - 1;
      const tone: Tone = wrong ? "err" : state === "success" ? "ok" : arriving ? "hi" : "muted";
      if (!wrong || X < 1) { cells(r, tone, 0, () => 0, O, arriving ? typed : 1); return; }
      // The bad row has slipped out of line and juts past the monitor's edge, tipping down.
      slid = () => {
        const dx = X + shake, dz = (x: number) => -Math.max(0, x - GUTTER - X) * 0.06 * (X / 22);
        const strip = [P(GUTTER + dx, top(r) + dz(GUTTER + dx), 2), P(RT + dx, top(r) + dz(RT + dx), 2),
          P(RT + dx, top(r) - PITCH + dz(RT + dx), 2), P(GUTTER + dx, top(r) - PITCH + dz(GUTTER + dx), 2)];
        scene.panel(strip, "err");
        cells(r, "err", dx, dz, O, 1, 2.05);
      };
    });

    // The selected cell: a heavy border with a fill handle. It follows the newest row; on success
    // it closes a total under the last column.
    const selRow = state === "error" ? bad : Math.max(0, count - 1) + (state === "idle" ? ctx.hover : 0);
    const S = Math.max(0, Math.min(MAX_ROWS - 1, m.sel.to(selRow).value));
    const col = state === "success" ? 3 : state === "loading" ? 0 : 1;
    const x0 = EDGES[col]!, x1 = x0 + COL, z1 = HEAD - S * PITCH, z0 = z1 - PITCH;
    const pen: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();
    scene.polyline([P(x0, z1), P(x1, z1), P(x1, z0), P(x0, z0)], pen, { closed: true, bold: true });
    scene.panel([P(x1 - 1.4, z0 + 1.4, 0.1), P(x1 + 1.4, z0 + 1.4, 0.1), P(x1 + 1.4, z0 - 1.4, 0.1), P(x1 - 1.4, z0 - 1.4, 0.1)], pen);
    if (state === "success") scene.line(P(x0 + 3, z1 - 0.9), P(x1 - 3, z1 - 0.9), "ok");
    slid?.();
  },
});
