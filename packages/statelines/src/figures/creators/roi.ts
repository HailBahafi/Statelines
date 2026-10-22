import { defineFigure } from "../../core/define";
import { bump, clamp, lerp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { coins } from "../shapes";

/**
 * Coin columns in front of a chart board. Both run along y, so on screen they climb from the
 * lower left to the upper right: what went in first, then what came back.
 */
const COLS = [52, 18, -16, -50];
const LINE_X = 16;
const R = 11;
const IDLE = [1, 3, 5, 7];
const WIN = [1, 3, 6, 9];
const LOSS = [3, 2, 1, 0];
/** The trend on the board: how far each point climbs, and the shape of a crash. */
const RISE = [-6, 6, 18, 32];
const CRASH = [26, 40, 44, 10];
const BOARD = { x: -30, w: 156, h: 66 };
const FACE = BOARD.x + 2.05;
/** A point on the board's face: u runs left to right on screen (along -y), v up from its foot. */
const at = (u: number, v: number): Vec3 => [FACE, -u, 12 + v];

/** A little spend goes into a campaign and more comes out. Use for ROI, campaign results and attribution. */
export const roi = /*#__PURE__*/ defineFigure({
  name: "Roi",
  label: "Coin columns rising in front of a chart with an upward trend",
  offset: 18,
  setup: ({ spring }) => ({
    cols: COLS.map((_, k) => spring(IDLE[k]!, 140, 18)),
    trend: spring(0.7, 120, 18),
    crash: spring(0, 120, 16),
    fall: spring(0, 90, 12),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let target = IDLE, trend = 0.7 + 0.3 * ctx.hover;
    if (state === "loading") {
      // The return builds column by column, up to the winning heights.
      const q = ctx.progress(3.2);
      const total = WIN.reduce((a, b) => a + b, 0);
      let left = Math.floor(q * (total + 1));
      target = WIN.map(n => { const k = Math.min(n, left); left -= k; return k; });
      trend = 0.15 + 0.85 * q;
    }
    if (state === "success") { target = WIN; trend = 1; }
    if (state === "error") { target = LOSS; trend = 1; }
    if (state === "empty") { target = [0, 0, 0, 0]; trend = 0; }
    const T = m.trend.to(trend).value;
    const C = m.crash.to(state === "error" ? 1 : 0).value;
    const F = m.fall.to(state === "error" ? 1 : 0).value;

    scene.box(-4, 0, 0, 96, 180, 4, "base");

    // The chart board: a panel on two feet, with axes, grid and the trend on its face.
    const board: Tone = empty ? "ghost" : "base";
    for (const y of [-BOARD.w / 2 + 10, BOARD.w / 2 - 10]) scene.box(BOARD.x, y, 4, 10, 6, 8, board);
    scene.box(BOARD.x, 0, 12, 4, BOARD.w, BOARD.h, board);
    if (!empty) {
      scene.polyline([at(-68, 58), at(-68, 6), at(70, 6)], "muted");
      for (const v of [23, 40, 57]) scene.line(at(-64, v), at(68, v), "faint");
      const line: Tone = state === "loading" ? "hi" : ctx.verdict("muted");
      const pts = [-58, -24, 10, 44].map((u, i): [number, number] => [u, lerp(20 + T * RISE[i]!, CRASH[i]!, C)]);
      scene.polyline(pts.map(([u, v]) => at(u, v)), line, { bold: true });
      // An arrowhead on the last point, along the last segment.
      const [eu, ev] = pts[3]!, [pu, pv] = pts[2]!;
      const a = Math.atan2(ev - pv, eu - pu);
      const tip: [number, number] = [eu + 8 * Math.cos(a), ev + 8 * Math.sin(a)];
      const wing = (d: number) => at(tip[0] + 9 * Math.cos(a + d), tip[1] + 9 * Math.sin(a + d));
      scene.polyline([at(eu, ev), at(tip[0], tip[1])], line, { bold: true });
      scene.polyline([wing(Math.PI - 0.55), at(tip[0], tip[1]), wing(Math.PI + 0.55)], line, { bold: true });
    }

    // The coin columns, farthest first. On a loss the last one has toppled and lies spread out.
    const building = target.findIndex((n, j) => n < WIN[j]!);
    for (let k = COLS.length - 1; k >= 0; k--) {
      const y = COLS[k]!;
      const n = Math.round(clamp(m.cols[k]!.to(target[k]!).value, 0, 9));
      const top: Tone = state === "loading" ? (k === building ? "hi" : "base")
        : k === 0 ? "base" : ctx.verdict();
      const X = LINE_X + (state === "error" ? shake : 0);
      if (empty) { scene.cylinder(X, y, 4, R, 2, "ghost"); continue; }
      if (n) coins(scene, X, y, 4, n, "base", top, R);
      // While loading, a coin drops onto the column being built.
      if (state === "loading" && k === Math.max(0, building)) {
        const f = ctx.loop(0.6);
        scene.cylinder(X, y, lerp(4 + n * 5 + 34, 4 + n * 5, f) + 6 * bump(f), R, 4, "hi", 1 - f * 0.4);
      }
    }
    // On a loss the last column has toppled: its coins lie spread out in front of it.
    if (F > 0.02) for (let i = 0; i < 4; i++) {
      const d = F * (3 + i * 6);
      scene.cylinder(LINE_X + 4 + d, COLS[3]! + 4 - d * 0.4, 4, R, 4, "err", clamp(F * 2));
    }
  },
});
