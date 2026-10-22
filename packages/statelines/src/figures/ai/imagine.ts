import { defineFigure } from "../../core/define";
import { clamp, hash2 } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { facing } from "../shapes";

/** The canvas on the easel faces the viewer; (u, v) run across and up it from the plate. */
const at = (u: number, v: number, front = 0): Vec3 => {
  const p = facing(0, 0, 4, u, v);
  return [p[0] + front, p[1] + front, p[2]];
};
const quad = (u0: number, v0: number, u1: number, v1: number, front = 0): Vec3[] =>
  [at(u0, v0, front), at(u1, v0, front), at(u1, v1, front), at(u0, v1, front)];

/** The picture area, and the grid of tiles it resolves through. */
const IMG = { l: -34, r: 34, b: 32, t: 92 };
const COLS = 6, ROWS = 5;
const TW = (IMG.r - IMG.l) / COLS, TH = (IMG.t - IMG.b) / ROWS;
const TILES = Array.from({ length: COLS * ROWS }, (_, n) => ({ i: n % COLS, j: Math.floor(n / COLS), seed: hash2(n % COLS, Math.floor(n / COLS)) }));
/** Tiles still unresolved at rest, and the row that glitches on error. */
const PENDING = new Set([0, 1, 6]);
const GLITCH_ROW = 2;

/** An image resolves tile by tile. Use for image generation, rendering and previews. */
export const imagine = /*#__PURE__*/ defineFigure({
  name: "Imagine",
  label: "An image resolving tile by tile",
  offset: 36,
  setup: ({ spring }) => ({ slip: spring(0, 150, 14), sun: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const q = state === "loading" ? ctx.progress(3) : 0;
    const reveal = state === "loading" ? (ctx.determinate ? q * 1.05 : Math.min(1.05, (q * 3) / 2.4)) : empty ? 0 : 1.05;
    const G = m.slip.to(state === "error" ? 1 : 0).value;
    const sun = m.sun.to(state === "idle" ? ctx.hover * 6 : 0).value;
    const frame: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "base";

    scene.box(0, 0, 0, 100, 84, 4, "base");
    // The easel: a back leg, two front legs and a ledge the canvas rests on.
    const leg = empty ? "ghost" : "base";
    // Empty, only the parts clear of the canvas are drawn, so dashes do not cross.
    const k = empty ? 19 / 118 : 1;
    if (!empty) scene.line(at(0, 112), [-30, -30, 4], "muted", { bold: true });
    scene.panel([at(-36, 0, 2), at(-31, 0, 2), at(-31 + 28 * k, 118 * k, 2), at(-36 + 28 * k, 118 * k, 2)], leg);
    scene.panel([at(31, 0, 2), at(36, 0, 2), at(36 - 28 * k, 118 * k, 2), at(31 - 28 * k, 118 * k, 2)], leg);
    scene.panel([at(-3, 112, 2.5), at(3, 112, 2.5), at(3, 121, 2.5), at(-3, 121, 2.5)], leg);

    // The canvas, its edge showing behind it.
    if (!empty) scene.panel(quad(-41, 25, 41, 99, 1), frame);
    scene.panel(quad(-41, 25, 41, 99, 3.5), frame);
    if (empty) {
      scene.polyline([at(IMG.l, 40, 3.6), at(-14, 70, 3.6), at(2, 54, 3.6), at(12, 62, 3.6), at(IMG.r, 44, 3.6)], "ghost");
      scene.panel(quad(-46, 19, 46, 25, 4), "ghost");
      return;
    }
    scene.polyline(quad(IMG.l, IMG.b, IMG.r, IMG.t, 3.6), "muted", { closed: true });

    // The picture: a sun over two ranges of hills.
    const F = 3.7;
    scene.panel(Array.from({ length: 16 }, (_, k) => {
      const a = (k / 16) * Math.PI * 2;
      return at(16 + 6 * Math.cos(a), 78 + sun + 6 * Math.sin(a), F);
    }), state === "success" ? "ok" : "muted");
    scene.panel([at(IMG.l, IMG.b, F), at(IMG.l, 56, F), at(-14, 76, F), at(2, 58, F), at(12, 66, F),
      at(IMG.r, 46, F), at(IMG.r, IMG.b, F)], "base");
    scene.polyline([at(IMG.l, 44, F + 0.1), at(-20, 52, F + 0.1), at(-2, 40, F + 0.1), at(18, 50, F + 0.1), at(IMG.r, 38, F + 0.1)], "muted");

    // The tiles the picture has not resolved through yet.
    for (const { i, j, seed } of TILES) {
      const n = j * COLS + i;
      const covered = state === "loading" ? seed >= reveal : state === "idle" && PENDING.has(n);
      if (!covered && !(state === "loading" && reveal - seed < 0.12 && reveal - seed >= 0)) continue;
      const front = state === "loading" && !covered;
      const u0 = IMG.l + i * TW, v0 = IMG.b + (ROWS - 1 - j) * TH;
      const tone: Tone = state === "idle" ? "muted" : "faint";
      if (front) scene.polyline(quad(u0, v0, u0 + TW, v0 + TH, F + 0.3), "hi", { closed: true });
      else scene.panel(quad(u0, v0, u0 + TW, v0 + TH, F + 0.3), tone);
    }

    // On error a slice of the picture has slipped sideways out of the frame.
    if (G > 0.02) {
      const v0 = IMG.b + (ROWS - 1 - GLITCH_ROW) * TH, du = 12 * G + shake;
      scene.panel(quad(IMG.l + du, v0, IMG.r + du, v0 + TH, F + 0.4), "err");
      scene.polyline([at(IMG.l + du, v0 + 4, F + 0.5), at(-14 + du, v0 + 9, F + 0.5), at(2 + du, v0 + 3, F + 0.5),
        at(12 + du, v0 + 6, F + 0.5), at(IMG.r + du, v0 + 2, F + 0.5)], "err");
    }

    // The ledge in front of the canvas.
    scene.panel(quad(-46, 19, 46, 25, 4), "base");

    if (state !== "error") {
      const tone: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : "muted";
      const pulse = state === "loading" ? 1 + 0.25 * Math.sin(ctx.time * 6) : 1;
      const s = at(54, 104);
      scene.sparkle(s[0], s[1], s[2], 9 * pulse, tone);
      const s2 = at(62, 88);
      scene.sparkle(s2[0], s2[1], s2[2], 5 * clamp(2 - pulse, 0.5, 1.5), tone, 0.8);
    }
  },
});
