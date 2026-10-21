import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, nearestAngle, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { facing, faceArc, frontArc } from "../shapes";

const TAU = Math.PI * 2;
const K = Math.sqrt(3) / 2;
/** The direction toward the viewer: a face whose normal points along it is visible. */
const VIEW: Vec3 = [1, 1, 1];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const sx = (p: Vec3): number => (p[0] - p[1]) * K;
const sy = (p: Vec3): number => (p[0] + p[1]) / 2 - p[2];
/** The dim line tone used for creases and detail on a solid of tone `t`. */
const crease = (t: Tone): Tone => (t === "muted" || t === "faint" ? "faint" : "muted");

/** The outline, as seen on screen, of a cloud of points: their convex hull. */
function hull(points: readonly Vec3[]): Vec3[] {
  const pts = [...points].sort((p, q) => sx(p) - sx(q) || sy(p) - sy(q));
  if (pts.length < 3) return pts;
  const turn = (o: Vec3, a: Vec3, b: Vec3) => (sx(a) - sx(o)) * (sy(b) - sy(o)) - (sy(a) - sy(o)) * (sx(b) - sx(o));
  const lower: Vec3[] = [], upper: Vec3[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && turn(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && turn(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** A box turned any way: centre `c` and three half-axis vectors. Silhouette in the tone, creases dim. */
function obox(scene: Scene, c: Vec3, a: Vec3, b: Vec3, h: Vec3, tone: Tone, opacity?: number): void {
  const axes = [a, b, h];
  const corner = (s: readonly number[]): Vec3 => add(add(add(c, mul(a, s[0]!)), mul(b, s[1]!)), mul(h, s[2]!));
  const all: Vec3[] = [];
  for (const i of [-1, 1]) for (const j of [-1, 1]) for (const k of [-1, 1]) all.push(corner([i, j, k]));
  scene.panel(hull(all), tone, opacity);
  if (tone === "ghost") return;
  const sgn = axes.map(u => { const d = dot(u, VIEW); return Math.abs(d) < 1e-6 ? 0 : Math.sign(d); });
  for (let k = 0; k < 3; k++) {
    const i = (k + 1) % 3, j = (k + 2) % 3;
    if (!sgn[i] || !sgn[j]) continue;
    const s0 = [0, 0, 0];
    s0[i] = sgn[i]!;
    s0[j] = sgn[j]!;
    s0[k] = sgn[k] || 1;
    const s1 = [...s0];
    s1[k] = -s0[k]!;
    scene.line(corner(s0), corner(s1), crease(tone), { opacity });
  }
}

/** A round rod or drum from p0 to p1 with end radii r0 and r1, turned any way. */
function tube(scene: Scene, p0: Vec3, p1: Vec3, r0: number, r1: number, tone: Tone, opacity?: number): void {
  const d = unit(sub(p1, p0));
  const e1 = unit(cross(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const e2 = cross(d, e1);
  const ring = (p: Vec3, r: number, n = 14): Vec3[] => Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU;
    return add(p, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t))));
  });
  scene.panel(hull([...ring(p0, r0), ...ring(p1, r1)]), tone, opacity);
  if (tone === "ghost") return;
  const [p, r] = dot(d, VIEW) > 0 ? [p1, r1] : [p0, r0];
  if (r > 1.5) scene.polyline(ring(p, r, 18), crease(tone), { closed: true, opacity });
}

const toneOf = (state: string, rest: Tone = "base"): Tone =>
  state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : rest;

/* ------------------------------------------------------------------ Flight */

const FUSELAGE: readonly (readonly [number, number, number])[] = [
  [34, 0.8, 0.4], [31, 3.2, 0.2], [26, 5.2, 0], [18, 5.8, 0], [-14, 5.8, 0.2], [-25, 4, 1.6], [-33, 1.6, 3.4],
];

/** An airliner: fuselage, swept wings with engines, tailplane and fin, posed at `c`. */
function airliner(scene: Scene, c: Vec3, heading: number, pitch: number, roll: number, tone: Tone,
                  opts: { opacity?: number; shadow?: boolean; gear?: boolean } = {}): void {
  const k = 1, { opacity } = opts;
  const F: Vec3 = [Math.cos(heading) * Math.cos(pitch), Math.sin(heading) * Math.cos(pitch), Math.sin(pitch)];
  const S0: Vec3 = [-Math.sin(heading), Math.cos(heading), 0];
  const U0 = cross(F, S0);
  const S = add(mul(S0, Math.cos(roll)), mul(U0, Math.sin(roll)));
  const U = sub(mul(U0, Math.cos(roll)), mul(S0, Math.sin(roll)));
  const L = (a: number, s: number, u: number): Vec3 => add(c, add(mul(F, a * k), add(mul(S, s * k), mul(U, u * k))));
  const body: Vec3[] = [];
  for (const [a, r, u] of FUSELAGE) for (let i = 0; i < 10; i++) {
    const t = (i / 10) * TAU;
    body.push(L(a, r * Math.cos(t), u + r * Math.sin(t)));
  }
  const wing = (s: number): Vec3[] => [L(9, s * 5, -2), L(-9, s * 32, 0.6), L(-15.5, s * 32, 0.6), L(-7, s * 5, -2)];
  const stab = (s: number): Vec3[] => [L(-23, s * 2, 2.6), L(-31, s * 12.5, 3.2), L(-35.5, s * 12.5, 3.2), L(-32.5, s * 2, 2.6)];
  if (opts.shadow) {
    const flat = (p: Vec3): Vec3 => [p[0], p[1], 4.15];
    scene.panel(hull([...wing(1), ...wing(-1)].map(flat)), "faint", 0.5);
    scene.panel(hull(body.map(flat)), "faint", 0.5);
    return;
  }
  const near = dot(S, VIEW) >= 0 ? 1 : -1;
  const line = crease(tone);
  if (opts.gear && tone !== "ghost") {
    for (const s of [-1, 1]) scene.line(L(-3, s * 7, -4), L(-3, s * 7, -10), line, { bold: true, opacity });
    scene.line(L(22, 0, -4), L(22, 0, -10), line, { bold: true, opacity });
  }
  const engine = (s: number) => tube(scene, L(10, s * 13.5, -5.5), L(-3, s * 13.5, -5.5), 3.2 * k, 2.7 * k, tone, opacity);
  scene.panel(stab(-near), tone, opacity);
  scene.panel(wing(-near), tone, opacity);
  engine(-near);
  scene.panel(hull(body), tone, opacity);
  scene.panel([L(-18, 0, 5), L(-31, 0, 20), L(-37, 0, 20), L(-34.5, 0, 4)], tone, opacity);
  scene.panel(wing(near), tone, opacity);
  engine(near);
  scene.panel(stab(near), tone, opacity);
  if (tone === "ghost") return;
  // The cabin windows down the near side and the cockpit glass at the nose.
  for (let i = 0; i < 7; i++) {
    const a = 17 - i * 5;
    scene.line(L(a, near * 5.4, 1.6), L(a - 2.2, near * 5.4, 1.6), line, { bold: true, opacity });
  }
  scene.polyline([L(29.5, near * 2.4, 1.8), L(26.5, near * 4.4, 2.6), L(23.5, near * 5, 2.6)], line, { bold: true, opacity });
}

const FA: Vec3 = [-46, 30, 0], FC: Vec3 = [-10, -28, 0], FB: Vec3 = [32, -26, 0];
const bez = (t: number): Vec3 => {
  const u = 1 - t;
  return [u * u * FA[0] + 2 * u * t * FC[0] + t * t * FB[0], u * u * FA[1] + 2 * u * t * FC[1] + t * t * FB[1], 0];
};
const bezHeading = (t: number): number => {
  const dx = 2 * (1 - t) * (FC[0] - FA[0]) + 2 * t * (FB[0] - FC[0]);
  const dy = 2 * (1 - t) * (FC[1] - FA[1]) + 2 * t * (FB[1] - FC[1]);
  return Math.atan2(dy, dx);
};
const ROUTE = Array.from({ length: 25 }, (_, i) => bez(i / 24));
const altitude = (t: number): number => 13 + 38 * Math.pow(Math.sin(Math.PI * clamp(t)), 0.8);
const onFloor = (pts: readonly Vec3[], z = 4.2): Vec3[] => pts.map(p => [p[0], p[1], z] as Vec3);

/** A plane flying a route between two cities. Use for flights, trips and booking confirmations. */
export const flight = defineFigure({
  name: "Flight",
  label: "A plane flying a route between two cities",
  offset: 10,
  setup: ({ spring }) => ({ t: spring(0.45, 70, 16), turn: spring(0, 60, 14), lift: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let t = 0.45, opacity = 1;
    if (state === "loading") {
      const q = ctx.loop(3.4);
      t = q;
      opacity = smoothstep(q / 0.06) * (1 - smoothstep((q - 0.94) / 0.06));
      m.t.set(t);
    } else if (state === "success") t = 1;
    else if (state === "error") t = 0.5;
    const T = clamp(m.t.to(t).value);
    const turn = clamp(m.turn.to(state === "error" ? 1 : 0).value, 0, 1.1);
    const lift = m.lift.to(state === "idle" ? ctx.hover : 0).value;
    const tone = toneOf(state);
    const pad: Tone = empty ? "ghost" : "base";

    scene.box(0, 0, 0, 150, 112, 4, "base");
    // The origin city: a cluster of towers behind the start of the route.
    for (const [x, y, w, h] of [[-58, 8, 12, 30], [-42, 0, 10, 20], [-62, 26, 10, 16]] as const) {
      scene.box(x, y, 4, w, w, h, pad);
      if (!empty) scene.line([x - 2, y + w / 2 + 0.05, 8], [x - 2, y + w / 2 + 0.05, 4 + h - 4], "faint");
    }
    // The destination airport: a control tower beside a runway with a dashed centre line.
    scene.cylinder(52, -46, 4, 3, 26, pad);
    scene.cylinder(52, -46, 30, 7, 7, pad);
    scene.cylinder(52, -46, 37, 8, 1.5, pad);
    scene.box(38, -26, 4, 66, 16, 1.2, empty ? "ghost" : state === "success" ? "ok" : "muted");
    if (!empty) scene.line([10, -26, 5.3], [66, -26, 5.3], "ghost");

    // The route along the floor, and the part already flown.
    scene.polyline(onFloor(ROUTE), "ghost");
    let at = bez(T), heading = bezHeading(T), z = altitude(T), roll = 0;
    if (!empty && state !== "idle") {
      const n = Math.max(1, Math.floor(T * 24));
      const done = [...ROUTE.slice(0, n + 1).filter((_, i) => i / 24 < T), bez(T)];
      if (done.length > 1) scene.polyline(onFloor(done), tone, { bold: true, opacity: state === "loading" ? opacity : 1 });
    }
    if (state === "error" || turn > 0.01) {
      // Turned back: a U-turn off the route, banked, lower, nose pointing home.
      const th = Math.PI * turn, R = 16, S0: Vec3 = [-Math.sin(heading), Math.cos(heading), 0], F0: Vec3 = [Math.cos(heading), Math.sin(heading), 0];
      const arc: Vec3[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = (th * i) / 12;
        arc.push(add(at, add(mul(S0, R * (1 - Math.cos(a))), mul(F0, R * Math.sin(a)))));
      }
      if (state === "error") scene.polyline(onFloor(arc), "err", { bold: true });
      at = arc[arc.length - 1]!;
      heading += th;
      z -= 12 * turn;
      roll = -0.45 * smoothstep(turn);
    }
    if (empty) {
      airliner(scene, [at[0], at[1], z], heading, 0, 0, "ghost");
      return;
    }
    const pitch = state === "loading" ? clamp(Math.cos(Math.PI * T) * 0.22, -0.18, 0.22) : 0;
    const c: Vec3 = [at[0] + shake, at[1], z + lift * 8];
    if (c[2] > 18) airliner(scene, [c[0], c[1], 4], heading, 0, roll, tone, { shadow: true, opacity });
    airliner(scene, c, heading, pitch, roll + lift * 0.12, tone, { opacity, gear: c[2] < 24 });
  },
});

/* ------------------------------------------------------------------ Locate */

const FOLD_X = [-62, -21, 20, 61] as const, FOLD_Z = [4, 15, 4, 15] as const;
const mapZ = (x: number): number => {
  const cx = clamp(x, -62, 61);
  const i = Math.min(2, Math.max(0, Math.floor((cx + 62) / 41)));
  return lerp(FOLD_Z[i]!, FOLD_Z[i + 1]!, (cx - FOLD_X[i]!) / (FOLD_X[i + 1]! - FOLD_X[i]!));
};
const onMap = (x: number, y: number, dz = 0.15): Vec3 => [x, y, mapZ(x) + dz];
const PIN = { x: -12, y: 8 } as const;

/** A teardrop map pin with its tip at `tip`; `fall` 0 stands it up, 1 lays it on its side on the map. */
function mapPin(scene: Scene, tip: Vec3, fall: number, tone: Tone, opacity?: number): void {
  const R = 12, D = 27, phi = Math.asin(R / D);
  const outline: [number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const a = -phi + ((Math.PI + 2 * phi) * i) / 18;
    outline.push([R * Math.cos(a), D + R * Math.sin(a)]);
  }
  outline.push([0, 0]);
  // It topples to the right in its own plane and comes to rest on its side, following the fold.
  const ang = fall * (Math.PI / 2), w = clamp(fall);
  const side: Vec3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
  const uDir = mul(add(mul(side, Math.cos(ang)), [0, 0, -Math.sin(ang)]), Math.sqrt(2 / 3));
  const vDir = add(mul(side, Math.sin(ang) * 0.85), [0, 0, Math.cos(ang)]);
  const back: Vec3 = [-2.4, -0.6, 0.6];
  const base = add(tip, [0, 0, R * 0.82 * Math.sin(ang)]);
  const at = (u: number, v: number, deep: number): Vec3 => {
    const p = add(add(base, mul(uDir, u)), add(mul(vDir, v), mul(back, deep)));
    return [p[0], p[1], p[2] + (mapZ(p[0]) - mapZ(tip[0])) * w];
  };
  scene.panel(outline.map(([u, v]) => at(u, v, 1)), tone, opacity);
  scene.panel(outline.map(([u, v]) => at(u, v, 0)), tone, opacity);
  if (tone === "ghost") return;
  const hole = Array.from({ length: 14 }, (_, i) => at(4.6 * Math.cos((i / 14) * TAU), D + 4.6 * Math.sin((i / 14) * TAU), 0));
  scene.panel(hole, crease(tone), opacity);
  scene.polyline([at(-8.5, D + 4, 0), at(-6, D + 8, 0), at(-2, D + 9.6, 0)], crease(tone), { opacity });
}

/** A map pin dropped on a map. Use for location, places and pickups. */
export const locate = defineFigure({
  name: "Locate",
  label: "A map pin dropping onto a folded map",
  offset: 10,
  setup: ({ spring }) => ({ drop: spring(22, 170, 15), fall: spring(0, 90, 12) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let z = 22 + ctx.hover * 10, ring = 10;
    if (state === "loading") {
      const q = ctx.loop(1.4);
      z = 30 * (1 - Math.pow(2 * q - 1, 2));
      ring = 8 + 8 * q;
      m.drop.set(z);
    }
    if (state === "success" || state === "error") z = 0;
    const Z = Math.max(0, m.drop.to(z).value);
    const fall = clamp(m.fall.to(state === "error" ? 1 : 0).value, 0, 1.05);
    const tone = toneOf(state);
    const paper: Tone = empty ? "ghost" : "base";

    scene.box(0, 0, 0, 150, 116, 4, "base");
    // The map: three folded panels in a zigzag, with roads, a river and a park printed across them.
    for (let i = 0; i < 3; i++) {
      const x0 = FOLD_X[i]!, x1 = FOLD_X[i + 1]!, z0 = FOLD_Z[i]!, z1 = FOLD_Z[i + 1]!;
      scene.panel([[x0, -44, z0], [x1, -44, z1], [x1, 44, z1], [x0, 44, z0]], paper);
    }
    const tx = PIN.x + shake, ty = PIN.y;
    if (!empty) {
      const road: Vec3[] = [];
      for (let x = -60; x <= 59; x += 3) road.push(onMap(x, 20 * Math.sin((x + 14) / 26) - 4));
      scene.polyline(road, "muted", { bold: true });
      scene.polyline([onMap(-40, -44), onMap(-40, 44)], "muted");
      const river: Vec3[] = [];
      for (let x = 22; x <= 59; x += 3) river.push(onMap(x, -30 + 6 * Math.sin(x / 6) + (x - 22) * 0.3));
      scene.polyline(river, "faint", { bold: true });
      scene.polyline([onMap(-58, 18), onMap(-46, 18), onMap(-46, 34), onMap(-58, 34)], "faint", { closed: true });
      scene.polyline([onMap(28, 14), onMap(50, 14), onMap(50, 30), onMap(28, 30)], "faint", { closed: true });
      // The spot the pin is for: a ring printed on the map.
      const ringPts = Array.from({ length: 24 }, (_, i) => onMap(tx + ring * Math.cos((i / 24) * TAU), ty + ring * Math.sin((i / 24) * TAU), 0.25));
      const ringTone: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "faint";
      scene.polyline(ringPts, ringTone, { closed: true, bold: state === "success" });
      if (fall < 0.5) scene.disc(tx, ty, mapZ(tx) + 0.2, Math.max(2.5, 6.5 - Z * 0.12), "faint", { fill: true, opacity: 0.8 });
    }
    mapPin(scene, [tx, ty, mapZ(tx) + 0.2 + Z], fall, tone);
  },
});

/* ------------------------------------------------------------------ Keycard */

/** A hotel key card sliding into a door reader. Use for check-in, room access and bookings. */
export const keycard = defineFigure({
  name: "Keycard",
  label: "A key card sliding into a door lock",
  offset: 27,
  setup: ({ spring }) => ({ depth: spring(0, 150, 16), lift: spring(10, 150, 16), tilt: spring(0, 120, 12), open: spring(0, 70, 14), lever: spring(0, 160, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let depth = 0, lift = 12 - ctx.hover * 7, lit = false;
    if (state === "loading") {
      const q = ctx.loop(1.8);
      depth = 18 * smoothstep(q / 0.45) * (1 - smoothstep((q - 0.7) / 0.3));
      lift = 0;
      lit = q > 0.42 && q < 0.7;
      m.depth.set(depth);
      m.lift.set(0);
    }
    if (state === "success") { depth = 18; lift = 0; }
    if (state === "error") { depth = 0; lift = 16; }
    const Dp = m.depth.to(depth).value, Lf = m.lift.to(lift).value;
    const tau = m.tilt.to(state === "error" ? 0.38 : 0).value;
    const th = clamp(m.open.to(state === "success" ? 0.5 : 0).value, -0.05, 0.6);
    const beta = m.lever.to(state === "success" ? 0.75 : 0).value;
    const frame: Tone = empty ? "ghost" : "base";
    const verdict: Tone = state === "success" ? "ok" : state === "error" ? "err" : "base";

    // The leaf swings toward the viewer about its hinge on the left jamb.
    const c = Math.cos(th), s = Math.sin(th);
    const rv = (u: number, w: number, z: number): Vec3 => [u * c - w * s, u * s + w * c, z];
    const leaf = (u: number, w: number, z: number): Vec3 => add([-34, 0, 0], rv(u, w, z));

    scene.box(0, 0, 0, 150, 76, 4, "base");
    scene.box(-52, 0, 4, 20, 8, 90, frame);
    scene.box(-38, 0, 4, 8, 10, 84, frame);
    if (th > 0.01 && !empty) {
      // The room beyond the open doorway.
      scene.panel([[-34, -3, 4], [34, -3, 4], [34, -3, 88], [-34, -3, 88]], "faint");
      scene.line([-34, -3, 4], [34, -3, 4], "muted");
    }
    obox(scene, leaf(34, 0, 46), rv(34, 0, 0), rv(0, 2.5, 0), [0, 0, 42], empty ? "ghost" : state === "success" ? "ok" : "base");
    if (!empty) {
      const rect = (u0: number, u1: number, z0: number, z1: number): Vec3[] =>
        [leaf(u0, 2.6, z0), leaf(u1, 2.6, z0), leaf(u1, 2.6, z1), leaf(u0, 2.6, z1)];
      scene.polyline(rect(6, 42, 50, 80), "faint", { closed: true });
      scene.polyline(rect(6, 42, 10, 44), "faint", { closed: true });
      // The room number plaque.
      obox(scene, leaf(24, 3.2, 70), rv(7, 0, 0), rv(0, 0.6, 0), [0, 0, 3.5], "muted");
    }

    scene.box(38, 0, 4, 8, 10, 84, frame);
    scene.box(52, 0, 4, 20, 8, 90, frame);
    scene.box(0, 0, 88, 84, 10, 6, frame);

    // The card: hotel logo and a line near its top, pushed down into the slot.
    const cardTone: Tone = empty ? "ghost" : state === "loading" ? "hi" : verdict;
    const cz = 72 + 15 + Lf - Dp, cu = 56 + tau * 8;
    const ca = rv(9.5 * Math.cos(tau), 0, 9.5 * Math.sin(tau)), ch = rv(-15 * Math.sin(tau), 0, 15 * Math.cos(tau));
    const cc = add(leaf(cu, 4.5, cz), [shake, 0, 0]);
    obox(scene, cc, ca, rv(0, 0.7, 0), ch, cardTone);
    if (!empty && Dp < 9) {
      const on = (x: number, y: number): Vec3 => add(add(cc, rv(0, 0.8, 0)), add(mul(ca, x), mul(ch, y)));
      scene.polyline(Array.from({ length: 13 }, (_, i) => on(-0.3 + 0.32 * Math.cos((i / 12) * TAU), 0.55 + 0.21 * Math.sin((i / 12) * TAU))), crease(cardTone), { closed: true });
      scene.line(on(-0.7, 0.1), on(0.6, 0.1), crease(cardTone));
      scene.line(on(-0.7, -0.15), on(0.2, -0.15), crease(cardTone));
    }

    // The lock: a tall escutcheon with the card slot on top, a status light and a lever handle.
    const lockTone: Tone = empty ? "ghost" : verdict;
    obox(scene, leaf(56, 4.5, 49), rv(7, 0, 0), rv(0, 2, 0), [0, 0, 23], lockTone);
    if (empty) return;
    scene.line(leaf(50.5, 4.5, 72.1), leaf(61.5, 4.5, 72.1), "muted", { bold: true });
    const led: Tone = state === "loading" ? (lit ? "hi" : "faint") : state === "idle" ? "muted" : verdict;
    obox(scene, leaf(56, 6.7, 65), rv(2, 0, 0), rv(0, 0.3, 0), [0, 0, 2], led);
    tube(scene, leaf(56, 6.5, 40), leaf(56, 10.5, 40), 2.8, 2.8, lockTone);
    tube(scene, leaf(56, 10.5, 40), leaf(56 - 21 * Math.cos(beta), 10.5, 40 - 21 * Math.sin(beta)), 2, 2, lockTone);
  },
});

/* ------------------------------------------------------------------ Luggage */

/** A suitcase with a zip opening. Use for packing, trip planning and luggage. `count`: items, 1–4. */
export const luggage = defineFigure({
  name: "Luggage",
  label: "A suitcase with items going in",
  offset: 14,
  setup: ({ spring }) => ({ close: spring(0, 60, 13), lid: spring(1.85, 120, 15) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const n = ctx.count(2, 4, 1);
    let packed = state === "idle" || state === "success" || state === "error" ? n : 0, falling = -1, fz = 0, fo = 1;
    if (state === "loading") {
      const q = ctx.progress(n + 1);
      packed = Math.floor(q * n);
      const f = q * n - packed;
      falling = Math.min(n - 1, packed);
      fz = 46 * (1 - smoothstep(f / 0.8));
      fo = smoothstep(f / 0.15);
    }
    const C = clamp(m.close.to(state === "success" ? 2 : 0).value, 0, 2);
    const lidTarget = state === "error" ? 0.55 : state === "idle" ? 1.85 - ctx.hover * 0.18 : 1.85;
    const phi = clamp(m.lid.to(lidTarget).value * (1 - clamp(C)), 0, 2);
    const alpha = smoothstep(C - 1) * (Math.PI / 2);
    const shell: Tone = empty ? "ghost" : ctx.verdict();
    const line = crease(shell);
    const X = shake;

    scene.box(0, 0, 0, 150, 124, 4, "base");

    // The case on its back, or standing on its wheels: local x across, y along, z through the shell.
    const zc = 4 + 15.5 * Math.cos(alpha) + 40 * Math.sin(alpha) + 4 * Math.sin(alpha);
    const T = (x: number, y: number, z: number): Vec3 => [
      X + x, y * Math.cos(alpha) + z * Math.sin(alpha), zc - y * Math.sin(alpha) + z * Math.cos(alpha),
    ];
    const R = (x: number, y: number, z: number): Vec3 => [x, y * Math.cos(alpha) + z * Math.sin(alpha), -y * Math.sin(alpha) + z * Math.cos(alpha)];
    // Spinner wheels at the bottom end: the back pair always, the front pair once it stands.
    const wheels = (front = false) => {
      if (empty || (front && alpha < 0.3)) return;
      const dz = front ? 10 : -10;
      for (const x of [-19, 19]) tube(scene, T(x - 2.6, 43, dz), T(x + 2.6, 43, dz), 4, 4, "muted");
    };
    const handle = () => {
      if (empty) return;
      const e = 20 * smoothstep(alpha / (Math.PI / 2));
      tube(scene, T(-27.5, -10, 0), T(-27.5, 10, 0), 2.2, 2.2, shell);
      if (e < 1) return;
      for (const x of [-13, 13]) tube(scene, T(x, -38, -10), T(x, -40 - e, -10), 1.4, 1.4, "muted");
      tube(scene, T(-15, -40 - e, -10), T(15, -40 - e, -10), 2.6, 2.6, shell);
    };

    if (C >= 1) {
      // Closed and upright: one shell with ribs on the lid and the zip round its middle.
      if (alpha > 0.6) wheels();
      handle();
      obox(scene, T(0, 0, 0), R(27, 0, 0), R(0, 40, 0), R(0, 0, 15.5), shell);
      if (empty) return;
      for (const x of [-19, 19]) scene.line(T(x, -34, 15.6), T(x, 34, 15.6), line);
      // One travel sticker on the lid for each item packed.
      for (let k = 0; k < n; k++) {
        const y = -24 + k * 15;
        if (k % 2) scene.polyline(Array.from({ length: 12 }, (_, i) => T(5.5 * Math.cos((i / 12) * TAU), y + 5.5 * Math.sin((i / 12) * TAU), 15.6)), line, { closed: true });
        else scene.polyline([T(-8, y - 4.5, 15.6), T(8, y - 4.5, 15.6), T(8, y + 4.5, 15.6), T(-8, y + 4.5, 15.6)], line, { closed: true });
      }
      const zip = 3.5;
      if (dot(R(1, 0, 0), VIEW) > 0) scene.line(T(27.1, -40, zip), T(27.1, 40, zip), line);
      if (dot(R(0, 1, 0), VIEW) > 0) scene.line(T(-27, 40.1, zip), T(27, 40.1, zip), line);
      if (dot(R(0, -1, 0), VIEW) > 0) scene.line(T(-27, -40.1, zip), T(27, -40.1, zip), line);
      if (alpha <= 0.6) wheels();
      wheels(true);
      return;
    }

    // Open on its back: the lid stands on its hinge along the left edge.
    const lidPt = (dx: number, y: number, dz: number): Vec3 => [X - 27 + dx * Math.cos(phi) - dz * Math.sin(phi), y, 23 + dx * Math.sin(phi) + dz * Math.cos(phi)];
    const lidAxis = (dx: number, dz: number): Vec3 => [dx * Math.cos(phi) - dz * Math.sin(phi), 0, dx * Math.sin(phi) + dz * Math.cos(phi)];
    const drawLid = () => {
      obox(scene, lidPt(27, 0, 6), lidAxis(27, 0), [0, 40, 0], lidAxis(0, 6), shell);
      if (empty) return;
      if (phi > 0.8) {
        // The inside of the lid: a zipped mesh pocket.
        scene.polyline([lidPt(8, 4, -0.2), lidPt(46, 4, -0.2), lidPt(46, 34, -0.2), lidPt(8, 34, -0.2)], line, { closed: true });
        scene.line(lidPt(8, -2, -0.2), lidPt(46, -2, -0.2), line);
      } else if (dot(lidAxis(0, 1), VIEW) > 0) {
        for (const dx of [13, 27, 41]) scene.line(lidPt(dx, -34, 12.1), lidPt(dx, 34, 12.1), line);
      }
    };
    if (phi > 0.75) drawLid();
    const spots: [number, number][] = [[-11, -17], [11, -17], [-11, 17], [11, 17]];
    const item = (k: number, x: number, y: number, z: number, tone: Tone, opacity?: number) => {
      // Folded clothes: a flat stack with a collar line and a fold.
      scene.box(x, y, z, 20, 30, 11, tone, opacity);
      scene.polyline([[x - 6, y - 15 + 0.2, z + 11.05], [x, y - 9, z + 11.05], [x + 6, y - 15 + 0.2, z + 11.05]], crease(tone), { opacity });
      if (k % 2) scene.line([x - 10, y + 3, z + 11.05], [x + 10, y + 3, z + 11.05], crease(tone), { opacity });
    };
    const inside = () => {
      if (empty) return;
      for (let k = 0; k < Math.min(packed, n); k++) {
        const [x, y] = spots[k]!;
        if (state === "error" && k === n - 1) continue;
        item(k, X + x, y, 7, "base");
      }
      if (falling >= 0) {
        const [x, y] = spots[falling]!;
        item(falling, X + x, y, 7 + fz, "hi", fo);
      }
      if (packed > 0 && state !== "error") {
        scene.line([X - 24, -8, 18.4], [X + 24, -8, 18.4], "muted");
        scene.line([X - 24, 8, 18.4], [X + 24, 8, 18.4], "muted");
      }
    };
    // The base: an open tray with the wheels and side handle on its outside.
    const t = 3, w = 54, d = 80, wall = 16;
    scene.box(X, 0, 4, w, d, t, shell);
    scene.box(X - w / 2 + t / 2, 0, 4 + t, t, d, wall, shell);
    scene.box(X, -d / 2 + t / 2, 4 + t, w, t, wall, shell);
    inside();
    scene.box(X + w / 2 - t / 2, 0, 4 + t, t, d, wall, shell);
    scene.box(X, d / 2 - t / 2, 4 + t, w, t, wall, shell);
    if (!empty) scene.line([X - 27, 40.05, 20], [X + 27, 40.05, 20], line);
    handle();
    wheels();
    if (state === "error" && !empty) {
      // One item too many: it sticks out over the front wall and the lid will not shut.
      const [x, y] = spots[n - 1]!;
      scene.box(X + x + 13, y, 12, 20, 30, 11, "err");
      scene.line([X + x + 3, y, 23.1], [X + x + 23, y, 23.1], "err");
    }
    if (phi <= 0.75) drawLid();
  },
});

/* ------------------------------------------------------------------ Passport */

/** A passport with its stamp pressed. Use for identity, verification of travel documents, and entry. */
export const passport = defineFigure({
  name: "Passport",
  label: "An open passport and a rubber stamp",
  offset: 12,
  setup: ({ spring }) => ({ stamp: spring(30, 170, 15), tip: spring(0, 60, 11), ink: spring(0, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let z = 30 - ctx.hover * 10;
    if (state === "loading") {
      const q = ctx.loop(1.3);
      z = 30 * (1 - bump(clamp((q - 0.35) / 0.4)));
      m.stamp.set(z);
    }
    if (state === "success") z = 38;
    if (state === "error") z = 0;
    const Z = Math.max(0, m.stamp.to(z).value);
    const fall = clamp(m.tip.to(state === "error" ? 1 : 0).value, 0, 1.04);
    const ink = clamp(m.ink.to(state === "success" ? 1 : 0).value);
    const paper: Tone = empty ? "ghost" : "base";
    const top = 9.05, IX = 18, IY = 26;

    scene.box(0, 0, 0, 164, 128, 4, "base");
    // The ink pad: a flat tin with the pad inside.
    scene.box(-62, 36, 4, 22, 30, 5, paper);
    if (!empty) scene.rect(-70, 24, -54, 48, 9.05, "muted");

    // The open passport: cover, the data page beyond the spine and the visa page in front.
    scene.box(6, 0, 4, 88, 116, 2, empty ? "ghost" : "muted");
    scene.box(6, -27.5, 6, 82, 53, 3, paper);
    scene.box(6, 27.5, 6, 82, 53, 3, paper);
    if (!empty) {
      scene.line([-35, 0, top], [47, 0, top], "muted");
      // The data page: a portrait photo, lines of details and the machine-readable strip.
      scene.rect(-30, -50, -10, -24, top, "muted");
      scene.disc(-20, -41, top, 4, "faint");
      scene.arc(-20, -31, top, 7.5, Math.PI * 1.1, Math.PI * 1.9, "faint");
      for (let k = 0; k < 3; k++) scene.line([-4, -48 + k * 7, top], [k === 2 ? 18 : 38, -48 + k * 7, top], "faint");
      scene.line([-30, -15, top], [42, -15, top], "faint", { bold: true });
      scene.line([-30, -9, top], [42, -9, top], "faint", { bold: true });
      // An old entry stamp on the visa page.
      scene.rect(-30, 32, -10, 50, top, "faint");
      scene.line([-26, 41, top], [-14, 41, top], "faint");
    }

    // The fresh imprint, where the stamp came down.
    if (!empty && ink > 0.02) {
      scene.disc(IX, IY, top, 13, "ok", { opacity: ink });
      scene.disc(IX, IY, top, 9.5, "ok", { opacity: ink });
      scene.line([IX - 6, IY - 2, top], [IX + 6, IY - 2, top], "ok", { opacity: ink, bold: true });
      scene.line([IX - 4, IY + 3, top], [IX + 4, IY + 3, top], "ok", { opacity: ink });
    }
    if (state === "error") {
      // A smeared half print where it slipped.
      const f = ctx.fade(0.5);
      scene.arc(IX, IY, top, 13, Math.PI * 0.55, Math.PI * 1.45, "err", { opacity: f });
      scene.polyline([[IX - 6, IY - 2, top], [IX + 8, IY - 8, top], [IX + 20, IY - 16, top]], "err", { bold: true, opacity: f });
    }

    // The rubber stamp: rubber, block, neck and knob, square to the viewer. On error it topples to
    // the right about the block's lower edge and lies on its side, resting on the knob.
    const tone = toneOf(state);
    const side: Vec3 = [Math.SQRT1_2, -Math.SQRT1_2, 0], fwd: Vec3 = [Math.SQRT1_2, Math.SQRT1_2, 0];
    const t = fall * 1.85, ct = Math.cos(t), st = Math.sin(t);
    const pivot: Vec3 = add([IX + shake, IY, top + Z + 3 * clamp(fall)], mul(side, 16));
    const P = (a: number, b: number, h: number): Vec3 =>
      add(pivot, add(add(mul(side, (a - 16) * ct + h * st), mul(fwd, b)), [0, 0, h * ct - (a - 16) * st]));
    const A = (a: number, h: number): Vec3 => add(mul(side, a * ct + h * st), [0, 0, h * ct - a * st]);
    if (empty) {
      obox(scene, P(0, 0, 6), A(16, 0), mul(fwd, 11), A(0, 6), "ghost");
      return;
    }
    obox(scene, P(0, 0, 1.2), A(15, 0), mul(fwd, 10), A(0, 1.2), state === "loading" ? "hi" : "muted");
    obox(scene, P(0, 0, 7.4), A(16, 0), mul(fwd, 11), A(0, 5), tone);
    tube(scene, P(0, 0, 12.4), P(0, 0, 20), 4, 3.6, tone);
    tube(scene, P(0, 0, 20), P(0, 0, 24), 7.5, 9, tone);
    tube(scene, P(0, 0, 24), P(0, 0, 29), 9, 5, tone);
  },
});

/** A globe slowly turning, with a marker on it. Use for worldwide reach, locales and global settings. */
export const globe = defineFigure({
  name: "Globe",
  label: "A globe turning with a marker",
  offset: 0,
  setup: () => ({}),
  draw(ctx) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const spin = state === "loading" ? ctx.time * 1.2 : 0.3;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    const R = 52;
    scene.disc(shake, 0, 4, R, "base", { plate: true });
    scene.polyline(faceArc(shake, 0, 4, R, 0, Math.PI * 2, 48), tone, { closed: true });
    for (let k = -2; k <= 2; k++) {
      const yy = (R * k) / 3;
      const w = Math.sqrt(Math.max(0, R * R - yy * yy));
      scene.line([shake - w, yy, 4], [shake + w, yy, 4], "faint");
    }
    for (let k = 0; k < 4; k++) {
      const a = spin + k * (Math.PI / 2);
      const x = shake + R * Math.cos(a) * 0.9;
      scene.polyline([[x, -R * 0.9, 4], [x, R * 0.9, 4]] as Vec3[], "faint");
    }
    const mk = spin;
    scene.disc(shake + R * 0.55 * Math.cos(mk), R * 0.4 * Math.sin(mk), 4.1, 4, tone === "base" ? "hi" : tone, { fill: true });
    if (state === "success") scene.check(0, 0, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 0, 4, "err", ctx.fade());
  },
});

/** A train passing along its track. Use for transit, travel progress and rail routes. */
export const train = defineFigure({
  name: "Train",
  label: "A train moving along a track",
  offset: 6,
  setup: ({ spring }) => ({ t: spring(0.2, 90, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const t = state === "loading" ? ctx.loop(3) : state === "success" ? 1 : state === "error" ? 0.5 : state === "empty" ? 0 : 0.2;
    const T = m.t.to(t).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 150, 60, 4, "base");
    scene.line([-64, -8, 4.05], [64, -8, 4.05], "faint", { bold: true });
    scene.line([-64, 8, 4.05], [64, 8, 4.05], "faint", { bold: true });
    const x = lerp(-56, 48, T) + shake;
    scene.box(x, 0, 4.1, 34, 14, 12, tone);
    scene.box(x + 12, 0, 4.1, 10, 14, 18, tone === "base" ? "muted" : tone);
    for (let k = 0; k < 2; k++) scene.disc(x - 8 + k * 16, 0, 4.1, 3.5, "muted", { fill: true });
    if (state === "success") scene.check(48, -22, 16, "ok", ctx.fade());
    if (state === "error") scene.cross(48, -22, 16, "err", ctx.fade());
  },
});

/** A compass needle finding north. Use for navigation, direction and onboarding to a place. */
export const compass = defineFigure({
  name: "Compass",
  label: "A compass needle turning north",
  offset: 0,
  setup: ({ spring }) => ({ needle: spring(0.8, 90, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    let a = 0.8;
    if (state === "idle" && ctx.pointer.over > 0.2) a = Math.atan2(g.y, g.x) + 0.2;
    if (state === "loading") a = Math.sin(ctx.time * 3) * 1.6;
    if (state === "success") a = 0;
    if (state === "error") a = 2.4;
    const A = m.needle.to(a).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.disc(shake, 0, 4, 50, "base", { plate: true });
    scene.polyline(faceArc(shake, 0, 4, 50, 0, Math.PI * 2, 48), "muted", { closed: true });
    for (let k = 0; k < 4; k++) scene.line([shake + 44 * Math.cos(k * Math.PI / 2), 44 * Math.sin(k * Math.PI / 2), 4], [shake + 36 * Math.cos(k * Math.PI / 2), 36 * Math.sin(k * Math.PI / 2), 4], "muted");
    const tip: Vec3 = [shake + 34 * Math.cos(A), 34 * Math.sin(A), 4.1];
    const tail: Vec3 = [shake - 34 * Math.cos(A), -34 * Math.sin(A), 4.1];
    scene.polyline([tip, [shake, 0, 4.1], tail], tone, { bold: true });
    scene.disc(shake, 0, 4.2, 3, tone, { fill: true });
    if (state === "success") scene.check(0, -58, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -58, 4, "err", ctx.fade());
  },
});

/** A boarding pass with a QR block. Use for tickets, check-in confirmations and boarding. */
export const boarding = defineFigure({
  name: "Boarding",
  label: "A boarding pass being scanned",
  offset: 6,
  setup: ({ spring }) => ({ pass: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const x = state === "loading" ? -30 + 60 * smoothstep(ctx.loop(2.2)) : state === "success" ? 40 : state === "error" ? -40 : -30 + ctx.hover * 6;
    const X = m.pass.to(x).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 130, 70, 3, "base");
    scene.box(-62, -40, 3, 8, 8, 30, "muted");
    scene.box(X + shake, 0, 6, 74, 40, 3, tone);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2) scene.box(X - 20 + c * 6 + shake, -10 + r * 6, 8.5, 4, 4, 1, "muted");
    if (state === "success") scene.check(44, -28, 6, "ok", ctx.fade());
    if (state === "error") scene.cross(44, -28, 6, "err", ctx.fade());
  },
});
