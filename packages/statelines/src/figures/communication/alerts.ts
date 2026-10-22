import { defineFigure } from "../../core/define";
import { bump, clamp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { faceArc } from "../shapes";

type At = (u: number, v: number, z: number) => Vec3;

/** A rounded rectangle lying flat, centred on the origin: points with the angle of their outward normal. */
function outline(w: number, d: number, r: number, steps = 3): { u: number; v: number; n: number }[] {
  const a = w / 2 - r, b = d / 2 - r, out: { u: number; v: number; n: number }[] = [];
  for (const [x, y, n0] of [[a, -b, -Math.PI / 2], [a, b, 0], [-a, b, Math.PI / 2], [-a, -b, Math.PI]] as const) {
    for (let i = 0; i <= steps; i++) {
      const n = n0 + (Math.PI / 2) * (i / steps);
      out.push({ u: x + r * Math.cos(n), v: y + r * Math.sin(n), n });
    }
  }
  return out;
}

/**
 * A slab with rounded corners lying flat, turned by `rot` about its centre. Draws its near edge and
 * its top, and returns a mapping from local (u, v, z) to world points for the detail drawn on it.
 */
function flat(scene: Scene, cx: number, cy: number, z: number, w: number, d: number, h: number, r: number,
              tone: Tone, rot = 0, opacity?: number): At {
  const c = Math.cos(rot), s = Math.sin(rot);
  const at: At = (u, v, zz) => [cx + u * c - v * s, cy + u * s + v * c, zz];
  const pts = outline(w, d, r);
  const top = pts.map(p => at(p.u, p.v, z + h));
  if (tone === "ghost") {
    scene.panel(top, "ghost", opacity);
    return at;
  }
  // The edge that faces the viewer: the run of points whose normal points toward x+ and y+.
  const N = pts.length, near = pts.map(p => Math.cos(p.n + rot) + Math.sin(p.n + rot) > 0);
  const start = Math.max(0, near.findIndex((v, i) => v && !near[(i - 1 + N) % N]));
  const run: number[] = [];
  for (let i = start - 1; run.length < N; i++) {
    const j = (i + N) % N;
    run.push(j);
    if (!near[j] && run.length > 1) break;
  }
  const edge = (zz: number) => run.map(j => at(pts[j]!.u, pts[j]!.v, zz));
  scene.panel([...edge(z), ...edge(z + h).reverse()], tone, opacity);
  scene.panel(top, tone, opacity);
  return at;
}

const MAX = 4;
const TAU = Math.PI * 2;
/** The bell, as rings up its axis from the lip: radius and height above the lip. */
const PROFILE: [number, number][] = [[25, 0], [23, 2.5], [19.5, 7], [17.5, 15], [16.5, 24], [15, 31], [11.5, 37], [6.5, 41], [0, 42.5]];
const K = 1.3;
const BELL = { x: -28, y: -18, lip: 4, r: PROFILE[0]![0] * K, h: PROFILE[PROFILE.length - 1]![1] * K };
const CARD = { x: 36, y: 6, w: 64, d: 24, h: 3, r: 5, step: 7, rise: 3.5 };

/** A point on the bell, rocked by `a` onto the edge of its lip. */
const swing = (a: number) => ([x, y, z]: Vec3): Vec3 => {
  const px = a >= 0 ? BELL.r : -BELL.r, dx = x - px, dz = z - BELL.lip, c = Math.cos(a), s = Math.sin(a);
  return [BELL.x + px + dx * c + dz * s, BELL.y + y, BELL.lip - dx * s + dz * c];
};
const sx = ([x, y]: Vec3) => x - y;
const sy = ([x, y, z]: Vec3) => (x + y) / 2 - z;

/** The silhouette of the bell and the front half of a ring on it, once swung. */
function bell(a: number): { body: Vec3[]; front: (k: number) => Vec3[] } {
  const S = swing(a);
  const rings = PROFILE.map(([r, h]) => Array.from({ length: 24 }, (_, i) =>
    S([r * K * Math.cos((i / 24) * TAU), r * K * Math.sin((i / 24) * TAU), BELL.lip + h * K])));
  const ends = (pts: Vec3[]) => {
    let lo = 0, hi = 0;
    pts.forEach((p, i) => { if (sx(p) < sx(pts[lo]!)) lo = i; if (sx(p) > sx(pts[hi]!)) hi = i; });
    return [lo, hi] as const;
  };
  const front = (k: number) => {
    const pts = rings[k]!, [lo, hi] = ends(pts), n = pts.length;
    const walk = (dir: 1 | -1) => {
      const out: Vec3[] = [];
      for (let i = lo; ; i = (i + dir + n) % n) { out.push(pts[i]!); if (i === hi) break; }
      return out;
    };
    const a1 = walk(1), a2 = walk(-1);
    return sy(a1[a1.length >> 1]!) > sy(a2[a2.length >> 1]!) ? a1 : a2;
  };
  const sides = rings.map(ends);
  const right = rings.map((pts, k) => pts[sides[k]![1]]!);
  const left = rings.map((pts, k) => pts[sides[k]![0]]!).reverse();
  return { body: [...front(0), ...right.slice(1), ...left.slice(0, -1)], front };
}

/** A bell rings and notifications land on a stack. Use for alerts, activity feeds and unread counts. `count`: cards at rest, 0–4. */
export const alerts = /*#__PURE__*/ defineFigure({
  name: "Alerts",
  label: "A ringing bell over a stack of notifications",
  offset: 8,
  setup: ({ spring }) => ({
    shift: spring(0, 130, 18),
    old: Array.from({ length: MAX }, (_, k) => spring(k < 2 ? 1 : 0, 150, 22)),
    y: spring(CARD.y, 120, 18), z: spring(60, 120, 18), o: spring(0, 150, 22),
    slide: spring(0, 110, 14),
    tilt: spring(0, 120, 12),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const resting = ctx.count(2, MAX);
    const fresh = state === "loading" || state === "success" || state === "error";
    const q = state === "loading" ? ctx.loop(2.2) : 0;

    scene.box(0, 0, 0, 152, 116, 4, "base");

    // The bell rocks on its lip while it rings, and tips over onto its lip on error.
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    const ring = state === "loading" ? Math.sin(q * TAU * 2) * 0.22 * (1 - smoothstep((q - 0.5) / 0.3)) : 0;
    const a = m.tilt.to(state === "error" ? 0.45 : state === "idle" ? (ctx.pointer.x / 140) * 0.12 * ctx.hover : 0).value + ring;
    const B = bell(a), T = swing(a);
    scene.panel(B.body, tone);
    const knob = T([0, 0, BELL.lip + BELL.h + 3.5]);
    scene.panel(faceArc(knob[0], knob[1], knob[2], 4.5, 0, TAU, 14), tone);
    if (!empty) {
      scene.polyline(B.front(2), tone === "base" ? "muted" : tone);
      scene.polyline(B.front(1), tone === "base" ? "muted" : tone);
    }
    // The unread badge on the bell's shoulder; it pops as each card lands.
    if (!empty && (resting > 0 || fresh)) {
      const pulse = state === "loading" ? bump((q - 0.36) / 0.3) * 4 : 0;
      const c = T([17, -10, BELL.lip + 40 + pulse]);
      const badge = state === "loading" ? "hi" : ctx.verdict();
      scene.panel(faceArc(c[0] - 1.2, c[1] - 1.2, c[2], 7, 0, TAU, 18), badge);
      scene.panel(faceArc(c[0], c[1], c[2], 7, 0, TAU, 18), badge);
      scene.panel(faceArc(c[0], c[1], c[2], 2, 0, TAU, 8), badge === "base" ? "muted" : badge);
    }

    // The stack: the newest card on top, older ones peeking out beneath it, narrower each time.
    const card = (x: number, y: number, z: number, w: number, tone: Tone, rot = 0, opacity?: number) => {
      const B = flat(scene, x, y, z, w, CARD.d, CARD.h, CARD.r, tone, rot, opacity);
      if (tone === "ghost") return;
      const t = z + CARD.h + 0.05, line: Tone = tone === "base" ? "muted" : tone, u = -w / 2;
      scene.polyline(outline(9, 9, 2.5, 1).map(p => B(p.u + u + 9, p.v, t)), line, { closed: true, opacity });
      scene.line(B(u + 18, -3.5, t), B(u + 40, -3.5, t), line, { bold: true, opacity });
      scene.line(B(u + 18, 3.5, t), B(-u - 8, 3.5, t), "faint", { opacity });
    };
    const S = m.shift.to(fresh ? 1 : 0).value;
    if (empty) card(CARD.x, CARD.y, 4, CARD.w, "ghost");
    for (let k = MAX - 1; k >= 0; k--) {
      const O = m.old[k]!.to(!empty && k < resting ? 1 : 0).value;
      if (O < 0.02) continue;
      const age = k + S;
      card(CARD.x, CARD.y + age * CARD.step, 4 + (resting - 1 - k) * CARD.rise, CARD.w - age * 5, "base", 0, O);
    }
    // The new card drops onto the stack. On error it slides off the stack onto the plate, crooked.
    let y = CARD.y, z = 4 + resting * CARD.rise, o = fresh ? 1 : 0;
    if (state === "loading") {
      const p = smoothstep(q / 0.4);
      y = CARD.y - 30 * (1 - p);
      z = z + 46 * (1 - p);
      o = smoothstep(q / 0.12) * (1 - smoothstep((q - 0.86) / 0.1));
      m.y.set(y); m.z.set(z); m.o.set(o);
    }
    const slide = clamp(m.slide.to(state === "error" ? 1 : 0).value, 0, 1.15);
    const Y = m.y.to(y).value, Z = m.z.to(state === "error" ? 4 : z).value, O = m.o.to(o).value;
    if (O > 0.02) {
      card(CARD.x + slide * 10 + shake, Y + slide * 30, Z, CARD.w, state === "loading" ? "hi" : ctx.verdict(), slide * 0.4, O);
    }
  },
});
