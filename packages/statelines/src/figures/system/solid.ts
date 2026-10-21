import type { Scene, Tone, Vec3 } from "../../engine/scene";

const TAU = Math.PI * 2;
const K = Math.sqrt(3) / 2;
/** The direction toward the viewer: a face whose normal points along it is visible. */
export const VIEW: Vec3 = [1, 1, 1];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec3): Vec3 => mul(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));
const sx = (p: Vec3): number => (p[0] - p[1]) * K;
const sy = (p: Vec3): number => (p[0] + p[1]) / 2 - p[2];
/** The dim line tone used for creases and detail on a solid of tone `t`. */
export const crease = (t: Tone): Tone => (t === "muted" || t === "faint" ? "faint" : "muted");

/** The outline, as seen on screen, of a cloud of points: their convex hull. */
export function hull(points: readonly Vec3[]): Vec3[] {
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
export function obox(scene: Scene, c: Vec3, a: Vec3, b: Vec3, h: Vec3, tone: Tone, opacity?: number): void {
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

/** A round rod or drum from p0 to p1 with end radii r0 and r1, turned any way. `cap` draws the visible end ring. */
export function tube(scene: Scene, p0: Vec3, p1: Vec3, r0: number, r1: number, tone: Tone, opacity?: number, cap = true): void {
  const d = unit(sub(p1, p0));
  const e1 = unit(cross(d, Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
  const e2 = cross(d, e1);
  const ring = (p: Vec3, r: number, n = 16): Vec3[] => Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU;
    return add(p, add(mul(e1, r * Math.cos(t)), mul(e2, r * Math.sin(t))));
  });
  scene.panel(hull([...ring(p0, Math.max(0.01, r0)), ...ring(p1, Math.max(0.01, r1))]), tone, opacity);
  if (tone === "ghost" || !cap) return;
  const [p, r] = dot(d, VIEW) > 0 ? [p1, r1] : [p0, r0];
  if (r > 1.5) scene.polyline(ring(p, r, 20), crease(tone), { closed: true, opacity });
}

/** Rotates a point about the x axis through `o` by angle `a` (y toward z). */
export const rotX = (p: Vec3, o: Vec3, a: number): Vec3 => {
  const y = p[1] - o[1], z = p[2] - o[2], c = Math.cos(a), s = Math.sin(a);
  return [p[0], o[1] + y * c - z * s, o[2] + y * s + z * c];
};

/** Rotates a point about the y axis through `o` by angle `a` (x toward z). */
export const rotY = (p: Vec3, o: Vec3, a: number): Vec3 => {
  const x = p[0] - o[0], z = p[2] - o[2], c = Math.cos(a), s = Math.sin(a);
  return [o[0] + x * c - z * s, p[1], o[2] + x * s + z * c];
};
