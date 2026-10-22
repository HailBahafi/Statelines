import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { facing, parcel, person, tray } from "../shapes";

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

/** A box turned about a line along x through `o`: x across, u along the turned y, h along the turned z. Draws the faces that look toward us. */
function turned(scene: Scene, o: Vec3, a: number, x0: number, x1: number, u0: number, u1: number, h0: number, h1: number,
                tone: Tone, opacity?: number): (x: number, u: number, h: number) => Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  const T = (x: number, u: number, h: number): Vec3 => [o[0] + x, o[1] + u * c - h * s, o[2] + u * s + h * c];
  const uf = c + s > 0 ? u1 : u0, hf = c - s > 0 ? h1 : h0;
  scene.panel([T(x1, u0, h0), T(x1, u1, h0), T(x1, u1, h1), T(x1, u0, h1)], tone, opacity);
  scene.panel([T(x0, uf, h0), T(x1, uf, h0), T(x1, uf, h1), T(x0, uf, h1)], tone, opacity);
  scene.panel([T(x0, u0, hf), T(x1, u0, hf), T(x1, u1, hf), T(x0, u1, hf)], tone, opacity);
  return T;
}

/** A folder of files being archived. Use for archiving, cleanup and retention. `count`: files, 1–4. */
export const archive = defineFigure({
  name: "Archive",
  label: "Files being filed into an archive box",
  offset: 24,
  setup: ({ spring }) => ({ lid: spring(0, 110, 14), jam: spring(0, 120, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const n = ctx.count(3, 4, 1);
    const A = m.lid.to(state === "loading" || empty ? 1.95 : state === "error" ? 0.62 : state === "idle" ? ctx.hover * 0.22 : 0).value;
    const J = clamp(m.jam.to(state === "error" ? 1 : 0).value);
    let dz = 0, dop = 1;
    if (state === "loading") {
      const q = ctx.loop(1.8);
      dz = 46 * (1 - smoothstep(q / 0.7));
      dop = smoothstep(q / 0.12) * (1 - smoothstep((q - 0.88) / 0.12));
    }
    const W = 84, D = 50, H = 30, top = 4 + 3 + H;
    const box: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    const fy = (k: number) => (n === 1 ? 0 : -16 + (k * 32) / (n - 1));
    const lid = () => {
      if (empty) {
        const c = Math.cos(A), s = Math.sin(A), L = (x: number, u: number): Vec3 => [x, -27 + u * c, top + u * s];
        scene.polyline([L(-45, 0), L(45, 0), L(45, 54), L(-45, 54)], "ghost", { closed: true });
        return;
      }
      const T = turned(scene, [0, -27, top], A, -45, 45, 0, 54, -6, 3, box);
      if (Math.cos(A) - Math.sin(A) > 0) scene.line(T(-30, 47, 3.05), T(30, 47, 3.05), "faint");
    };

    scene.box(0, 2, 0, 132, 100, 4, "base");
    if (A > Math.PI / 2) lid();
    tray(scene, W, D, H, 4, box, () => {
      if (empty) return;
      const still = state === "loading" || state === "error" ? n - 1 : n;
      // A file: an upright folder with a tab along its top edge.
      const file = (k: number, z: number, tone: Tone, opacity?: number) => {
        scene.box(-2, fy(k), z, 72, 2, 28, tone, opacity);
        scene.box(-26 + k * 16, fy(k), z + 28, 14, 2, 6, tone, opacity);
      };
      for (let k = 0; k < still; k++) file(k, 7, "base");
      if (state === "loading") file(n - 1, 7 + dz, "hi", dop);
      if (state === "error") {
        // The last file jams on its way in and stands crooked out of the box, holding the lid up.
        const T = turned(scene, [-2 + shake, fy(n - 1), 7 + 18 * J], -0.38 * J, -36, 36, -1, 1, 0, 28, "err");
        scene.panel([T(-26 + (n - 1) * 16 - 7, 1, 28), T(-26 + (n - 1) * 16 + 7, 1, 28), T(-26 + (n - 1) * 16 + 7, 1, 34), T(-26 + (n - 1) * 16 - 7, 1, 34)], "err");
      }
    });
    // The front: a hand hole and a label holder; another hand hole on the right end.
    if (!empty) {
      const Y = D / 2 + 0.05;
      const slot = (pts: Vec3[]) => scene.polyline(pts, "muted", { closed: true, bold: true });
      slot([[-9, Y, 22], [9, Y, 22], [11, Y, 24.5], [9, Y, 27], [-9, Y, 27], [-11, Y, 24.5]]);
      scene.polyline([[-15, Y, 9], [15, Y, 9], [15, Y, 18], [-15, Y, 18]], box === "base" ? "muted" : box, { closed: true });
      scene.line([-10, Y, 13.5], [8, Y, 13.5], "faint");
      const Xe = W / 2 + 0.05;
      slot([[Xe, 8, 22], [Xe, -8, 22], [Xe, -10, 24.5], [Xe, -8, 27], [Xe, 8, 27], [Xe, 10, 24.5]]);
    }
    if (A <= Math.PI / 2) lid();
  },
});

/** A parcel being packed into a shipping box. Use for fulfilment, packing and bulk operations. */
export const pack = defineFigure({
  name: "Pack",
  label: "A parcel dropping into a box",
  offset: 14,
  setup: ({ spring }) => ({ drop: spring(0, 160, 16), flap: spring(2.3, 90, 13), tip: spring(0, 120, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    let p = 0;
    if (state === "loading") { p = smoothstep(clamp(ctx.loop(2.2) / 0.85)); m.drop.set(p); }
    if (state === "success") p = 1;
    const P = clamp(m.drop.to(p).value);
    const phi = m.flap.to(state === "success" ? 0 : state === "idle" ? 2.3 - ctx.hover * 0.25 : 2.3).value;
    const tipT = clamp(m.tip.to(state === "error" ? 1 : 0).value);
    const box: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    const top = 4 + 3 + 40, c = Math.cos(phi), s = Math.sin(phi);

    // Four flaps hinged on the rim; 0 folds them shut over the top, larger angles open them outward.
    const flap = (side: number) => {
      const pts: Vec3[] = [];
      const depth = side % 2 ? 26 : 30, lift = side % 2 ? 0 : 0.6;
      for (const [t, d] of [[-30, 0], [30, 0], [30, depth], [-30, depth]] as const) {
        const r = 30 - d * c, z = top + d * s + lift;
        pts.push(side === 0 ? [t, r, z] : side === 1 ? [r, t, z] : side === 2 ? [t, -r, z] : [-r, t, z]);
      }
      if (empty) scene.polyline(pts, "ghost", { closed: true });
      else scene.panel(pts, box);
    };
    // The parcel lifts off the plate, moves over the box and lowers in.
    const up = smoothstep(P / 0.35), across = smoothstep((P - 0.3) / 0.35), down = smoothstep((P - 0.65) / 0.35);
    const px = lerp(-14, 0, across), py = lerp(50, 0, across), pz = 4 + 52 * up - 49 * down;
    const ptone: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : "base";
    const inside = down > 0.05;

    scene.box(0, 10, 0, 128, 124, 4, "base");
    if (phi > Math.PI / 2) { flap(2); flap(3); }
    tray(scene, 60, 60, 40, 4, box, () => {
      if (!empty && inside && state !== "error") parcel(scene, px, py, pz, ptone);
    });
    if (!empty) {
      // A this-way-up mark on the front.
      scene.polyline([[-6, 30.05, 30], [-6, 30.05, 37], [-8.5, 30.05, 34.5]], "faint");
      scene.polyline([[-6, 30.05, 37], [-3.5, 30.05, 34.5]], "faint");
      scene.polyline([[2, 30.05, 30], [2, 30.05, 37], [-0.5, 30.05, 34.5]], "faint");
      scene.polyline([[2, 30.05, 37], [4.5, 30.05, 34.5]], "faint");
      scene.line([-12, 30.05, 27], [10, 30.05, 27], "faint");
    }
    if (phi > Math.PI / 2) { flap(0); flap(1); }
    else { flap(1); flap(3); flap(0); flap(2); }
    // Packed: tape along the seam and down the end.
    if (state === "success" && phi < 0.3) {
      const o = ctx.fade(0.4);
      scene.panel([[-31, -4, top + 0.7], [31, -4, top + 0.7], [31, 4, top + 0.7], [-31, 4, top + 0.7]], "ok", o);
      scene.panel([[30.1, -4, top + 0.7], [30.1, 4, top + 0.7], [30.1, 4, top - 10], [30.1, -4, top - 10]], "ok", o);
    }
    if (empty) return;
    if (state === "error") {
      // It misses: the parcel ends tipped against the front of the box.
      const bx = lerp(-14, 10, tipT) + shake, by = lerp(38, 36, tipT);
      const T = turned(scene, [bx, by, 4 + 10 * bump(tipT)], 0.32 * tipT, -12, 12, 0, 24, 0, 20, "err");
      scene.line(T(0, 0, 20.05), T(0, 24, 20.05), "err");
    } else if (!inside) parcel(scene, px, py, pz, ptone);
  },
});

/** A push pin's side profile from the needle tip along l: needle, flange, neck, grip and cap. */
const PUSHPIN = mirror([[0, 0], [0.5, 1], [16, 1], [16, 13], [19.5, 13], [19.5, 5.5], [36.5, 5.5], [36.5, 17], [49.5, 17], [52.5, 14], [53, 0]]);
const PUSHPIN_BANDS: P2[] = [[19.5, 13], [36.5, 17], [49.5, 17]];

/** A push pin standing upright with its flange at z: flange, neck, grip and cap. */
function pushpin(scene: Scene, x: number, y: number, z: number, tone: Tone, opacity?: number): void {
  scene.cylinder(x, y, z, 13, 3.5, tone, opacity);
  scene.cylinder(x, y, z + 3.5, 5.5, 17, tone, opacity);
  scene.cylinder(x, y, z + 20.5, 17, 13, tone, opacity);
  scene.cylinder(x, y, z + 33.5, 14, 3, tone, opacity);
}

/** A pinned note with a pin dropping in. Use for pins, bookmarks and highlights. */
export const pin = defineFigure({
  name: "Pin",
  label: "A big push pin pinning a paper note to a corkboard",
  offset: 8,
  setup: ({ spring }) => ({ move: spring(0, 120, 15), drop: spring(0, 170, 16), card: spring(0.16, 120, 15), slip: spring(0, 100, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    let z = 0;
    if (state === "loading") z = 28 * (1 - bump(ctx.loop(1.6)));
    const Z = m.drop.to(z).value;
    const M = clamp(m.move.to(state === "loading" || state === "success" ? 1 : 0).value);
    const r = m.card.to(state === "success" ? 0 : state === "error" ? 0.5 : 0.16).value;
    const S = clamp(m.slip.to(state === "error" ? 1 : 0).value);

    // A cork board in a wooden frame, lying on the plate.
    scene.box(0, 0, 0, 176, 132, 4, "base");
    scene.box(0, 0, 4, 162, 118, 7, empty ? "ghost" : "base");
    const top = 11.05;
    if (!empty) {
      scene.rect(-73, -51, 73, 51, top, "muted");
      for (const [x, y] of [[-62, -6], [-40, 40], [60, 42], [66, -10], [-8, -44], [24, 44], [-66, 30]] as const) scene.disc(x, y, top, 1, "muted", { fill: true });
      // Two older notes at the back, each held by a small pin.
      const small = (x: number, y: number, w: number, d: number) => {
        scene.box(x, y, 11, w, d, 1, "base");
        scene.line([x - w / 2 + 5, y - 1, 12.1], [x + w / 2 - 5, y - 1, 12.1], "faint");
        scene.line([x - w / 2 + 5, y + 5, 12.1], [x + 2, y + 5, 12.1], "faint");
        scene.cylinder(x, y - d / 2 + 5, 12, 3, 4, "muted");
        scene.cylinder(x, y - d / 2 + 5, 16, 4.2, 3, "muted");
      };
      small(50, -30, 36, 34);
    }

    // The note: a sheet with lines, turned a little until it is pinned; on error it slips toward the edge.
    const cx = -14 + 30 * S + shake, cy = 6 + 16 * S, cz = 11;
    const C = (u: number, v: number, h = cz): Vec3 => [cx + u * Math.cos(r) - v * Math.sin(r), cy + u * Math.sin(r) + v * Math.cos(r), h];
    const note: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    const NW = 44, ND = 34;
    if (empty) { scene.polyline([C(-NW, -ND, top), C(NW, -ND, top), C(NW, ND, top), C(-NW, ND, top)], "ghost", { closed: true }); return; }
    scene.panel([C(-NW, -ND), C(NW, -ND), C(NW, ND), C(-NW, ND)], note);
    scene.panel([C(-NW, -ND, cz + 1.5), C(NW, -ND, cz + 1.5), C(NW, ND, cz + 1.5), C(-NW, ND, cz + 1.5)], note);
    const ink: Tone = note === "base" ? "muted" : note;
    for (let k = 0; k < 4; k++) scene.line(C(-14, -6 + k * 10, cz + 1.6), C(k === 3 ? 10 : 34, -6 + k * 10, cz + 1.6), ink);

    // The big pin. It waits in the cork, travels to the note's corner and presses in; on error it lies on its side.
    const [nx, ny] = C(-28, -18);
    const rest: [number, number] = [56, 32];
    if (state === "error") {
      const at = tool([lerp(nx, rest[0], S) - 16, lerp(ny, rest[1], S) + 8, top + 1], -0.55, 0.3);
      drawTool(scene, PUSHPIN, PUSHPIN_BANDS, (l, w, n) => at(l, n * 6, w), "err");
      return;
    }
    const lift = state === "idle" ? ctx.hover * 5 : 0;
    const px = lerp(rest[0], nx, M), py = lerp(rest[1], ny, M);
    const base = lerp(top, cz + 1.6, M) + Z + 34 * bump(M) * (state === "loading" ? 0 : 1) + lift;
    const tone: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : "base";
    if (base > cz + 3) {
      scene.disc(px, py, cz + 1.65, 9, "faint", { fill: true, opacity: 0.6 });
      scene.line([px, py, base - 16], [px, py, base], tone, { bold: true });
    }
    pushpin(scene, px, py, base, tone);
  },
});

const MARKER = mirror([[0, 0], [1.5, 1.2], [4, 1.6], [5, 3], [30, 3], [31, 3.4], [42, 3.4], [43, 0]]);
const MARKER_BANDS: P2[] = [[5, 3], [30, 3]];

/** Strokes on the board, in its own coordinates: a across to the right, z up. */
const STROKES: P2[][] = [
  [[-40, 64], [-18, 64], [-18, 78], [-40, 78], [-40, 64]],
  [[-18, 71], [-5, 71], [-8, 74], [-5, 71], [-8, 68]],
  [[-4, 64], [18, 64], [18, 78], [-4, 78], [-4, 64]],
  Array.from({ length: 17 }, (_, i) => [34 + 9 * Math.cos((i / 16) * Math.PI * 2 + Math.PI), 71 + 9 * Math.sin((i / 16) * Math.PI * 2 + Math.PI)] as P2),
  [[-40, 40], [-26, 48], [-14, 44], [0, 54], [14, 49], [38, 58]],
];
/** The first `f` of a stroke's length. */
function partial(pts: readonly P2[], f: number): P2[] {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]));
  let left = seg.reduce((a, b) => a + b, 0) * clamp(f);
  const out: P2[] = [pts[0]!];
  for (let i = 0; i < seg.length && left > 0; i++) {
    const t = Math.min(1, left / seg[i]!), a = pts[i]!, b = pts[i + 1]!;
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
    left -= seg[i]!;
  }
  return out;
}

/** A whiteboard being drawn on, one stroke after another. Use for brainstorms, collaboration and drawing tools. */
export const whiteboard = defineFigure({
  name: "Whiteboard",
  label: "A whiteboard being drawn on",
  offset: 18,
  setup: ({ spring }) => ({ up: spring(0, 140, 16), fall: spring(0, 110, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    let strokes = state === "success" ? 5 : state === "error" ? 3 : state === "idle" ? 3 : 0, cur = -1, f = 0;
    if (state === "loading") {
      const q = ctx.loop(4.4) * 5;
      cur = Math.min(4, Math.floor(q)); f = smoothstep(clamp((q - cur) / 0.8)); strokes = cur;
    }
    const U = m.up.to(state === "loading" ? 1 : 0).value, Fl = clamp(m.fall.to(state === "error" ? 1 : 0).value);

    // A mobile stand: casters, feet, uprights, the board with its face to the lower right and a marker tray.
    const X = -10, Xf = X + 2.05, frame: Tone = empty ? "ghost" : "base";
    scene.box(4, 0, 0, 96, 128, 4, "base");
    for (const y of [-46, 46]) {
      for (const dx of [-17, 17]) scene.cylinder(X + dx, y, 4, 2.4, 2.5, frame);
      scene.box(X, y, 6.5, 40, 5, 3, frame);
      scene.box(X, y, 9.5, 4, 4, 21, frame);
    }
    scene.box(X + shake, 0, 30, 4, 104, 62, frame);
    const B = (a: number, z: number, n = 0): Vec3 => [Xf + n + shake, -a, z];
    if (empty) return;
    scene.polyline([B(-49, 33), B(49, 33), B(49, 89), B(-49, 89)], "faint", { closed: true });
    scene.box(Xf + 3.5, 0, 27.5, 7, 92, 2, "base");
    scene.box(Xf + 6.5, 0, 29.5, 1, 92, 2.5, "base");

    // The drawing: two boxes joined by an arrow, a circle and a rising line.
    const ink: Tone = state === "success" ? "ok" : "base";
    STROKES.forEach((s, i) => {
      if (i < strokes) scene.polyline(s.map(([a, z]) => B(a, z, 0.05)), i === 2 && state === "error" ? "err" : ink, { bold: true });
      else if (i === cur && f > 0.01) scene.polyline(partial(s, f).map(([a, z]) => B(a, z, 0.05)), "hi", { bold: true });
    });
    // Error: the last box is scribbled out.
    if (state === "error") {
      const o = ctx.fade(0.5);
      scene.polyline(Array.from({ length: 9 }, (_, i) => B(-2 + i * 2.6, i % 2 ? 62 : 80, 0.1)), "err", { bold: true, opacity: o });
    }

    // The tray holds an eraser and a marker; the other marker is in use, or has fallen on error.
    scene.box(Xf + 3.5, 34, 29.5, 6, 14, 5, "muted");
    if (state === "loading" && U > 0.02) {
      const s = STROKES[Math.max(0, cur)]!, pts = partial(s, f), [a, z] = pts[pts.length - 1]!;
      drawTool(scene, MARKER, MARKER_BANDS, tool(B(a, z, 0.4), 0.55, 0.3), "hi", U);
    } else if (state === "error") {
      drawTool(scene, MARKER, MARKER_BANDS, tool([lerp(Xf + 3.5, 24, Fl), lerp(-44, -10, Fl), lerp(32.6, 7.4, Fl) + 8 * bump(Fl)], Math.PI / 2 + 1.1 * Fl, 0), "err");
    } else {
      drawTool(scene, MARKER, MARKER_BANDS, tool([Xf + 3.5, -44, 32.6 + (state === "idle" ? ctx.hover * 3 : 0)], Math.PI / 2, 0), "base");
    }
  },
});

/** A rocky peak: a ring of base points (radius jittered) under an apex. */
interface Peak { ring: Vec3[]; apex: Vec3; turn: number }
function makePeak(cx: number, cy: number, R: number, H: number, jitter: readonly number[], turn = 0): Peak {
  const n = jitter.length;
  const ring = jitter.map((j, i): Vec3 => { const a = turn + (i / n) * Math.PI * 2; return [cx + R * j * Math.cos(a), cy + R * j * Math.sin(a), 4]; });
  return { ring, apex: [cx - 3, cy - 3, 4 + H], turn };
}
/** The point on the peak's skin at fraction h of its height and angle a about its axis. */
function onPeak(k: Peak, h: number, a: number): Vec3 {
  const n = k.ring.length, f = ((((a - k.turn) / (Math.PI * 2)) * n) % n + n) % n, i = Math.floor(f), t = f - i;
  const ridge = (p: Vec3): Vec3 => [lerp(p[0], k.apex[0], h), lerp(p[1], k.apex[1], h), lerp(p[2], k.apex[2], h)];
  const p = ridge(k.ring[i]!), q = ridge(k.ring[(i + 1) % n]!);
  return [lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t) + 0.4];
}
/** Draws a peak: its silhouette, dim ridges on the side that faces us, and a snow cap. */
function drawPeak(scene: Scene, k: Peak, tone: Tone, cap = 0.72): void {
  const sx = (p: Vec3) => p[0] - p[1], sy = (p: Vec3) => (p[0] + p[1]) / 2 - p[2];
  const pts = [...k.ring, k.apex].sort((p, q) => sx(p) - sx(q) || sy(p) - sy(q));
  const cross = (o: Vec3, a: Vec3, b: Vec3) => (sx(a) - sx(o)) * (sy(b) - sy(o)) - (sy(a) - sy(o)) * (sx(b) - sx(o));
  const lo: Vec3[] = [], hi: Vec3[] = [];
  for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2]!, lo[lo.length - 1]!, p) <= 0) lo.pop(); lo.push(p); }
  for (const p of [...pts].reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2]!, hi[hi.length - 1]!, p) <= 0) hi.pop(); hi.push(p); }
  scene.panel([...lo.slice(0, -1), ...hi.slice(0, -1)], tone);
  if (tone === "ghost") return;
  const n = k.ring.length, ridge: Tone = tone === "base" ? "faint" : tone;
  // A ridge shows when one of the faces beside it looks toward the viewer.
  const faces = k.ring.map((a, i) => {
    const b = k.ring[(i + 1) % n]!, u = [b[0] - a[0], b[1] - a[1], 0], v = [k.apex[0] - a[0], k.apex[1] - a[1], k.apex[2] - a[2]];
    const nx = u[1]! * v[2]! - u[2]! * v[1]!, ny = u[2]! * v[0]! - u[0]! * v[2]!, nz = u[0]! * v[1]! - u[1]! * v[0]!;
    return nx + ny + nz > 0;
  });
  for (let i = 0; i < n; i++) if (faces[i] && faces[(i + n - 1) % n]) scene.line(k.ring[i]!, k.apex, ridge);
  // The snow cap: a zigzag line across the faces we see.
  const snow: Vec3[] = [], s = faces.findIndex((v, i) => !v && faces[(i + 1) % n]);
  const at = (i: number, h: number): Vec3 => onPeak(k, h, k.turn + (i / n) * Math.PI * 2);
  for (let j = s + 1; j < s + 1 + n && faces[j % n]; j++) snow.push(at(j, cap + 0.03), at(j + 0.5, cap - 0.07));
  snow.push(at(s + 1 + faces.filter(Boolean).length, cap + 0.03));
  if (snow.length > 1) scene.panel([...snow, k.apex], tone);
}

const MAIN = makePeak(10, 6, 66, 100, [1, 0.86, 1.08, 0.9, 1.02, 1.1, 0.84, 1, 1.1, 0.88], 0.2);
const BACK = makePeak(-52, -44, 40, 66, [1, 0.9, 1.08, 0.95, 1, 0.92, 1.05]);
/** The trail: switchbacks across the face that looks at us, from the foot (t = 0) to the summit (t = 1). */
const trail = (t: number): Vec3 => onPeak(MAIN, t * 0.95, Math.PI / 4 + 0.95 * (1 - 0.55 * t) * Math.sin(t * Math.PI * 3.5 - 0.6));

/** A climber on a mountain trail to a summit flag. Use for milestones, goals and launches. */
export const milestone = defineFigure({
  name: "Milestone",
  label: "A walker climbing a winding trail up a mountain to plant a flag at the summit",
  offset: 4,
  setup: ({ spring }) => ({ runner: spring(0, 120, 16), flag: spring(0, 110, 14), slide: spring(0, 100, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const p = state === "loading" ? ctx.progress(3) : state === "success" ? 1 : state === "error" ? 0.36 : state === "empty" ? 0 : 0.3 + ctx.hover * 0.05;
    const P = clamp(m.runner.to(p).value);
    const F = clamp(m.flag.to(state === "success" ? 1 : 0).value, 0, 1.2), Sl = clamp(m.slide.to(state === "error" ? 1 : 0).value);
    const walker: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();

    scene.box(0, 0, 0, 160, 140, 4, "base");
    drawPeak(scene, BACK, empty ? "ghost" : "base", 0.62);
    drawPeak(scene, MAIN, empty ? "ghost" : "base");
    if (empty) {
      scene.polyline(Array.from({ length: 41 }, (_, i) => trail(i / 40)), "ghost");
      return;
    }

    // The trail: the part walked in the walker's tone, the rest faint. On error a rockslide cuts it.
    const N = 60, cut = [0.5, 0.6];
    const walked: Vec3[] = [], ahead: Vec3[][] = [[]];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      if (state === "error" && t > cut[0]! && t < cut[1]!) { if (ahead[ahead.length - 1]!.length) ahead.push([]); continue; }
      if (t <= P) walked.push(trail(t));
      if (t >= P - 1 / N) ahead[ahead.length - 1]!.push(trail(t));
    }
    for (const seg of ahead) if (seg.length > 1) scene.polyline(seg, "muted", { bold: true });
    if (walked.length > 1) scene.polyline(walked, state === "idle" ? "base" : walker, { bold: true });
    if (state === "error") {
      // Rocks tumbling down across the trail where it broke.
      const f = ctx.fade(0.6);
      [[0.53, 0.9, 7], [0.57, 0.75, 5], [0.52, 0.62, 6], [0.58, 0.48, 4]].forEach(([t, h, s], k) => {
        const q = onPeak(MAIN, lerp(t! * 0.95, h! * t! * 0.95, f), Math.PI / 4 + 0.4 - k * 0.25);
        scene.box(q[0], q[1], q[2] - 1, s! * 1.5, s! * 1.5, s! * 1.1, "err");
      });
    }

    // The summit: a cairn, and on success the flag planted on top.
    const top = MAIN.apex;
    scene.box(top[0], top[1], top[2] - 3, 6, 6, 4, "base");
    if (F > 0.02) {
      const h = 30 * F, flag: Tone = state === "success" ? "ok" : "base";
      scene.cylinder(top[0], top[1], top[2] + 1, 1.3, h, flag);
      const wave = (k: number) => Math.sin(k * 1.4) * 2;
      const pennant: Vec3[] = [0, 1, 2, 3].map(k => facing(top[0], top[1], top[2] + h - 1 + wave(k), k * 6 * F, 0))
        .concat([3, 2, 1, 0].map(k => facing(top[0], top[1], top[2] + h - 13 * F + wave(k), k * 6 * F, 0)));
      scene.panel(pennant, flag);
    }

    // The walker on the trail; on error knocked back down it.
    const q = trail(clamp(P - 0.08 * Sl));
    person(scene, q[0] + shake * 0.5, q[1], q[2], walker, undefined, 0.8);
  },
});
