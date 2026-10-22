import { defineFigure } from "../../core/define";
import { bump, lerp } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { envelope, person } from "../shapes";

const MAX = 6;
const PAD = 12;
/** The megaphone on its stand, aimed to the right and slightly toward the viewer. */
const STAND: [number, number] = [-64, 8];
const AXIS: Vec3 = (() => { const v: Vec3 = [1, -0.55, 0.12], l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; })();
const BACK: Vec3 = [-76, 16, 34];
const LENGTH = 50;
const MOUTH: Vec3 = [BACK[0] + AXIS[0] * LENGTH, BACK[1] + AXIS[1] * LENGTH, BACK[2] + AXIS[2] * LENGTH];
/** The creators stand on an arc to the right of the stand, spread evenly down the screen. */
const targets = (n: number) => Array.from({ length: n }, (_, k) => {
  const step = Math.min(0.42, 1.5 / Math.max(1, n - 1)), a = 0.15 + (k - (n - 1) / 2) * step;
  const sx = -56 + 120 * Math.cos(a), sy = -36 + 120 * Math.sin(a);
  return [sy + sx / 1.732, sy - sx / 1.732] as [number, number];
});

/** Screen position, for ordering the outline of the horn. */
const screen = ([x, y, z]: Vec3): [number, number] => [(x - y) * 0.866, (x + y) / 2 - z];

/** A ring of radius r around the axis at distance s from the back. */
function ring(s: number, r: number, steps = 18): Vec3[] {
  const e1: Vec3 = [-AXIS[1], AXIS[0], 0], l1 = Math.hypot(...e1);
  const u: Vec3 = [e1[0] / l1, e1[1] / l1, 0];
  const w: Vec3 = [AXIS[1] * u[2] - AXIS[2] * u[1], AXIS[2] * u[0] - AXIS[0] * u[2], AXIS[0] * u[1] - AXIS[1] * u[0]];
  const c: Vec3 = [BACK[0] + AXIS[0] * s, BACK[1] + AXIS[1] * s, BACK[2] + AXIS[2] * s];
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return [c[0] + r * (Math.cos(a) * u[0] + Math.sin(a) * w[0]), c[1] + r * (Math.cos(a) * u[1] + Math.sin(a) * w[1]), c[2] + r * (Math.cos(a) * u[2] + Math.sin(a) * w[2])] as Vec3;
  });
}

/** The outline of a set of points as seen on screen (gift wrapping), in 3D. */
function hull(points: Vec3[]): Vec3[] {
  const s = points.map(screen);
  let start = 0;
  s.forEach((p, i) => { if (p[0] < s[start]![0]) start = i; });
  const out: Vec3[] = [];
  let at = start;
  for (let guard = 0; guard < points.length; guard++) {
    out.push(points[at]!);
    let next = (at + 1) % points.length;
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = s[at]!, [bx, by] = s[next]!, [cx, cy] = s[i]!;
      if ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax) < 0) next = i;
    }
    at = next;
    if (at === start) break;
  }
  return out;
}

/** A megaphone on a stand: a flared horn with a handle and a wide mouth. */
function megaphone(scene: Scene, tone: Tone, lift: number) {
  const [sx, sy] = STAND, stand: Tone = tone === "ghost" ? "ghost" : "base";
  scene.cylinder(sx, sy, 4, 11, 3, stand);
  scene.cylinder(sx, sy, 7, 2.5, 18 + lift, stand);
  const up = (p: Vec3): Vec3 => [p[0], p[1], p[2] + lift];
  const back = ring(0, 7).map(up), mouth = ring(LENGTH, 22, 24).map(up);
  scene.panel(hull([...back, ...mouth]), tone);
  scene.panel(mouth, tone);
  if (tone === "ghost") return;
  scene.polyline([...ring(LENGTH, 15, 24), ring(LENGTH, 15, 24)[0]!].map(up), "faint");
  scene.polyline([...ring(LENGTH - 0.1, 5, 12), ring(LENGTH - 0.1, 5, 12)[0]!].map(up), "muted");
  // A band near the back where the hand holds it.
  scene.polyline(ring(12, 10.6, 18).slice(5, 15).map(up), "muted");
}

/** One brand messaging many creators at once. Use for outreach, campaigns invites and bulk messaging. `count`: creators, 2–6. */
export const outreach = /*#__PURE__*/ defineFigure({
  name: "Outreach",
  label: "A megaphone sending envelopes out to several creators",
  offset: 10,
  setup: ({ spring }) => ({ reached: Array.from({ length: MAX }, () => spring(0, 150, 20)), lift: spring(0), drop: spring(0, 110, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const n = ctx.count(4, MAX, 2);
    const spots = targets(n);
    const bad = n - 2;
    const lift = m.lift.to(state === "idle" ? ctx.hover * 6 : 0).value;
    const D = m.drop.to(state === "error" ? 1 : 0).value;
    const [mx, my, mz] = MOUTH;

    // The brand's corner: a plate under the megaphone stand.
    scene.box(STAND[0], STAND[1], 0, 40, 40, 4, "base");

    const q = state === "loading" ? ctx.progress(n * 0.5 + 0.4) * (n + 0.8) : 0;
    const items: { depth: number; draw: () => void }[] = [];
    items.push({ depth: STAND[0] + STAND[1] + 10, draw: () => megaphone(scene, empty ? "ghost" : state === "loading" ? "hi" : "base", lift) });
    spots.forEach(([tx, ty], k) => {
      const failed = state === "error" && k === bad;
      const reached = state === "success" || (state === "error" && !failed) || (state === "loading" && q > k + 1);
      const R = m.reached[k]!.to(reached ? 1 : 0).value;
      // The route runs along the floor from the stand's plate to the creator's pad.
      const dx = tx - STAND[0], dy = ty - STAND[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const from: Vec3 = [STAND[0] + ux * 26, STAND[1] + uy * 26, 0], to: Vec3 = [tx - ux * (PAD + 3), ty - uy * (PAD + 3), 0];
      if (!empty) scene.line(from, to, failed ? "err" : R > 0.5 ? (state === "success" ? "ok" : "muted") : "faint");
      const tone: Tone = empty ? "ghost" : failed ? "err" : R > 0.5 && state === "success" ? "ok" : "base";
      items.push({ depth: tx + ty, draw: () => {
        scene.cylinder(tx, ty, 0, PAD, 3, empty ? "ghost" : "base");
        person(scene, tx + (failed ? shake : 0), ty, 3, tone, undefined, 0.9);
        // A delivered letter lands at the creator's feet.
        if (R > 0.05) envelope(scene, tx + 9, ty + 9, 3, state === "success" ? "ok" : "base", R, 0.3);
      } });
      if (failed) {
        // The letter for this creator fell short and lies on the floor along the route.
        const f = 0.62, ex = lerp(mx, tx, f), ey = lerp(my, ty, f);
        items.push({ depth: ex + ey, draw: () => envelope(scene, ex, ey, lerp(mz, 0, D), "err", undefined, 0.42) });
      }
      if (state === "loading" && q > k && q < k + 1) {
        const p = q - k;
        items.push({ depth: 998, draw: () => envelope(scene, lerp(mx + 8, tx + 9, p), lerp(my, ty + 9, p), lerp(mz, 3, p) + 26 * bump(p), "hi", undefined, 0.42) });
      }
    });
    items.sort((a, b) => a.depth - b.depth).forEach(p => p.draw());
  },
});
