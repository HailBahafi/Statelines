import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, wrap } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { facing } from "../shapes";

/** The calendar stands facing the viewer; (u, v) run across and up its face from the plate. */
const at = (u: number, v: number, front = 0): Vec3 => {
  const p = facing(0, 0, 4, u, v);
  return [p[0] + front, p[1] + front, p[2]];
};
const quad = (u0: number, v0: number, u1: number, v1: number, front = 0): Vec3[] =>
  [at(u0, v0, front), at(u1, v0, front), at(u1, v1, front), at(u0, v1, front)];

const ROWS = 4;
const COLS = 5;
const DEFAULT = { r: 2, c: 3 };
const cellU = (c: number) => -40 + c * 20;
const cellV = (r: number) => 66 - r * 15;
const CW = 16, CH = 12;
const RINGS = [-36, -20, -4, 12, 28, 44].map(u => u - 4);

/** A month of days with one picked. Use for booking, scheduling, date pickers and deadlines. */
export const calendar = /*#__PURE__*/ defineFigure({
  name: "Calendar",
  label: "A month of days with one picked",
  offset: 28,
  setup: ({ spring }) => ({
    lifts: Array.from({ length: ROWS * COLS }, () => spring(0)),
    drop: spring(0, 140, 15),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let pick: { r: number; c: number } | null = state === "loading" || empty ? null : DEFAULT;
    if (state === "idle" && ctx.pointer.over > 0.3) {
      // The pointer, read back onto the calendar's face.
      const u = ctx.pointer.x, v = 28 - 4 - ctx.pointer.y;
      const c = Math.round((u + 40) / 20), r = Math.round((66 - v) / 15);
      if (c >= 0 && c < COLS && r >= 0 && r < ROWS) pick = { r, c };
    }
    const D = m.drop.to(state === "error" ? 1 : 0).value;

    scene.box(0, 4, 0, 112, 92, 4, "base");
    // The stand: a strut behind and a foot on the plate.
    const body: Tone = empty ? "ghost" : "base";
    if (!empty) scene.line(at(0, 96, -2), [-32, -32, 4], "muted", { bold: true });
    scene.box(4, 4, 4, 30, 30, 3, body);

    // The board and its header band, with the edge showing behind.
    if (!empty) scene.panel(quad(-50, 8, 50, 100, -3), "base");
    scene.panel(quad(-50, 8, 50, 100, 0), body);
    scene.panel(quad(-50, 80, 50, 100, 0.2), body);
    // The binding: holes along the top and wire loops through them.
    RINGS.forEach(u => {
      scene.polyline(Array.from({ length: 9 }, (_, k) => {
        const a = (k / 8) * Math.PI;
        return at(u + 3 * Math.cos(a), 98 + 7 * Math.sin(a), 0.5);
      }), body === "ghost" ? "ghost" : "base", { bold: true });
    });
    if (empty) {
      scene.polyline(quad(-42, 18, 42, 74, 0.3), "ghost", { closed: true });
      return;
    }
    // The month's name and the weekday row.
    scene.line(at(-14, 90, 0.3), at(14, 90, 0.3), "base", { bold: true });
    for (let c = 0; c < COLS; c++) scene.line(at(cellU(c) - 4, 76, 0.3), at(cellU(c) + 4, 76, 0.3), "faint");

    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const on = !!pick && pick.r === r && pick.c === c;
      let lift = on ? 1 : 0;
      if (state === "loading") lift = bump(wrap(ctx.time * 0.9 - (r * COLS + c) * 0.04, 1) * 2.2);
      const L = m.lifts[r * COLS + c]!.to(lift).value;
      const u = cellU(c), v = cellV(r);
      const tone: Tone = on ? (state === "idle" ? "base" : ctx.verdict())
        : state === "loading" && L > 0.4 ? "hi"
        : c === COLS - 1 ? "faint" : "muted";
      if (on && state === "error") {
        // The day has fallen out of the month: a hole where it was, the tile on the plate below.
        scene.polyline(quad(u - CW / 2, v - CH / 2, u + CW / 2, v + CH / 2, 0.3), "err", { closed: true });
        const fv = lerp(v, -14, D), ff = lerp(0.3, 24, D);
        scene.panel(quad(u - CW / 2 + shake, fv - CH / 2, u + CW / 2 + shake, fv + CH / 2, ff), "err");
        scene.line(at(u - 4 + shake, fv + 1, ff + 0.1), at(u + 4 + shake, fv + 1, ff + 0.1), "err");
        continue;
      }
      // A day lifts off the page: its tile shifts up and left, over the dimmed slot it left.
      const k = clamp(L) * 2.5;
      if (k > 0.1) scene.polyline(quad(u - CW / 2, v - CH / 2, u + CW / 2, v + CH / 2, 0.3), "faint", { closed: true });
      const box = quad(u - CW / 2 - k, v - CH / 2 + k, u + CW / 2 - k, v + CH / 2 + k, 0.4);
      if (k > 0.1) scene.panel(box, tone);
      else scene.polyline(box, tone, { closed: true });
      if (on || (state === "loading" && L > 0.4)) {
        scene.line(at(u - 4 - k, v + k, 0.5), at(u + 3 - k, v + k, 0.5), tone, { bold: on });
      }
      if (on && state === "success") {
        // The booked day, circled.
        const o = ctx.fade(0.4);
        scene.polyline(Array.from({ length: 25 }, (_, n) => {
          const a = (n / 24) * Math.PI * 2 * o + 0.4;
          return at(u - k + 13 * Math.cos(a), v + k + 10 * Math.sin(a), 0.6);
        }), "ok", { bold: true });
      }
    }
  },
});
