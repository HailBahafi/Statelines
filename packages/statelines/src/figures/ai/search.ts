import { clamp, lerp } from "../../engine/math";
import { defineFigure } from "../../core/define";
import type { Tone, Vec3 } from "../../engine/scene";
import { facing } from "../shapes";

/** The monitor faces the viewer; (u, v) run across and up its face from the plate. */
const at = (u: number, v: number, front = 0): Vec3 => {
  const p = facing(0, 0, 4, u, v);
  return [p[0] + front, p[1] + front, p[2]];
};
const quad = (u0: number, v0: number, u1: number, v1: number, front = 0): Vec3[] =>
  [at(u0, v0, front), at(u1, v0, front), at(u1, v1, front), at(u0, v1, front)];
const ring = (u: number, v: number, r: number, front: number, steps = 28): Vec3[] =>
  Array.from({ length: steps }, (_, k) => {
    const a = (k / steps) * Math.PI * 2;
    return at(u + r * Math.cos(a), v + r * Math.sin(a), front);
  });

const ROWS = 3;
const rowV = (r: number) => 70 - r * 16;
const WORDS = [34, 26, 30];
/** The glass hangs this far in front of the screen; its handle points down and right. */
const LENS = 26, RIM = 17;

/** A lens over a list of results. Use for search, filters and "no results". */
export const search = defineFigure({
  name: "Search",
  label: "A lens moving over a list of results",
  offset: 26,
  setup: ({ spring }) => ({
    u: spring(8, 90, 19), v: spring(rowV(1), 90, 19), drop: spring(0, 150, 14),
    rows: Array.from({ length: ROWS }, () => spring(0)),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let u = 8, v = rowV(1);
    if (state === "idle") { u += ctx.hover * clamp(ctx.pointer.x / 4, -8, 8); v += ctx.hover * 4; }
    if (state === "loading") { u = 26 * Math.sin(ctx.time * 2.1); v = 54 + 16 * Math.sin(ctx.time * 1.3); }
    if (state === "success") { u = -8; v = rowV(1); }
    const D = m.drop.to(state === "error" ? 1 : 0).value;
    const U = m.u.to(u).value + shake, V = lerp(m.v.to(v).value, -2, D);

    scene.box(0, 6, 0, 116, 96, 4, "base");
    // The monitor: a foot, a neck, and the screen in its bezel.
    const body: Tone = empty ? "ghost" : "base";
    scene.box(-6, -6, 4, 34, 26, 3, body);
    scene.panel(quad(-5, 6, 5, 24, -8), body);
    if (!empty) scene.panel(quad(-52, 22, 52, 106, -3), "base");
    scene.panel(quad(-52, 22, 52, 106, 0), body);
    scene.polyline(quad(-46, 28, 46, 100, 0.1), empty ? "ghost" : "muted", { closed: true });

    // On the screen: a search bar, then results with a thumbnail, a title and a snippet.
    if (!empty) {
      scene.polyline(quad(-40, 86, 40, 94, 0.2), "muted", { closed: true });
      scene.line(at(-36, 90, 0.3), at(-4, 90, 0.3), "faint");
      scene.polyline(ring(33, 90.5, 2.4, 0.3, 10), "muted", { closed: true });
    }
    m.rows.forEach((row, r) => {
      const rv = rowV(r), near = Math.abs(V - rv) < 9 && D < 0.5;
      const lit = (state === "loading" && near) || (state === "success" && r === 1);
      const L = row.to(lit ? 1 : 0).value;
      if (empty || state === "error") {
        scene.panel(quad(-40, rv - 6, 40, rv + 6, 0.2), "ghost");
        return;
      }
      const tone: Tone = state === "success" && r === 1 ? "ok" : state === "loading" && near ? "hi" : "base";
      // A result card lifts off the screen while it is the one in view.
      const f = 0.2 + L * 3, dv = L * 3;
      scene.panel(quad(-40, rv - 6 + dv, 40, rv + 6 + dv, f), tone);
      scene.panel(quad(-37, rv - 4 + dv, -29, rv + 4 + dv, f + 0.1), tone === "base" ? "muted" : tone);
      scene.line(at(-25, rv + 2 + dv, f + 0.1), at(-25 + WORDS[r]!, rv + 2 + dv, f + 0.1), tone === "base" ? "base" : tone, { bold: true });
      scene.line(at(-25, rv - 2 + dv, f + 0.1), at(-25 + WORDS[r]! + 22, rv - 2 + dv, f + 0.1), "faint");
    });

    // The magnifying glass: a handle, a thick rim and the glass.
    const rim: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();
    const front = LENS, lv = V + front;
    const lens = (du: number, dv: number, f = front): Vec3 => at(U + du, lv + dv, f);
    // Empty, the screen alone is drawn: there is nothing to look through.
    if (empty) return;
    const h = 0.7071;
    const hq = (t0: number, t1: number, w: number): Vec3[] => [
      lens((RIM + t0) * h - w * h, -(RIM + t0) * h - w * h), lens((RIM + t1) * h - w * h, -(RIM + t1) * h - w * h),
      lens((RIM + t1) * h + w * h, -(RIM + t1) * h + w * h), lens((RIM + t0) * h + w * h, -(RIM + t0) * h + w * h),
    ];
    scene.panel(hq(0, 8, 4.5), rim);
    scene.panel(hq(8, 30, 3.5), rim);
    scene.panel(Array.from({ length: 28 }, (_, k) => {
      const a = (k / 28) * Math.PI * 2;
      return lens(RIM * Math.cos(a), RIM * Math.sin(a));
    }), rim);
    scene.panel(Array.from({ length: 28 }, (_, k) => {
      const a = (k / 28) * Math.PI * 2;
      return lens((RIM - 4) * Math.cos(a), (RIM - 4) * Math.sin(a), front + 0.1);
    }), "faint");
    // Through the glass the title under it reads larger.
    const r = clamp(Math.round((70 - V) / 16), 0, ROWS - 1);
    if (state !== "error" && Math.abs(V - rowV(r)) < 8) {
      const dv = (rowV(r) + 2 - V) * 1.5;
      if (Math.abs(dv) < 9) scene.line(lens(-9, dv, front + 0.2), lens(9, dv, front + 0.2), state === "success" ? "ok" : "base", { bold: true });
    }
    scene.polyline(Array.from({ length: 6 }, (_, k) => lens(9 * Math.cos(2 + k * 0.14), 9 * Math.sin(2 + k * 0.14), front + 0.2)), "muted");
  },
});
