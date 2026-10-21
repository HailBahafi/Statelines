import { defineFigure } from "../../core/define";
import { bump, clamp, falloff, lerp, smoothstep, wrap } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { facing, faceArc, parcel } from "../shapes";

type P2 = [number, number];
type At = (l: number, w: number, n: number) => Vec3;

/** Keeps the part of a flat polygon where `f` is not negative. */
function clip(pts: readonly P2[], f: (p: P2) => number): P2[] {
  const out: P2[] = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    const fp = f(p), fq = f(q);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  });
  return out;
}

/** Mirrors a half profile (tip first, w ≥ 0) into a closed outline. */
const mirror = (half: readonly P2[]): P2[] => [...half, ...half.slice(1, -1).reverse().map(([l, w]) => [l, -w] as P2)];

/** Writing tools as profiles along their length, tip at l = 0, and the bands across them. */
const PENCIL = mirror([[0, 0], [1.4, 0.6], [7, 2.4], [40, 2.4], [40, 2.7], [45, 2.7], [45, 2.3], [47.6, 1.9], [48.4, 0]]);
const PENCIL_BANDS: P2[] = [[7, 2.4], [40, 2.4], [45, 2.7]];
const FOUNTAIN = mirror([[0, 0], [3, 0.9], [7, 1.8], [8, 2.2], [16, 2.2], [17, 3], [43, 3], [46, 2.3], [47, 0]]);
const FOUNTAIN_BANDS: P2[] = [[8, 2.2], [17, 3], [36, 3]];
const BALLPOINT = mirror([[0, 0], [1.6, 0.7], [6, 2.2], [14, 2.6], [43, 2.6], [44, 1.8], [47.5, 1.8], [48, 0]]);
const BALLPOINT_BANDS: P2[] = [[6, 2.2], [14, 2.6], [43, 2.6]];

/** A frame along a tool: tip at `tip`, pointing back along `yaw` and rising at `pitch`; w across, n up. */
function tool(tip: Vec3, yaw: number, pitch: number): At {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  return (l, w, n) => [
    tip[0] + l * cp * cy - w * sy - n * sp * cy,
    tip[1] + l * cp * sy + w * cy - n * sp * sy,
    tip[2] + l * sp + n * cp,
  ];
}

/** A writing tool drawn as two layers of its profile; only the part between `from` and `to` along it. */
function drawTool(scene: Scene, shape: readonly P2[], bands: readonly P2[], at: At, tone: Tone, opacity?: number, from = -1, to = 99): void {
  if (opacity !== undefined && opacity < 0.02) return;
  const pts = clip(clip(shape, p => p[0] - from), p => to - p[0]);
  if (pts.length < 3) return;
  scene.panel(pts.map(([l, w]) => at(l, w, -1.3)), tone, opacity);
  scene.panel(pts.map(([l, w]) => at(l, w, 1.3)), tone, opacity);
  const crease: Tone = tone === "base" ? "muted" : tone;
  bands.forEach(([l, w]) => { if (l > from && l < to) scene.line(at(l, -w, 1.35), at(l, w, 1.35), crease, { opacity }); });
}

const KCOL = [-38, 0, 38];
const kSlot = (i: number): number => 59 - i * 14.5;

/** Cards sliding across columns on a board. Use for kanban boards, pipelines and task status. `count`: cards per column, 1–3. */
export const kanban = defineFigure({
  name: "Kanban",
  label: "Cards moving across three columns",
  offset: 12,
  setup: ({ spring }) => ({ col: spring(1, 110, 18), lift: spring(0, 160, 16), fall: spring(0, 70, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const per = ctx.count(2, 3, 1);
    const stack = [per, per - 1, per - 1];
    let col = 1, lift = state === "idle" ? ctx.hover * 4 : 0, op = 1;
    if (state === "loading") {
      const q = ctx.loop(3.2);
      const a = clamp((q - 0.1) / 0.3), b = clamp((q - 0.5) / 0.3);
      col = smoothstep(a) + smoothstep(b);
      lift = 6 * (bump(a) + bump(b));
      op = Math.min(smoothstep(q / 0.08), 1 - smoothstep((q - 0.88) / 0.1));
      m.col.set(col); m.lift.set(lift);
    } else if (state === "success") col = 2;
    else if (state === "error") col = 1.5;
    const C = clamp(m.col.to(col).value, 0, 2), L = m.lift.to(lift).value;
    const F = clamp(m.fall.to(state === "error" ? 1 : 0).value);

    // The board stands on two feet, its face toward the lower left.
    const FY = -4, frame: Tone = empty ? "ghost" : "base";
    scene.box(0, 4, 0, 140, 56, 4, "base");
    for (const x of [-50, 50]) {
      scene.box(x, 0, 4, 8, 34, 3, frame);
      scene.box(x, -6, 7, 4, 4, 6, frame);
    }
    scene.box(0, -6, 12, 120, 4, 78, frame);
    const face = (x: number, z: number): Vec3 => [x, FY + 0.05, z];
    const rule: Tone = empty ? "ghost" : "faint";
    scene.polyline([face(-56, 14), face(56, 14), face(56, 86), face(-56, 86)], rule, { closed: true });
    for (const x of [-19, 19]) scene.line(face(x, 16), face(x, 84), rule);
    scene.line(face(-55, 75), face(55, 75), rule);
    if (empty) return;
    KCOL.forEach((cx, c) => scene.line(face(cx - 12, 80.5), face(cx + [8, 4, -2][c]!, 80.5),
      state === "success" && c === 2 ? "ok" : "base", { bold: true }));

    // A card: a thin slab with two lines of text on its face.
    const card = (x: number, y: number, z: number, tone: Tone, opacity = 1) => {
      scene.box(x, y + 1, z, 32, 2, 13, tone, opacity);
      const fy = y + 2.05;
      scene.line([x - 12, fy, z + 9], [x + 9, fy, z + 9], tone === "base" ? "muted" : tone, { opacity });
      scene.line([x - 12, fy, z + 5], [x - 1, fy, z + 5], "faint", { opacity });
    };
    KCOL.forEach((cx, c) => {
      for (let k = 0; k < stack[c]!; k++) card(cx, FY, kSlot(k), state === "success" && c === 2 ? "ok" : "base");
    });

    // The moving card travels to the next free slot of each column.
    const lo = Math.min(2, Math.floor(C)), hi = Math.min(2, lo + 1), f = C - lo;
    const tz = lerp(kSlot(stack[lo]!), kSlot(stack[hi]!), f);
    const tx = lerp(KCOL[lo]!, KCOL[hi]!, f) + shake;
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
    if (F < 0.02) { card(tx, FY + L, tz + L * 0.4, tone, op); return; }

    // On error it peels off between Doing and Done, tips forward and lands face down on the plate.
    const phi = (F * Math.PI) / 2, py = lerp(FY + 2, FY + 12, F), pz = lerp(tz, 4, F * F), yaw = 0.35 * F, px = tx + 6 * F;
    const at = (u: number, v: number, n: number): Vec3 => {
      const dy = n * Math.cos(phi) + v * Math.sin(phi), dz = v * Math.cos(phi) - n * Math.sin(phi);
      return [px + u * Math.cos(yaw) - dy * Math.sin(yaw), py + u * Math.sin(yaw) + dy * Math.cos(yaw), pz + dz];
    };
    const quad = (n: number): Vec3[] => [at(-16, 0, n), at(16, 0, n), at(16, 13, n), at(-16, 13, n)];
    (F < 0.5 ? [-2, 0] : [0, -2]).forEach(n => scene.panel(quad(n), "err"));
    if (F < 0.5) scene.line(at(-12, 9, 0.05), at(9, 9, 0.05), "err");
  },
});

/** A checklist that ticks off line by line. Use for to-dos, onboarding steps and task completion. `count`: items, 2–5. */
export const todo = defineFigure({
  name: "Todo",
  label: "A checklist ticking off items",
  offset: -16,
  setup: ({ spring }) => ({ tick: Array.from({ length: 5 }, () => spring(0, 180, 16)), up: spring(0, 140, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const n = ctx.count(4, 5, 2);
    const pr = state === "loading" ? ctx.progress(n + 1) * n : 0;
    const done = state === "success" ? n : state === "loading" ? Math.min(n, Math.floor(pr)) : state === "error" ? n - 1 : state === "idle" ? 1 : 0;
    const cur = Math.min(n - 1, done), sub = state === "loading" ? pr - Math.floor(pr) : 0;
    const up = m.up.to(state === "loading" ? 1 : 0).value;
    const rowY = (k: number) => 6 + (k - (n - 1) / 2) * 15;

    // A spiral notepad: a card back, the block of sheets and a coil through the top edge.
    const pad: Tone = empty ? "ghost" : "base", top = 12.05;
    scene.box(6, 6, 0, 128, 124, 4, "base");
    scene.box(0, 4, 4, 80, 96, 2, pad);
    scene.box(0, 5, 6, 76, 92, 6, pad);
    for (let k = 0; k < 8; k++) {
      const x = -31.5 + k * 9;
      if (!empty) scene.disc(x, -38.3, top, 1.2, "faint");
      scene.polyline(Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI / 4 + (i / 8) * 1.05 * Math.PI;
        return [x, -41.5 + 3.6 * Math.cos(a), 9.5 + 3.6 * Math.sin(a)] as Vec3;
      }), empty ? "ghost" : "muted", { bold: !empty });
    }
    if (empty) {
      for (let k = 0; k < n; k++) scene.rect(-31.6, rowY(k) - 3.6, -24.4, rowY(k) + 3.6, top, "ghost");
      return;
    }

    // The rows: a box and two lines of text; a done row fills its box and is struck through.
    for (let k = 0; k < n; k++) {
      const y = rowY(k), T = m.tick[k]!.to(k < done ? 1 : 0).value, failed = state === "error" && k === n - 1;
      const writing = state === "loading" && k === cur && k >= done;
      const tone: Tone = failed ? "err" : writing ? "hi" : T > 0.5 ? (state === "success" ? "ok" : "base") : "muted";
      const x0 = -28 + (failed ? shake : 0), len = 42 - (k % 2) * 12;
      const box = (r: number) => scene.rect(x0 - r, y - r, x0 + r, y + r, top, tone);
      box(3.6);
      if (T > 0.5) { box(2.2); box(0.9); }
      scene.line([-18, y - 1.8, top], [-18 + len, y - 1.8, top], failed ? "err" : "faint");
      scene.line([-18, y + 1.8, top], [-18 + len * 0.6, y + 1.8, top], failed ? "err" : "faint");
      const strike = k < done ? (state === "loading" ? 1 : T) : writing ? sub : 0;
      if (strike > 0.02) scene.line([-20, y, top + 0.02], [-20 + (len + 4) * strike, y, top + 0.02], tone, { bold: true });
    }

    // The pencil strikes the current row; otherwise it lies on the plate. On error it has snapped.
    if (state === "error") {
      drawTool(scene, PENCIL, PENCIL_BANDS, tool([52 + shake, 34, 5.4], -Math.PI / 2 + 0.2, 0), "err", undefined, 8);
      drawTool(scene, PENCIL, PENCIL_BANDS, tool([47, 50, 5.4], 2.4, 0), "err", undefined, -1, 7.5);
      return;
    }
    const lift = state === "idle" ? ctx.hover * 5 : 0;
    drawTool(scene, PENCIL, PENCIL_BANDS, tool([52, 38, 5.4 + lift], -Math.PI / 2 + 0.12, 0), "base", 1 - up);
    if (up > 0.02) {
      const len = 42 - (cur % 2) * 12;
      drawTool(scene, PENCIL, PENCIL_BANDS, tool([-20 + (len + 4) * sub, rowY(cur), 12.4], -0.75, 0.62), "hi", up);
    }
  },
});

const PL = Math.hypot(26, 70);

/** A calendar week with blocks being placed. Use for scheduling, planners and time blocks. */
export const planner = defineFigure({
  name: "Planner",
  label: "Blocks placed on a desk calendar's week",
  offset: -4,
  setup: ({ spring }) => ({ slide: spring(0, 110, 14), lift: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const blocks = [[0, 0, 2], [3, 1, 3], [1, 2, 2], [4, 3, 3]] as const;
    const pr = state === "loading" ? ctx.progress(blocks.length + 1) * blocks.length : 0;
    const placed = empty ? 0 : state === "loading" ? Math.floor(pr) : state === "idle" ? 3 : blocks.length;
    const S = m.slide.to(state === "error" ? 1 : 0).value, H = m.lift.to(state === "idle" ? ctx.hover : 0).value;

    // A tent calendar: two leaves meeting at a ring binding; the front leaf faces the lower right.
    const nx = 70 / PL, nz = 26 / PL;
    const P = (a: number, b: number, n = 0): Vec3 => [30 - (26 * b) / PL + n * nx, -a, 4 + (70 * b) / PL + n * nz];
    const Q = (a: number, b: number): Vec3 => [-22 + (26 * b) / PL, -a, 4 + (70 * b) / PL];
    const rect = (a0: number, b0: number, a1: number, b1: number, n = 0.3): Vec3[] => [P(a0, b0, n), P(a1, b0, n), P(a1, b1, n), P(a0, b1, n)];
    scene.box(2, 0, 0, 112, 124, 4, "base");
    const leaf = (pts: Vec3[]) => empty ? scene.polyline(pts, "ghost", { closed: true }) : scene.panel(pts, "base");
    leaf([Q(-50, 0), Q(50, 0), Q(50, PL), Q(-50, PL)]);
    if (!empty) leaf(rect(-50, 0, 50, PL, -1.8));
    leaf(rect(-50, 0, 50, PL, 0));
    for (let k = 0; k < 7; k++) {
      const y = -39 + k * 13;
      scene.polyline(Array.from({ length: 11 }, (_, i) => {
        const g = (i / 10) * Math.PI * 2;
        return [4 + 3.6 * Math.cos(g), y, 74 + 3.6 * Math.sin(g)] as Vec3;
      }), empty ? "ghost" : "muted", { bold: !empty });
    }
    if (empty) return;

    // The month header, the weekday row and the grid of days.
    const head: Tone = state === "success" ? "ok" : "base";
    scene.panel(rect(-44, PL - 21, 44, PL - 8), head);
    scene.line(P(-36, PL - 14.5, 0.4), P(-8, PL - 14.5, 0.4), head === "base" ? "muted" : "ok", { bold: true });
    scene.line(P(22, PL - 14.5, 0.4), P(36, PL - 14.5, 0.4), "faint");
    const g0 = 6, g1 = PL - 29, rh = (g1 - g0) / 4;
    for (let c = 0; c < 7; c++) scene.line(P(-39.5 + c * 12, PL - 25, 0.3), P(-34.5 + c * 12, PL - 25, 0.3), "faint");
    for (let c = 0; c <= 7; c++) scene.line(P(-42 + c * 12, g0, 0.2), P(-42 + c * 12, g1, 0.2), "faint");
    for (let r = 0; r <= 4; r++) scene.line(P(-42, g0 + r * rh, 0.2), P(42, g0 + r * rh, 0.2), "faint");

    // The blocks stand slightly off the page; the arriving one drops in, the clashing one slides off the edge.
    blocks.forEach(([c, r, span], k) => {
      let drop = 0, op = 1, tone: Tone = state === "success" ? "ok" : "base";
      if (k >= placed) {
        if (state !== "loading" || k !== placed) return;
        const f = pr - placed;
        drop = 14 * (1 - smoothstep(f)); op = smoothstep(f * 3); tone = "hi";
      }
      const a0 = -42 + c * 12 + 1.2, a1 = -42 + (c + span) * 12 - 1.2, bt = g1 - r * rh - 1.2, bb = bt - rh + 2.4;
      let pts: P2[] = [[a0, bb], [a1, bb], [a1, bt], [a0, bt]];
      if (state === "error" && k === blocks.length - 1) {
        tone = "err";
        const ca = (a0 + a1) / 2, cb = (bb + bt) / 2, g = -0.4 * S;
        pts = pts.map(([a, b]) => [ca + 13 * S + (a - ca) * Math.cos(g) - (b - cb) * Math.sin(g), cb - 9 * S + (a - ca) * Math.sin(g) + (b - cb) * Math.cos(g)]);
      }
      const n = 0.6 + drop + H * 2.5;
      scene.panel(pts.map(([a, b]) => P(a, b, n)), tone, op);
      const [p0, , p2, p3] = pts as [P2, P2, P2, P2];
      const mid = (t: number, s: number): Vec3 => P(lerp(p0[0], p3[0], s) + (p2[0] - p3[0]) * t, lerp(p0[1], p3[1], s) + (p2[1] - p3[1]) * t, n + 0.05);
      scene.line(mid(0.12, 0.5), mid(0.55, 0.5), tone === "base" ? "muted" : tone, { opacity: op });
    });
  },
});

/** A stopwatch counting down. Use for focus sessions, countdowns and time tracking. */
export const timer = defineFigure({
  name: "Timer",
  label: "A stopwatch counting down",
  offset: 0,
  setup: ({ spring }) => ({ left: spring(1, 90, 16), rot: spring(0, 90, 12), press: spring(0, 200, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const left = state === "loading" ? 1 - ctx.progress(12) : state === "success" ? 0 : state === "error" ? 0.6 : state === "empty" ? 1 : 0.7;
    const L = clamp(m.left.to(left).value);
    const rot = m.rot.to(state === "error" ? 0.2 : state === "idle" ? -ctx.hover * 0.06 : 0).value;
    const press = m.press.to(state === "success" ? 3.5 : state === "loading" ? 1.5 : 0).value;
    const tone: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const R = 31, zc = 50, k = Math.SQRT1_2, cr = Math.cos(rot), sr = Math.sin(rot);
    const F = (u: number, v: number, n = 0): Vec3 => facing(n * k + shake, n * k, zc, u * cr + v * sr, -u * sr + v * cr);
    const circ = (cu: number, cv: number, r: number, n: number, steps = 28): Vec3[] =>
      Array.from({ length: steps }, (_, i) => F(cu + r * Math.cos((i / steps) * Math.PI * 2), cv + r * Math.sin((i / steps) * Math.PI * 2), n));
    const rectF = (u0: number, v0: number, u1: number, v1: number, n: number): Vec3[] => [F(u0, v0, n), F(u1, v0, n), F(u1, v1, n), F(u0, v1, n)];
    const solid = (pts: Vec3[]) => empty ? scene.polyline(pts, "ghost", { closed: true }) : scene.panel(pts, tone);

    // A stand with a cradle for the watch.
    scene.box(0, 0, 0, 100, 100, 4, "base");
    scene.box(-3, -3, 4, 40, 22, 15, empty ? "ghost" : "base");

    // The bow, the crown on its stem and the pusher, behind the case.
    const top = R + 5 - press;
    scene.polyline(circ(0, top + 10.5, 5.2, -3.5, 16), empty ? "ghost" : tone, { bold: !empty, closed: true });
    if (!empty) solid(rectF(-2.4, R - 3, 2.4, top, -5.5));
    solid(rectF(-2.4, R - 3, 2.4, top, -1.5));
    if (!empty) solid(rectF(-6.5, top, 6.5, top + 5.5, -6));
    solid(rectF(-6.5, top, 6.5, top + 5.5, -1));
    const g = Math.PI / 4, pu = (r: number, w: number) => [r * Math.sin(g) + w * Math.cos(g), r * Math.cos(g) - w * Math.sin(g)] as const;
    const pusher = (n: number): Vec3[] => [pu(R - 3, -2), pu(R + 5, -2), pu(R + 5, 2), pu(R - 3, 2)].map(([u, v]) => F(u, v, n));
    if (!empty) solid(pusher(-5));
    solid(pusher(-1.5));

    // The case, the bezel, the dial with its graduations.
    if (!empty) solid(circ(0, 0, R, -7));
    solid(circ(0, 0, R, 0));
    if (empty) return;
    for (const u of [-3.5, 0, 3.5]) scene.line(F(u, top + 1.2, -0.95), F(u, top + 4.3, -0.95), "muted");
    scene.polyline(circ(0, 0, R - 3.5, 0.1), "muted", { closed: true });
    scene.panel(circ(0, 0, R - 5.5, 0.2), "base");
    for (let i = 0; i < 12; i++) {
      const a = Math.PI / 2 - (i * Math.PI) / 6, r1 = R - 8, r2 = i % 3 === 0 ? R - 12.5 : R - 10;
      scene.line(F(r1 * Math.cos(a), r1 * Math.sin(a), 0.3), F(r2 * Math.cos(a), r2 * Math.sin(a), 0.3), i % 3 === 0 ? "base" : "muted", { bold: i % 3 === 0 });
    }

    // The time left: a sector from twelve, and the hand at its edge.
    const accent: Tone = state === "loading" ? "hi" : state === "idle" ? "muted" : tone;
    if (L > 0.01) {
      const steps = Math.max(2, Math.ceil(L * 32));
      scene.panel([F(0, 0, 0.4), ...Array.from({ length: steps + 1 }, (_, i) => {
        const a = Math.PI / 2 - (i / steps) * L * Math.PI * 2;
        return F(15 * Math.cos(a), 15 * Math.sin(a), 0.4);
      })], accent);
    }
    const ha = Math.PI / 2 - L * Math.PI * 2, hand: Tone = state === "idle" ? "base" : accent;
    scene.line(F(-5 * Math.cos(ha), -5 * Math.sin(ha), 0.6), F((R - 9) * Math.cos(ha), (R - 9) * Math.sin(ha), 0.6), hand, { bold: true });
    scene.panel(circ(0, 0, 2.4, 0.7, 10), hand);
    // On error the glass is cracked.
    if (state === "error") {
      scene.polyline(([[-24, 9], [-13, 4], [-9, 10], [3, -2], [9, 1], [21, -11]] as const).map(([u, v]) => F(u, v, 0.8)), "err", { opacity: ctx.fade(0.3) });
    }
  },
});

const sig = (t: number): Vec3 => [-28 + 42 * t + 3 * Math.sin(9 * Math.PI * t), 25 - 4 * Math.sin(9 * Math.PI * t + 0.8) * (1 - 0.3 * t), 6.15];

/** A contract being signed with a fountain pen. Use for e-signatures, contracts and approvals. */
export const sign = defineFigure({
  name: "Sign",
  label: "A document being signed",
  offset: -12,
  setup: ({ spring }) => ({ pen: spring(0, 160, 16), up: spring(0, 140, 16), seal: spring(0, 140, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    let t = state === "success" ? 1 : state === "error" ? 0.55 : 0;
    if (state === "loading") { t = smoothstep(clamp(ctx.loop(2.4) / 0.85)); m.pen.set(t); }
    const T = clamp(m.pen.to(t).value), up = m.up.to(state === "loading" ? 1 : 0).value;
    const seal = clamp(m.seal.to(state === "success" ? 1 : 0).value);
    const ink: Tone = state === "loading" ? "hi" : ctx.verdict();

    // The contract: a title, body text, a signature line and a sign-here tab past its edge.
    scene.box(4, 2, 0, 124, 112, 4, "base");
    scene.box(-6, 2, 4, 72, 94, 2, empty ? "ghost" : "base");
    const Z = 6.05;
    const flag: Vec3[] = [[24, 25, Z + 0.1], [46, 25, Z + 0.1], [46, 35, Z + 0.1], [24, 35, Z + 0.1], [19, 30, Z + 0.1]];
    if (empty) {
      scene.line([-30, 30, Z], [16, 30, Z], "ghost");
      scene.polyline(flag, "ghost", { closed: true });
      return;
    }
    scene.line([-32, -36, Z], [-4, -36, Z], "base", { bold: true });
    for (let k = 0; k < 5; k++) scene.line([-32, -27 + k * 7, Z], [k === 4 ? 0 : 20 - (k % 2) * 6, -27 + k * 7, Z], "muted");
    scene.line([-30, 30, Z], [16, 30, Z], "base");
    scene.panel(flag, state === "idle" ? "muted" : state === "loading" ? "base" : ink);
    scene.line([30, 30, Z + 0.15], [41, 30, Z + 0.15], state === "idle" || state === "loading" ? "faint" : ink);

    // The signature, written as far as the pen has gone.
    const steps = Math.ceil(40 * T);
    if (steps >= 1) scene.polyline(Array.from({ length: steps + 1 }, (_, i) => sig((i / steps) * T)), ink, { bold: true });
    if (state === "error") {
      const [bx, by] = sig(0.55);
      scene.disc(bx + 1.5, by + 1, Z + 0.2, 3.4, "err", { fill: true, opacity: ctx.fade(0.3) });
      scene.disc(bx + 6, by - 2, Z + 0.2, 1.2, "err", { fill: true, opacity: ctx.fade(0.3) });
    }
    // Signed: an embossed seal with two ribbon tails.
    if (seal > 0.02) {
      scene.line([4, 45, Z + 0.1], [1, 50, Z + 0.1], "ok", { bold: true, opacity: seal });
      scene.line([8, 46, Z + 0.1], [10, 51, Z + 0.1], "ok", { bold: true, opacity: seal });
      scene.disc(6, 42, Z + 0.15, 6 * seal, "ok", { plate: true });
      scene.disc(6, 42, Z + 0.2, 3.8 * seal, "ok");
    }

    // The pen writes, rests on the plate, or on error has dropped across the page.
    if (state === "error") {
      drawTool(scene, FOUNTAIN, FOUNTAIN_BANDS, tool([-16 + shake, 22, 7.4], -0.4, 0), "err");
      return;
    }
    const lift = state === "idle" ? ctx.hover * 5 : 0;
    drawTool(scene, FOUNTAIN, FOUNTAIN_BANDS, tool([48, 26, 5.4 + lift], -Math.PI / 2 + 0.25, 0), "base", 1 - up);
    if (up > 0.02) {
      const [sx, sy] = sig(T);
      drawTool(scene, FOUNTAIN, FOUNTAIN_BANDS, tool([sx, sy, 6.6], -0.55, 0.8), "hi", up);
    }
  },
});

/** A notebook being written in and closing. Use for notes, drafts, saving and journaling. */
export const notes = defineFigure({
  name: "Notes",
  label: "A notebook being written in and closed",
  offset: -14,
  setup: ({ spring }) => ({ fold: spring(0, 70, 14), curl: spring(0, 160, 16), tear: spring(0, 90, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const th = Math.PI * clamp(m.fold.to(state === "success" ? 1 : 0).value);
    const curl = m.curl.to(state === "idle" ? ctx.hover : 0).value;
    const tear = clamp(m.tear.to(state === "error" ? 1 : 0).value);
    const written = state === "loading" ? ctx.progress(3.6) * 6 : state === "idle" ? 3 : state === "error" ? 0 : 6;
    const Y0 = -42, Y1 = 30, ly = (i: number) => Y0 + 9 + i * 8.5, llen = (i: number) => 36 - (i % 3) * 7;

    scene.box(0, 8, 0, 136, 112, 4, "base");
    const shell: Tone = empty ? "ghost" : "base";
    // The left half lies still: a cover board under a block of pages.
    scene.box(-25, -6, 4, 50, 76, 2, shell);
    scene.box(-23.5, -6, 6, 47, 72, 6, shell);
    if (empty) {
      scene.box(25, -6, 4, 50, 76, 2, "ghost");
      scene.box(23.5, -6, 6, 47, 72, 6, "ghost");
      return;
    }
    for (let i = 0; i < 7; i++) scene.line([-42, ly(i), 12.05], [-42 + llen(i + 1), ly(i), 12.05], i < 6 ? "muted" : "faint");

    // The right half turns about the spine at the page top: d out from the spine, h up from the page.
    const R = (d: number, y: number, h: number): Vec3 => [d * Math.cos(th) - h * Math.sin(th), y, 12 + d * Math.sin(th) + h * Math.cos(th)];
    const c = Math.cos(th), s = Math.sin(th);
    const slab = (d1: number, y0: number, y1: number, h0: number, h1: number, tone: Tone) => {
      scene.panel([R(0, y1, h0), R(d1, y1, h0), R(d1, y1, h1), R(0, y1, h1)], tone);
      if (c + s > 0) scene.panel([R(d1, y0, h0), R(d1, y1, h0), R(d1, y1, h1), R(d1, y0, h1)], tone);
      if (c - s > 0) scene.panel([R(0, y0, h1), R(d1, y0, h1), R(d1, y1, h1), R(0, y1, h1)], tone);
      else scene.panel([R(0, y0, h0), R(d1, y0, h0), R(d1, y1, h0), R(0, y1, h0)], tone);
    };
    const coverTone: Tone = state === "success" ? "ok" : "base";
    if (th < Math.PI / 2) { slab(50, Y0 - 2, Y1 + 2, -8, -6, coverTone); slab(47, Y0, Y1, -6, 0, "base"); }
    else { slab(47, Y0, Y1, -6, 0, "base"); slab(50, Y0 - 2, Y1 + 2, -8, -6, coverTone); }
    if (c - s > 0) {
      // Writing on the right page; the line being written grows under the pen.
      if (state !== "error") for (let i = 0; i < 7; i++) {
        const f = clamp(written - i);
        scene.line(R(5, ly(i), 0.05), R(5 + llen(i), ly(i), 0.05), "faint");
        if (f > 0.02) scene.line(R(5, ly(i), 0.1), R(5 + llen(i) * f, ly(i), 0.1), state === "loading" && f < 1 ? "hi" : state === "success" ? "ok" : "muted");
      }
      if (tear > 0.02) scene.polyline(Array.from({ length: 10 }, (_, i) => R(i % 2 ? 7 : 3.5, Y0 + 1 + i * 7.8, 0.1)), "err");
      if (curl > 0.03) {
        const k = 11 * curl;
        scene.panel([R(47 - k, Y1, 0.1), R(47, Y1 - k, 0.1), R(47 - k * 0.45, Y1 - k * 0.45, k * 0.75)], "base");
      }
    } else {
      // Closed: the elastic band runs down the cover.
      scene.line(R(41, Y0 - 2, -8.1), R(41, Y1 + 2, -8.1), coverTone, { bold: true });
    }
    // The ribbon bookmark hangs out of the spine.
    scene.polyline([[0.5, Y1 - 4, 12.2], [2, Y1 + 6, 8], [4, Y1 + 13, 4.1]], "muted", { bold: true });

    // The pen writes on the right page, otherwise it lies on the plate in front.
    const lift = 0;
    if (state === "loading") {
      const i = Math.min(6, Math.floor(written)), f = written - i;
      drawTool(scene, BALLPOINT, BALLPOINT_BANDS, tool(R(5 + llen(i) * f, ly(i), 0.3), -0.7, 0.65), "hi");
    } else {
      drawTool(scene, BALLPOINT, BALLPOINT_BANDS, tool([-44, 44, 5.4 + lift], 0.08, 0), "base");
    }

    // On error the page is torn out and lands crumpled on the plate.
    if (tear > 0.02) {
      const shape: P2[] = [[46, Y0 + 1], [46, Y1 - 1], ...Array.from({ length: 10 }, (_, i) => [i % 2 ? 7 : 3.5, Y1 - 1 - i * 7.8] as P2)];
      const g = 1.15 * tear, sc = lerp(1, 0.52, tear), cx = lerp(25, 34, tear), cy = lerp(-6, 47, tear), cz = lerp(12.2, 4.2, tear) + 16 * bump(tear);
      const at = ([d, y]: P2): Vec3 => {
        const u = (d - 25) * sc, v = (y + 6) * sc;
        return [cx + shake + u * Math.cos(g) - v * Math.sin(g), cy + u * Math.sin(g) + v * Math.cos(g), cz];
      };
      scene.panel(shape.map(at), "err");
      if (tear > 0.5) {
        scene.line(at([12, Y0 + 10]), at([40, Y1 - 20]), "err", { opacity: tear });
        scene.line(at([30, Y0 + 4]), at([22, Y1 - 6]), "err", { opacity: tear });
      }
    }
  },
});

/** A folder of files being archived. Use for archiving, cleanup and retention. `count`: files, 1–4. */
export const archive = defineFigure({
  name: "Archive",
  label: "Files being archived into a box",
  offset: 8,
  setup: ({ spring }) => ({ files: Array.from({ length: 4 }, () => spring(0, 150, 18)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(3, 4, 1);
    scene.box(0, 0, 0, 120, 70, 16, state === "empty" ? "ghost" : "base");
    scene.box(0, -34, 16, 130, 10, 6, state === "empty" ? "ghost" : "muted");
    for (let k = 0; k < 4; k++) {
      const q = state === "loading" ? (ctx.loop(2.4) + k * 0.2) % 1 : 0;
      const z = k < n ? 16 + (state === "loading" ? 10 * Math.sin(q * Math.PI) : 0) + k * 2 : -8;
      const Z = m.files[k]!.to(state === "empty" ? -8 : z).value;
      if (k >= n && state !== "loading") continue;
      scene.box(0 + (state === "error" && k === 0 ? shake : 0), -22 + k * 3, Z + 16 - (k === 0 ? 0 : 0), 84, 22, 2, state === "success" ? "ok" : state === "error" && k === 0 ? "err" : "muted", state === "empty" ? 0.5 : 1);
    }
  },
});

/** A parcel being packed into a shipping box. Use for fulfilment, packing and bulk operations. */
export const pack = defineFigure({
  name: "Pack",
  label: "A parcel dropping into a box",
  offset: 6,
  setup: ({ spring }) => ({ drop: spring(40, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let z = 40;
    if (state === "loading") z = 40 - 34 * smoothstep(ctx.loop(2));
    if (state === "success") z = 0;
    if (state === "error") z = 30;
    const Z = m.drop.to(z).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 90, 90, 6, tone);
    scene.box(-45, 0, 6, 6, 90, 22, "muted");
    scene.box(45, 0, 6, 6, 90, 22, "muted");
    scene.box(0, -45, 6, 90, 6, 22, "muted");
    if (state !== "empty") parcel(scene, shake, 0, Z + 6, tone === "base" ? "base" : tone);
  },
});

/** A pinned note with a pin dropping in. Use for pins, bookmarks and highlights. */
export const pin = defineFigure({
  name: "Pin",
  label: "A pin dropping onto a card",
  offset: 4,
  setup: ({ spring }) => ({ drop: spring(40, 170, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let z = 40;
    if (state === "loading") z = 40 - 30 * bump(ctx.loop(1.6));
    if (state === "success" || state === "error") z = 12;
    if (state === "idle") z = 40 - ctx.hover * 8;
    const Z = m.drop.to(z).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 96, 70, 3, "base");
    for (let k = 0; k < 3; k++) scene.line([-32, -18 + k * 14, 3.05], [22 - k * 6, -18 + k * 14, 3.05], "muted");
    scene.cylinder(-18 + shake, 10, 3, 3, Math.max(0.5, Z - 3), tone);
    scene.disc(-18 + shake, 10, Z, 6, tone, { fill: true });
  },
});

/** A whiteboard being drawn on, one stroke after another. Use for brainstorms, collaboration and drawing tools. */
export const whiteboard = defineFigure({
  name: "Whiteboard",
  label: "A whiteboard being drawn on",
  offset: 4,
  setup: ({ spring }) => ({ ink: spring(0, 130, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const strokes = state === "loading" ? Math.floor(ctx.loop(3.2) * 4) : state === "success" ? 4 : state === "empty" ? 0 : 2;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : "muted";
    scene.box(0, 0, 0, 130, 90, 3, "base");
    scene.rect(-54, -36, 54, 36, 3.05, "faint");
    const paths: [number, number][][] = [
      [[-42, -20], [-20, -28], [-6, -10]],
      [[0, -26], [18, -26], [34, -10]],
      [[-40, 8], [-10, 12], [16, 6], [40, 14]],
      [[-22, 26], [0, 22], [22, 30]],
    ];
    paths.slice(0, strokes).forEach((p, i) => {
      const pts = p.map(([x, y]) => [x + (state === "error" && i === 3 ? shake : 0), y, 3.1] as Vec3);
      scene.polyline(pts, state === "loading" && i === strokes - 1 ? "hi" : i === 3 && state === "error" ? "err" : tone, { bold: true });
    });
  },
});

/** A chart of tasks completing on a progress track with a flag at the finish. Use for milestones, goals and launches. */
export const milestone = defineFigure({
  name: "Milestone",
  label: "A track with milestones and a flag",
  offset: 4,
  setup: ({ spring }) => ({ runner: spring(0, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const p = state === "loading" ? ctx.progress(3) : state === "success" ? 1 : state === "error" ? 0.45 : state === "empty" ? 0 : 0.3;
    const P = m.runner.to(p).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : "base";
    scene.box(0, 0, 0, 150, 60, 3, "base");
    scene.line([-60, 0, 4], [60, 0, 4], "faint", { bold: true });
    scene.line([-60, 0, 4.05], [-60 + 120 * P, 0, 4.05], tone === "base" ? "hi" : tone, { bold: true });
    [-30, 0, 30].forEach(x => scene.disc(x, 0, 4.1, 4, x / 60 < P - 0.5 ? "hi" : "muted", { fill: true }));
    scene.line([58, 0, 4], [58, 0, 36], "base", { bold: true });
    scene.polyline([[58, 0, 36], [58, 0, 36], [72, 0, 36]].map(([a, b, c]) => [a, b, c] as Vec3), tone, { closed: true });
    scene.disc(-60 + 120 * P + shake, 0, 6, 4, tone, { fill: true });
  },
});
