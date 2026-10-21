import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, nearestAngle, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { faceArc } from "../shapes";

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

/* ------------------------------------------------------------------ Globe */

/** Turns vector v about the unit axis n by angle a. */
const turnAbout = (v: Vec3, n: Vec3, a: number): Vec3 =>
  add(add(mul(v, Math.cos(a)), mul(cross(n, v), Math.sin(a))), mul(n, dot(n, v) * (1 - Math.cos(a))));

/** Continents as outlines of longitude and latitude, in degrees. */
const LANDS: readonly (readonly [number, number])[][] = [
  [[-125, 50], [-100, 52], [-80, 55], [-62, 46], [-78, 30], [-97, 18], [-80, 8], [-52, -4], [-38, -10], [-48, -25], [-68, -52], [-74, -22], [-80, -4], [-106, 22], [-124, 38]],
  [[-10, 36], [-2, 48], [10, 55], [30, 60], [42, 46], [34, 32], [44, 12], [51, 11], [40, -14], [32, -32], [19, -35], [12, -6], [-6, 5], [-17, 15], [-12, 28]],
  [[42, 46], [62, 56], [100, 70], [142, 60], [128, 40], [120, 24], [106, 10], [80, 9], [70, 24], [52, 28]],
  [[114, -21], [130, -12], [145, -14], [153, -28], [144, -38], [116, -34]],
];

/** A globe turning with a marker. Use for worldwide reach, locales and global settings. */
export const globe = defineFigure({
  name: "Globe",
  label: "A desk globe turning with a marker",
  offset: 10,
  setup: ({ spring }) => ({ spin: spring(0.3, 50, 13), knock: spring(0, 60, 10), drop: spring(0, 80, 12) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const R = 36, RA = R + 6, TILT = 0.41;
    const d: Vec3 = [-Math.SQRT1_2, Math.SQRT1_2, 0], n: Vec3 = [Math.SQRT1_2, Math.SQRT1_2, 0];
    // The stand holds the south end of the meridian arm; on error the arm is knocked over about it.
    const knock = m.knock.to(state === "error" ? 1 : 0).value;
    const C0: Vec3 = [0, 0, 74];
    const A0: Vec3 = add(mul(d, Math.sin(TILT)), [0, 0, Math.cos(TILT)]);
    const P0: Vec3 = add(mul(d, Math.cos(TILT)), [0, 0, -Math.sin(TILT)]);
    const south = sub(C0, mul(A0, RA));
    const lean = -0.42 * knock;
    const A = turnAbout(A0, n, lean), P = turnAbout(P0, n, lean);
    const C = add(add(south, turnAbout(sub(C0, south), n, lean)), [shake, 0, 0]);
    const E2 = cross(A, P);
    const V = unit(VIEW);

    // The spin that turns the marker to face the viewer.
    const LON = -0.35, LAT = 0.42, facingSpin = Math.atan2(dot(V, E2), dot(V, P)) - LON;
    let spin = nearestAngle(facingSpin - 0.75 + ctx.hover * 0.7, m.spin.value);
    if (state === "loading") {
      spin = ctx.time * 1.3;
      m.spin.set(spin);
    }
    if (state === "success") spin = nearestAngle(facingSpin + 0.15, m.spin.value);
    const S = m.spin.to(spin).value;
    const at = (lon: number, lat: number, r = R): Vec3 =>
      add(C, mul(add(mul(add(mul(P, Math.cos(lon + S)), mul(E2, Math.sin(lon + S))), Math.cos(lat)), mul(A, Math.sin(lat))), r));
    const seen = (p: Vec3) => dot(sub(p, C), V) > 1.5;
    /** Draws the visible stretches of a line on the sphere. */
    const onSphere = (pts: Vec3[], tone: Tone, style: { bold?: boolean } = {}) => {
      let run: Vec3[] = [];
      for (const p of [...pts, null]) {
        if (p && seen(p)) run.push(p);
        else {
          if (run.length > 1) scene.polyline(run, tone, style);
          run = [];
        }
      }
    };

    scene.box(0, 0, 0, 120, 120, 4, "base");
    const stand: Tone = empty ? "ghost" : "base";
    // The stand: a round foot, a collar and a stem up to the arm's lower end.
    scene.cylinder(south[0], south[1], 4, 24, 5, stand);
    scene.cylinder(south[0], south[1], 9, 9, 3, stand);
    if (!empty) tube(scene, [south[0], south[1], 12], south, 3, 3, "base");

    // The meridian arm: a flat half ring from pole to pole, split where it passes behind the ball.
    const arm = (a0: number, a1: number): Vec3[] => {
      const out: Vec3[] = [], inner: Vec3[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = a0 + ((a1 - a0) * i) / 16;
        const dir = sub(mul(A, Math.cos(t)), mul(P, Math.sin(t)));
        out.push(add(C, mul(dir, RA + 2.5)));
        inner.push(add(C, mul(dir, RA - 2.5)));
      }
      return [...out, ...inner.reverse()];
    };
    const depth = (t: number) => dot(sub(mul(A, Math.cos(t)), mul(P, Math.sin(t))), V);
    let cut = Math.PI / 2;
    for (let i = 0; i <= 60; i++) if (depth((Math.PI * i) / 60) >= 0) cut = (Math.PI * i) / 60;
    const front = depth(0) >= 0;
    const armTone: Tone = empty ? "ghost" : "base";
    if (front) scene.panel(arm(cut, Math.PI), armTone);
    else scene.panel(arm(0, cut), armTone);

    // The ball.
    const ballTone: Tone = empty ? "ghost" : ctx.verdict();
    scene.panel(faceArc(C[0], C[1], C[2], R * 1.2247, 0, TAU, 40), ballTone);
    if (!empty) {
      const ring = (lat: number) => Array.from({ length: 41 }, (_, i) => at((i / 40) * TAU, lat));
      onSphere(ring(0), state === "loading" ? "hi" : "faint", { bold: state === "loading" });
      onSphere(ring(0.62), "faint");
      onSphere(ring(-0.62), "faint");
      for (let k = 0; k < 4; k++) onSphere(Array.from({ length: 21 }, (_, i) => at((k * Math.PI) / 2, -Math.PI / 2 + (Math.PI * i) / 20)), "faint");
      for (const land of LANDS) {
        const pts: Vec3[] = [];
        for (let i = 0; i <= land.length; i++) {
          const [a0, b0] = land[i % land.length]!, [a1, b1] = land[(i + 1) % land.length]!;
          for (let s = 0; s < 3 && i < land.length; s++) pts.push(at(((a0 + ((a1 - a0) * s) / 3) * Math.PI) / 180, ((b0 + ((b1 - b0) * s) / 3) * Math.PI) / 180));
        }
        pts.push(pts[0]!);
        onSphere(pts, "muted");
      }
      scene.polyline(faceArc(C[0], C[1], C[2], R * 1.2247, 0, TAU, 40), ballTone, { closed: true });
    }
    if (front) scene.panel(arm(0, cut), armTone);
    else scene.panel(arm(cut, Math.PI), armTone);
    if (empty) return;
    // Pivots at both poles.
    tube(scene, add(C, mul(A, R - 1)), add(C, mul(A, RA + 3)), 1.6, 1.6, "base");

    // The marker: a pin standing out of the ball, or fallen onto the foot on error.
    const drop = clamp(m.drop.to(state === "error" ? 1 : 0).value);
    const markTone: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();
    const base = at(LON, LAT), normal = unit(sub(base, C));
    if (drop < 0.5) {
      if (!seen(base)) return;
      const head = add(base, mul(normal, 12));
      if (state === "success") {
        const t1 = unit(cross(normal, A)), t2 = cross(normal, t1);
        scene.polyline(Array.from({ length: 16 }, (_, i) => add(base, add(mul(t1, 7 * Math.cos((i / 16) * TAU)), mul(t2, 7 * Math.sin((i / 16) * TAU))))), "ok", { closed: true, bold: true, opacity: ctx.fade() });
      }
      scene.line(base, head, markTone, { bold: true });
      scene.panel(faceArc(head[0], head[1], head[2], 4.5, 0, TAU, 14), markTone);
      return;
    }
    const fx = south[0] + 28, fy = south[1] + 4;
    scene.line([fx - 6, fy - 6, 4.2], [fx + 4, fy + 4, 4.2], "err", { bold: true });
    scene.disc(fx + 6, fy + 6, 4.2, 4, "err", { plate: true });
  },
});

/* ------------------------------------------------------------------ Train */

/** One car of a train: its side profile (x forward, z up) pushed out to ±8 across, posed by `f`. */
function railcar(scene: Scene, f: (x: number, y: number, z: number) => Vec3, profile: readonly (readonly [number, number])[],
                 x0: number, x1: number, tone: Tone, opacity?: number): void {
  const pts: Vec3[] = [];
  for (const [x, z] of profile) pts.push(f(x, -8, z), f(x, 8, z));
  // Bogies with two wheels each, under both ends.
  if (tone !== "ghost") for (const bx of [x0 + 9, x1 - 9]) {
    const c = f(bx, 0, 9), ax = sub(f(bx + 7, 0, 9), c), ay = sub(f(bx, 6, 9), c), az = sub(f(bx, 0, 12), c);
    obox(scene, c, ax, ay, az, "muted", opacity);
    for (const w of [-4, 4]) scene.polyline(Array.from({ length: 13 }, (_, i) => f(bx + w + 3 * Math.cos((i / 12) * TAU), 6.1, 8 + 3 * Math.sin((i / 12) * TAU))), "muted", { opacity });
  }
  scene.panel(hull(pts), tone, opacity);
  if (tone === "ghost") return;
  const line = crease(tone);
  scene.panel(profile.map(([x, z]) => f(x, 8, z)), tone, opacity);
  for (let i = 1; i < profile.length - 1; i++) {
    const [x, z] = profile[i]!;
    if (z > 12) scene.line(f(x, -8, z), f(x, 8, z), line, { opacity });
  }
  // Windows down the side and a livery stripe.
  for (let wx = x0 + 6; wx + 6 <= x1 - 6; wx += 9) {
    scene.polyline([f(wx, 8.1, 21), f(wx + 6, 8.1, 21), f(wx + 6, 8.1, 27), f(wx, 8.1, 27)], line, { closed: true, opacity });
  }
  scene.line(f(x0, 8.1, 16), f(x1, 8.1, 16), line, { opacity });
}

const LEAD: readonly (readonly [number, number])[] = [[-56, 12], [-56, 32], [-16, 32], [-6, 23], [0, 17], [0, 12]];
const COACH: readonly (readonly [number, number])[] = [[-112, 12], [-112, 32], [-60, 32], [-60, 12]];

/** A train passing along its track. Use for transit, travel progress and rail routes. */
export const train = defineFigure({
  name: "Train",
  label: "A train running along a track to a platform",
  offset: 10,
  setup: ({ spring }) => ({ x: spring(14, 80, 16), off: spring(0, 70, 11) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let x = 14 + ctx.hover * 8, opacity = 1;
    if (state === "loading") {
      const q = ctx.loop(3.4);
      // Runs in to the platform and pulls up; it fades low, never out, before the next run.
      x = lerp(-8, 96, smoothstep(q / 0.8));
      opacity = q < 0.08 ? lerp(0.3, 1, q / 0.08) : 1 - 0.7 * smoothstep((q - 0.88) / 0.12);
      m.x.set(x);
    }
    if (state === "success") x = 96;
    if (state === "error") x = 52;
    const X = m.x.to(x).value + shake;
    const off = m.off.to(state === "error" ? 1 : 0).value;

    scene.box(0, 0, 0, 216, 70, 4, "base");
    // The track: sleepers, then two rails.
    for (let sx0 = -99; sx0 <= 99; sx0 += 18) scene.line([sx0, -10, 4.6], [sx0, 10, 4.6], empty ? "ghost" : "muted", { bold: true });
    for (const y of [-5, 5]) {
      if (empty) scene.line([-104, y, 5.5], [104, y, 5.5], "ghost");
      else scene.box(0, y, 4, 208, 2, 3, "base");
    }
    // The station: a platform on the far side with a canopy on two posts.
    const st: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    scene.box(68, -24, 4, 64, 16, 7, st);
    for (const px of [46, 90]) scene.cylinder(px, -27, 11, 1.6, 22, empty ? "ghost" : "base");
    scene.box(68, -25, 33, 70, 18, 2.5, st);
    if (empty) {
      railcar(scene, (a, b, c) => [14 + a, b, c], COACH, -112, -60, "ghost");
      railcar(scene, (a, b, c) => [14 + a, b, c], LEAD, -56, 0, "ghost");
      return;
    }
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
    /** A car's pose: yawed off the rails about its rear bogie and rolled toward the viewer on error. */
    const pose = (pivot: number, yaw: number, roll: number, sink: number) => (a: number, b: number, c: number): Vec3 => {
      const ex: Vec3 = [Math.cos(yaw), Math.sin(yaw), 0], ey0: Vec3 = [-Math.sin(yaw), Math.cos(yaw), 0];
      const ey = add(mul(ey0, Math.cos(roll)), [0, 0, Math.sin(roll)]), ez = add(mul(ey0, -Math.sin(roll)), [0, 0, Math.cos(roll)]);
      return add([X + pivot, 0, -sink], add(mul(ex, a - pivot), add(mul(ey, b), mul(ez, c))));
    };
    railcar(scene, pose(-100, 0.1 * off, -0.05 * off, 1.5 * off), COACH, -112, -60, tone, opacity);
    if (!(state === "error")) {
      // The pantograph on the coach roof.
      const f = pose(-100, 0, 0, 0);
      scene.polyline([f(-92, 0, 32), f(-84, 0, 40), f(-91, 0, 46)], "muted", { bold: true, opacity });
      scene.line(f(-91, -6, 46), f(-91, 6, 46), "muted", { bold: true, opacity });
    }
    const lead = pose(-44, 0.34 * off, -0.22 * off, 3 * off);
    railcar(scene, lead, LEAD, -56, 0, tone, opacity);
    scene.polyline([lead(-14.5, -6, 30.5), lead(-7.5, -6, 23.5), lead(-7.5, 6, 23.5), lead(-14.5, 6, 30.5)], crease(tone), { closed: true, bold: true, opacity });
  },
});

/* ------------------------------------------------------------------ Compass */

/** A compass needle finding north. Use for navigation, direction and onboarding to a place. */
export const compass = defineFigure({
  name: "Compass",
  label: "A pocket compass with its needle turning north",
  offset: 12,
  setup: ({ spring }) => ({ needle: spring(0.5, 90, 14), loose: spring(0, 80, 11) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(14);
    const empty = state === "empty";
    const CX = 8 + shake, CY = 8, RC = 40, TOP = 14;
    const NORTH = -0.75 * Math.PI;
    let a = NORTH + 0.55;
    if (state === "idle" && ctx.pointer.over > 0.2) a = nearestAngle(Math.atan2(g.y - CY, g.x - CX), NORTH);
    if (state === "loading") a = NORTH + Math.sin(ctx.time * 3) * 1.6;
    if (state === "success") a = NORTH;
    if (state === "error") a = NORTH + 2.2;
    const Aa = m.needle.to(a).value;
    const loose = clamp(m.loose.to(state === "error" ? 1 : 0).value, 0, 1.1);
    const body: Tone = empty ? "ghost" : "base";

    scene.box(0, 0, 0, 130, 130, 4, "base");
    // The lid, hinged at the back and standing open, with its sighting line.
    const w: Vec3 = [Math.SQRT1_2, -Math.SQRT1_2, 0], back: Vec3 = [-Math.SQRT1_2, -Math.SQRT1_2, 0];
    const hinge: Vec3 = [CX + back[0] * RC, CY + back[1] * RC, TOP];
    const psi = 1.72, RL = RC - 2;
    const v = add(mul(back, -Math.cos(psi)), [0, 0, Math.sin(psi)]);
    const lidC = add(hinge, mul(v, RL + 2));
    const normal = cross(w, v);
    const lid = (r: number, lift: number) => Array.from({ length: 33 }, (_, i) => add(add(lidC, mul(normal, lift)), add(mul(w, r * Math.cos((i / 32) * TAU)), mul(v, r * Math.sin((i / 32) * TAU)))));
    scene.panel(lid(RL, -3), body);
    scene.panel(lid(RL, 0), body);
    if (!empty) {
      scene.polyline(lid(RL - 6, 0.1), "faint", { closed: true });
      scene.line(add(lidC, mul(v, -(RL - 8))), add(lidC, mul(v, RL - 8)), "muted");
    }
    // The hinge knuckle joining lid and case.
    tube(scene, add(hinge, mul(w, -9)), add(hinge, mul(w, 9)), 2.6, 2.6, body);

    // The case: a round body with a crown and a bail ring at the side.
    scene.cylinder(CX, CY, 4, RC, TOP - 4, body);
    if (empty) {
      scene.polyline(Array.from({ length: 2 }, (_, i) => [CX + Math.cos(NORTH) * (i ? 30 : -30), CY + Math.sin(NORTH) * (i ? 30 : -30), TOP + 0.1] as Vec3), "ghost");
      return;
    }
    const crown = add([CX, CY, 9], mul(w, RC));
    tube(scene, crown, add(crown, mul(w, 7)), 3.2, 3.2, "base");
    scene.polyline(faceArc(crown[0] + w[0] * 13, crown[1] + w[1] * 13, 9, 7, 0, TAU, 18), "base", { closed: true, bold: true });
    scene.disc(CX, CY, TOP, RC - 5, "muted");
    for (let k = 0; k < 8; k++) {
      const t = (k * Math.PI) / 4, r0 = k % 2 ? RC - 9 : RC - 12;
      scene.line([CX + r0 * Math.cos(t), CY + r0 * Math.sin(t), TOP + 0.05], [CX + (RC - 6) * Math.cos(t), CY + (RC - 6) * Math.sin(t), TOP + 0.05], "muted");
    }
    // The compass rose and the north mark.
    const star = (r: number, rot: number): Vec3[] => Array.from({ length: 8 }, (_, i) => {
      const t = rot + (i * Math.PI) / 4, rr = i % 2 ? r * 0.22 : r;
      return [CX + rr * Math.cos(t), CY + rr * Math.sin(t), TOP + 0.1] as Vec3;
    });
    scene.panel(star(18, NORTH + Math.PI / 4), "faint");
    scene.panel(star(26, NORTH), "faint");
    const nTone: Tone = state === "success" ? "ok" : "muted";
    const nx = (r: number, da = 0): Vec3 => [CX + r * Math.cos(NORTH + da), CY + r * Math.sin(NORTH + da), TOP + 0.15];
    scene.panel([nx(RC - 7), nx(RC - 13, 0.12), nx(RC - 13, -0.12)], nTone);

    // The needle: a rhombus on its pivot, north half in the verdict tone. On error it is knocked
    // off the pivot and lies crooked against the dial.
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
    const ox = CX + 9 * loose, oy = CY + 11 * loose;
    const dir: Vec3 = [Math.cos(Aa), Math.sin(Aa), 0.16 * loose], side: Vec3 = [-Math.sin(Aa) * 4.5, Math.cos(Aa) * 4.5, 0];
    const mid: Vec3 = [ox, oy, TOP + 3.5 - 1.5 * loose];
    const tip = add(mid, mul(dir, 30)), tail = add(mid, mul(dir, -30));
    scene.cylinder(CX, CY, TOP, 2.2, 3, "muted");
    scene.panel([tail, add(mid, side), add(mid, mul(side, -1))], "muted");
    scene.panel([tip, add(mid, side), add(mid, mul(side, -1))], tone);
    scene.disc(mid[0], mid[1], mid[2], 2.6, tone, { fill: true });
    // The glass: a glint, and cracks on error.
    scene.arc(CX, CY, TOP + 4, RC - 9, Math.PI * 0.95, Math.PI * 1.25, "faint");
    if (state === "error") {
      const f = ctx.fade(0.4);
      scene.polyline([[CX - 26, CY + 10, TOP + 4], [CX - 8, CY + 2, TOP + 4], [CX + 4, CY + 12, TOP + 4], [CX + 24, CY + 6, TOP + 4]], "err", { opacity: f });
      scene.line([CX - 8, CY + 2, TOP + 4], [CX - 4, CY - 18, TOP + 4], "err", { opacity: f });
    }
  },
});

/* ------------------------------------------------------------------ Boarding */

/** A boarding pass with a QR block. Use for tickets, check-in confirmations and boarding. */
export const boarding = defineFigure({
  name: "Boarding",
  label: "A boarding pass scanned at a gate",
  offset: 16,
  setup: ({ spring }) => ({ lift: spring(14, 160, 16), flap: spring(0, 80, 14), fall: spring(0, 70, 12) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let lift = 14 - ctx.hover * 7, beam = -1;
    if (state === "loading") {
      const q = ctx.loop(1.6);
      lift = 0;
      beam = q;
    }
    if (state === "success") lift = 8;
    if (state === "error") lift = 0;
    const L = m.lift.to(lift).value;
    const open = clamp(m.flap.to(state === "success" ? 1 : 0).value, 0, 1);
    const fall = clamp(m.fall.to(state === "error" ? 1 : 0).value, 0, 1);
    const body: Tone = empty ? "ghost" : "base";
    const verdict: Tone = state === "loading" ? "hi" : state === "idle" ? "muted" : ctx.verdict("muted");

    scene.box(0, 0, 0, 150, 116, 4, "base");
    // Two gate cabinets either side of the lane.
    const gate = (gx: number) => {
      scene.box(gx, 0, 4, 20, 80, 44, body);
      if (empty) return;
      scene.line([gx + 10.05, -36, 40], [gx + 10.05, 30, 40], verdict, { bold: true });
    };
    // The glass flaps that close the lane; they slide back into the cabinets to let you through.
    const flap = (fromX: number, sign: number) => {
      const len = 32 * (1 - open) + 2;
      obox(scene, [fromX + (sign * len) / 2, -8, 26], [len / 2, 0, 0], [0, 1.2, 0], [0, 0, 12], empty ? "ghost" : state === "error" ? "err" : "muted");
    };
    gate(-32);
    flap(-22, 1);
    flap(46, -1);
    gate(56);
    // The reader on the near end of the left cabinet: a raised head with its glass.
    scene.box(-32, 24, 48, 18, 22, 3, body);
    if (!empty) scene.rect(-39, 16, -25, 32, 51.05, beam >= 0 ? "hi" : "muted");

    // The pass: a stub behind a perforation with a QR block, a header band and lines.
    const tone: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const yaw = 0.5 * fall;
    const c: Vec3 = [lerp(-32, -2, fall) + shake, lerp(26, 48, fall), lerp(52.5 + L, 4.8, smoothstep(fall))];
    const ua: Vec3 = [Math.cos(yaw), Math.sin(yaw), 0], va: Vec3 = [-Math.sin(yaw), Math.cos(yaw), 0];
    obox(scene, c, mul(ua, 12), mul(va, 25), [0, 0, 0.8], tone);
    if (empty) return;
    const p = (u: number, v: number): Vec3 => add(add(c, [0, 0, 0.85]), add(mul(ua, u), mul(va, v)));
    const line = crease(tone);
    scene.line(p(-12, 12), p(12, 12), "ghost");
    scene.polyline([p(-6, 14.5), p(5, 14.5), p(5, 23), p(-6, 23)], line, { closed: true });
    for (const [u, v] of [[-4, 16.5], [3, 16.5], [-4, 21]] as const) scene.polyline([p(u - 1.2, v - 1.2), p(u + 1.2, v - 1.2), p(u + 1.2, v + 1.2), p(u - 1.2, v + 1.2)], line, { closed: true });
    scene.line(p(-12, -19), p(12, -19), tone === "base" ? "muted" : tone, { bold: true });
    for (const [v, u1] of [[-12, 8], [-6, 3], [0, 8], [6, -1]] as const) scene.line(p(-8, v), p(u1, v), line);
    // A small plane mark beside the route line.
    scene.line(p(4, -13.5), p(10, -9.5), line, { bold: true });
    scene.line(p(8.2, -13.5), p(5, -9), line);
    if (beam >= 0) {
      const bv = lerp(-25, 25, beam);
      scene.line(p(-14, bv), p(14, bv), "hi", { bold: true });
    }
  },
});
