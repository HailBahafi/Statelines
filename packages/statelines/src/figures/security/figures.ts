import { defineFigure } from "../../core/define";
import { bump, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { facing, frontArc } from "../shapes";

type P2 = [number, number];

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

const ring2 = (cx: number, cy: number, r: number, steps = 16): P2[] =>
  Array.from({ length: steps + 1 }, (_, i) => [cx + r * Math.cos((i / steps) * Math.PI * 2), cy + r * Math.sin((i / steps) * Math.PI * 2)]);

/** A key's profile: `s` runs from the tip to the end of the bow, `w` across the blade, teeth on the w < 0 side. */
const KEY: P2[] = (() => {
  const pts: P2[] = [[0, 0], [2, 2.5], [32, 2.5], [32, 4.5], [35, 4.5]];
  const a0 = Math.PI - Math.asin(0.45);
  for (let i = 1; i < 20; i++) {
    const a = a0 - (i / 20) * 2 * a0;
    pts.push([44 + 10 * Math.cos(a), 10 * Math.sin(a)]);
  }
  pts.push([35, -4.5], [32, -4.5], [32, -2.5], [28, -2.5], [26.5, -7], [24, -7], [22, -4.5], [19.5, -7], [17, -7],
    [15, -3.5], [12, -6.5], [10, -6.5], [8, -2.5], [2, -2.5]);
  return pts;
})();

/** Draws a key whose profile point (s, w), lifted n off its plane, lands at `at(s, w, n)`. Only s ≥ from shows. */
function drawKey(scene: Scene, at: (s: number, w: number, n: number) => Vec3, tone: Tone, from = -1, opacity?: number): void {
  const shape = clip(KEY, p => p[0] - from);
  if (shape.length < 3) return;
  scene.panel(shape.map(([s, w]) => at(s, w, -1.6)), tone, opacity);
  scene.panel(shape.map(([s, w]) => at(s, w, 0)), tone, opacity);
  if (from < 42) scene.polyline(ring2(46.5, 0, 3, 10).map(([s, w]) => at(s, w, 0.05)), tone, { opacity });
  if (from < 26) scene.line(at(Math.max(from, 4), 0.4, 0.05), at(29, 0.4, 0.05), "faint", { opacity });
}

/** A padlock that opens. Use for locked content, access control and secure areas. */
export const lock = /*#__PURE__*/ defineFigure({
  name: "Lock",
  label: "A padlock springing open",
  offset: 14,
  setup: ({ spring }) => ({ lift: spring(0, 170, 16), swing: spring(0, 90, 14), turn: spring(0, 160, 16), snap: spring(0, 110, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    let lift = state === "idle" ? ctx.hover * 4 : 0, swing = 0, turn = 0;
    if (state === "loading") {
      const q = ctx.loop(1.8);
      turn = smoothstep(q / 0.45) * (1 - smoothstep((q - 0.7) / 0.3));
      lift = 3 * turn;
      m.turn.set(turn); m.lift.set(lift);
    }
    if (state === "success") { lift = 12; swing = 1; turn = 1; }
    if (state === "error") turn = 0.25;
    const L = m.lift.to(lift).value, A = -m.swing.to(swing).value * 1.05, T = m.turn.to(turn).value;
    const B = m.snap.to(state === "error" ? 1 : 0).value;
    const body: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();

    // The body is wide along y; its keyhole face looks to the lower right.
    const X = shake, W = 24, D = 62, H = 46, top = 4 + H, face = X + W / 2 + 0.05, kz = 4 + H * 0.42;
    scene.box(0, 0, 0, 96, 106, 4, "base");
    scene.box(X, 0, 4, W, D, H, body);

    // The shackle: a thick U, the pivot leg at y = -R stays in, the free leg lifts out and swings toward us.
    const R = 18, r0 = 4.2, zA = top + 14 + L;
    const band = (xo: number): Vec3[] => {
      const pts: P2[] = [[-R - r0, top]];
      for (let i = 0; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI; pts.push([(R + r0) * Math.cos(a), zA + (R + r0) * Math.sin(a)]); }
      pts.push([R + r0, top + L], [R - r0, top + L]);
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; pts.push([(R - r0) * Math.cos(a), zA + (R - r0) * Math.sin(a)]); }
      pts.push([-R + r0, top]);
      return pts.map(([y, z]) => {
        const dy = y + R;
        return [X + xo * Math.cos(A) + dy * Math.sin(A), -R - xo * Math.sin(A) + dy * Math.cos(A), z] as Vec3;
      });
    };
    if (empty) {
      scene.polyline(band(0), "ghost", { closed: true });
      return;
    }
    scene.disc(X, -R, top + 0.05, r0 + 1, "muted");
    scene.disc(X, R, top + 0.05, r0 + 1, "muted");
    const shackle: Tone = state === "success" ? "ok" : "base";
    const back = band(-3.5), front = band(3.5);
    const depth = (pts: Vec3[]) => pts.reduce((sum, p) => sum + p[0] + p[1], 0);
    const [first, second] = depth(back) < depth(front) ? [back, front] : [front, back];
    scene.panel(first, shackle);
    scene.panel(second, shackle);

    // The face: laminated plates and a keyhole.
    for (let k = 1; k <= 5; k++) {
      const z = 4 + (H * k) / 6;
      if (Math.abs(z - kz) > 8) scene.line([face, -D / 2 + 2, z], [face, D / 2 - 2, z], "faint");
    }
    const hole: Vec3[] = [];
    for (let i = 0; i <= 16; i++) { const a = -Math.PI / 3 + (i / 16) * (5 * Math.PI / 3); hole.push([face, 4.5 * Math.cos(a), kz + 4.5 * Math.sin(a)]); }
    hole.push([face, -3, kz - 11], [face, 3, kz - 11]);
    scene.panel(hole, "muted");

    // The key turns in the keyhole; on error it snaps and its bow drops to the plate.
    const k = 0.62, inDepth = 10;
    if (state === "loading" || state === "success" || state === "error") {
      const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
      const th = Math.PI / 2 + T * Math.PI / 2;
      const inLock = (s: number, w: number, n: number): Vec3 => [
        face - inDepth + s * k, w * k * Math.cos(th) + n * Math.sin(th), kz + w * k * Math.sin(th) - n * Math.cos(th),
      ];
      const from = inDepth / k;
      if (state !== "error") drawKey(scene, inLock, tone, from);
      else {
        const brk = from + 5 / k, phi = 0.5;
        scene.box(face + 1.5, 0, kz - 1.5, 3, 2, 3, "err");
        const onPlate = (s: number, w: number, n: number): Vec3 => {
          const u = (s - brk) * k, v = w * k;
          return [face + 8 + u * Math.cos(phi) - v * Math.sin(phi), 20 + u * Math.sin(phi) + v * Math.cos(phi), 4.2 + 1.6 + n];
        };
        drawKey(scene, (s, w, n) => {
          const a = inLock(s, w, n), b = onPlate(s, w, n);
          return [lerp(a[0], b[0], B), lerp(a[1], b[1], B), lerp(a[2], b[2], B) + 10 * bump(B)];
        }, "err", brk);
      }
    }
  },
});

/** Half a heater shield, from the top centre down its right side to the tip; scaled by `k` about its middle. */
function shieldHalf(k: number): P2[] {
  const pts: P2[] = [[0, 40], [29, 40], [32.5, 38.5], [34, 35], [34, 6]];
  for (let i = 1; i <= 12; i++) {
    const t = i / 12;
    pts.push([(1 - t) * (1 - t) * 34 + 2 * t * (1 - t) * 34, (1 - t) * (1 - t) * 6 + 2 * t * (1 - t) * -26 + t * t * -46]);
  }
  return pts.map(([u, v]) => [u * k, -2 + (v + 2) * k]);
}

/** A shield whose layers light up, or that splits in two. Use for protection, security status and checks. */
export const shield = /*#__PURE__*/ defineFigure({
  name: "Shield",
  label: "A shield standing guard",
  offset: 30,
  setup: ({ spring }) => ({ lift: spring(0, 150, 16), split: spring(0, 120, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const L = m.lift.to(state === "idle" ? ctx.hover * 8 : state === "success" ? 12 : state === "loading" ? 4 : 0).value;
    const S = m.split.to(state === "error" ? 1 : 0).value;
    const CZ = 64 + L, Dp = 3.2;
    const face: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();

    scene.box(0, 0, 0, 92, 92, 4, "base");
    scene.box(0, 0, 4, 36, 24, 8, empty ? "ghost" : "base");
    if (!empty) scene.rect(-12, -3, 12, 3, 12.05, "muted");
    scene.cylinder(-3, -3, 12, 3, 52, empty ? "ghost" : "base");

    // side: -1 left half, 1 right half, 0 the whole outline.
    const outline = (k: number, side: number): P2[] => {
      const half = shieldHalf(k);
      if (side === 1) return half;
      const left = half.map(([u, v]) => [-u, v] as P2);
      if (side === -1) return left;
      return [...half, ...left.slice(0, -1).reverse()];
    };
    // On error the halves fall apart: each turns about the tip and drops.
    const place = (side: number) => (p: P2, d = 0): Vec3 => {
      const ang = side * 0.09 * S, tipV = -46;
      const u0 = p[0], v0 = p[1] - tipV;
      const u = u0 * Math.cos(ang) + v0 * Math.sin(ang) + side * 9 * S + shake;
      const v = -u0 * Math.sin(ang) + v0 * Math.cos(ang) + tipV - 9 * S;
      const [x, y, z] = facing(0, 0, CZ, u, v);
      return [x + d, y + d, z];
    };
    if (empty) {
      scene.polyline(outline(1, 0).map(p => place(0)(p)), "ghost", { closed: true });
      return;
    }
    const parts = S > 0.02 ? [-1, 1] : [0];
    for (const side of parts) {
      const at = place(side);
      const shape = outline(1, side);
      scene.panel(shape.map(p => at(p, -Dp)), face);
      scene.panel(shape.map(p => at(p, 0)), face);
      // Inner layers: a bevel, then two nested plates. They light up in turn while loading.
      [0.84, 0.6, 0.36].forEach((k, i) => {
        let tone: Tone = state === "success" ? "ok" : state === "error" ? "err" : i === 0 ? "muted" : "faint";
        let bold = false, opacity: number | undefined;
        if (state === "loading") {
          const q = ctx.loop(1.5);
          const lit = bump(q * 1.6 - i * 0.3);
          tone = "hi"; bold = lit > 0.5; opacity = 0.25 + 0.75 * lit;
        }
        scene.polyline(outline(k, side).map(p => at(p, 0.1)), tone, { closed: side !== 0 ? false : true, bold, opacity });
      });
    }
    // The boss at the centre, only while the shield is whole.
    if (S < 0.02) {
      const boss: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();
      scene.panel(ring2(0, 0, 6, 16).map(p => place(0)(p, 1.5)), boss);
      scene.polyline(ring2(0, 0, 2.5, 10).map(p => place(0)(p, 1.6)), boss);
    }
  },
});

/** A key turning in a lock, with the key's teeth drawn. Use for sign in, passwords and reset flows. */
export const key = /*#__PURE__*/ defineFigure({
  name: "Key",
  label: "A key turning in a lock",
  offset: 26,
  setup: ({ spring }) => ({ ins: spring(0, 150, 18), turn: spring(0, 150, 16), bolt: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    let ins = state === "idle" ? ctx.hover * 0.15 : 0, turn = 0;
    if (state === "loading") {
      const q = ctx.loop(2.6);
      ins = smoothstep(q / 0.3) * (1 - smoothstep((q - 0.86) / 0.14));
      turn = smoothstep((q - 0.36) / 0.22) * (1 - smoothstep((q - 0.68) / 0.14));
      m.ins.set(ins); m.turn.set(turn);
    }
    if (state === "success") { ins = 1; turn = 1; }
    if (state === "error") { ins = 0.42; turn = 0.12; }
    const I = m.ins.to(ins).value, T = m.turn.to(turn).value, Bo = m.bolt.to(state === "success" ? 1 : 0).value;
    const door: Tone = empty ? "ghost" : "base";

    // A door seen edge-on to the right: its face looks to the lower left, the jamb stands at its x+ edge.
    const DY = -22, face = DY + 6, xk = 16, kz = 38;
    scene.box(0, 0, 0, 104, 104, 4, "base");
    scene.box(-6, DY, 4, 68, 12, 80, door);
    if (!empty) {
      // Raised panels.
      for (const [z0, z1] of [[12, 32], [46, 76]] as const) {
        scene.polyline([[-34, face + 0.05, z0], [2, face + 0.05, z0], [2, face + 0.05, z1], [-34, face + 0.05, z1]], "faint", { closed: true });
      }
    }
    // The bolt crosses the gap into the jamb once the key has turned.
    if (Bo > 0.03) scene.box(28 + 5 * Bo, DY, kz - 3, 10 * Bo, 6, 6, "ok");
    scene.box(42, DY, 4, 8, 16, 84, door);
    if (empty) {
      drawKey(scene, (s, w, n) => [xk + n, face + 9 + s, kz + w], "ghost");
      return;
    }

    // The lever handle above the keyhole.
    for (let k = 0; k < 2; k++) scene.panel(frontArc(xk, face + 0.05 + k * 1.6, 58, 6 - k * 1.2, 0, Math.PI * 2, 20), "base");
    scene.box(xk, face + 4.5, 56, 4, 6, 4, "base");
    scene.box(xk - 11, face + 8, 56, 26, 4, 4, "base");
    // The escutcheon and its keyhole.
    for (let k = 0; k < 2; k++) scene.panel(frontArc(xk, face + 0.05 + k * 1.5, kz, 8 - k * 1.5, 0, Math.PI * 2, 24), "base");
    const kf = face + 1.6;
    scene.panel([...frontArc(xk, kf, kz + 2, 2.4, -Math.PI / 3, (4 * Math.PI) / 3, 10), [xk - 1.6, kf, kz - 4.5], [xk + 1.6, kf, kz - 4.5]], "muted");

    // The key: along +y, blade upright at first, turning a quarter about its own axis.
    const tone: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();
    const th = Math.PI / 2 + T * Math.PI / 2, tipY = kf + 8 - I * 40;
    const at = (s: number, w: number, n: number): Vec3 => [
      xk + shake + w * Math.cos(th) + n * Math.sin(th), tipY + s, kz + w * Math.sin(th) - n * Math.cos(th),
    ];
    drawKey(scene, at, tone, kf - tipY);
  },
});

/** A safe with a dial spinning. Use for vaults, secure storage and encrypted data. */
export const vault = /*#__PURE__*/ defineFigure({
  name: "Vault",
  label: "A safe door with a spinning dial",
  offset: 14,
  setup: ({ spring }) => ({ dial: spring(0, 90, 14), door: spring(0, 60, 13), wheel: spring(0, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const D = state === "loading" ? ctx.time * 2.4 : m.dial.to(state === "idle" ? ctx.pointer.x * 0.02 : 0).value;
    const open = m.door.to(state === "success" ? 1 : state === "error" ? 0.1 : 0).value;
    const Wh = m.wheel.to(state === "success" ? 1 : state === "idle" ? ctx.hover * 0.4 : 0).value;
    const tone: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();

    // The safe stands on four feet; its door is on the x+ face and swings toward us about the y+ edge.
    const cx = -18 + shake, W = 56, Dd = 72, H = 70, X = cx + W / 2, z0 = 8;
    scene.box(8, 0, 0, 140, 104, 4, "base");
    for (const [fx, fy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) scene.box(cx + fx * 22, fy * 29, 4, 7, 7, 4, empty ? "ghost" : "base");
    scene.box(cx, 0, z0, W, Dd, H, empty ? "ghost" : "base");

    // The door hinges on its y- edge and swings out to the right, showing its bolt work.
    const a = open * 1.62, HY = -30, DW = 60, zb = 14, zt = 72, t = 5;
    const dir: Vec3 = [Math.sin(a), Math.cos(a), 0], nrm: Vec3 = [Math.cos(a), -Math.sin(a), 0];
    const P = (s: number, z: number, n: number): Vec3 => [X + s * dir[0] + n * nrm[0], HY + s * dir[1] + n * nrm[1], z];
    const quad = (pts: Vec3[], tn: Tone) => scene.panel(pts, tn);

    if (empty) {
      scene.polyline([P(0, zb, 0.05), P(DW, zb, 0.05), P(DW, zt, 0.05), P(0, zt, 0.05)], "ghost", { closed: true });
      return;
    }
    // The opening and what it holds: a shelf and a stack of bars.
    if (a > 0.03) {
      scene.panel([[X + 0.05, -HY, zb], [X + 0.05, HY, zb], [X + 0.05, HY, zt], [X + 0.05, -HY, zt]], "base");
      scene.line([X + 0.06, -HY, zb + 30], [X + 0.06, HY, zb + 30], "muted");
      scene.line([X + 0.06, -HY, zb + 28], [X + 0.06, HY, zb + 28], "faint");
      if (state === "success") {
        for (const [y, z] of [[-6, zb], [8, zb], [1, zb + 5]] as const) scene.box(X - 5, y, z, 8, 13, 5, "ok");
        scene.box(X - 5, -10, zb + 30, 8, 20, 9, "muted");
      }
    }
    // The door slab: only the faces that look toward us.
    quad([P(0, zt, 0), P(DW, zt, 0), P(DW, zt, t), P(0, zt, t)], tone);
    quad([P(DW, zb, 0), P(DW, zt, 0), P(DW, zt, t), P(DW, zb, t)], tone);
    const circ = (s0: number, zc: number, r: number, n: number, steps = 24): Vec3[] =>
      Array.from({ length: steps + 1 }, (_, i) => P(s0 + r * Math.cos((i / steps) * Math.PI * 2), zc + r * Math.sin((i / steps) * Math.PI * 2), n));
    if (Math.sin(a) > Math.cos(a)) {
      // Swung open: the inside of the door, its bolt cover and the bolts standing out of the free edge.
      quad([P(0, zb, 0), P(DW, zb, 0), P(DW, zt, 0), P(0, zt, 0)], tone);
      scene.polyline([P(8, zb + 8, -0.05), P(DW - 6, zb + 8, -0.05), P(DW - 6, zt - 8, -0.05), P(8, zt - 8, -0.05)], "muted", { closed: true });
      scene.line(P(DW - 14, zb + 8, -0.05), P(DW - 14, zt - 8, -0.05), "faint");
      for (const z of [zb + 12, (zb + zt) / 2, zt - 12]) {
        scene.line(P(DW - 14, z, -1.6), P(DW + 6, z, -1.6), tone, { bold: true });
        scene.panel(Array.from({ length: 9 }, (_, i) => { const g = (i / 8) * Math.PI * 2; return P(DW + 6, z + 1.8 * Math.cos(g), -1.6 + 1.8 * Math.sin(g)); }), tone);
      }
    } else {
      quad([P(0, zb, t), P(DW, zb, t), P(DW, zt, t), P(0, zt, t)], tone);
      scene.polyline([P(4, zb + 4, t + 0.05), P(DW - 4, zb + 4, t + 0.05), P(DW - 4, zt - 4, t + 0.05), P(4, zt - 4, t + 0.05)], "faint", { closed: true });
      // The combination dial: stepped rings, a ring of graduations and a pointer.
      const ds = 22, dz = 46, accent: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : tone;
      scene.panel(circ(ds, dz, 12, t + 0.1), "base");
      scene.panel(circ(ds, dz, 9.5, t + 1.8), accent);
      for (let k = 0; k < 12; k++) {
        const g = (k / 12) * Math.PI * 2;
        scene.line(P(ds + 10.5 * Math.cos(g), dz + 10.5 * Math.sin(g), t + 0.2), P(ds + 11.8 * Math.cos(g), dz + 11.8 * Math.sin(g), t + 0.2), "muted");
      }
      scene.line(P(ds, dz, t + 1.9), P(ds + 8 * Math.cos(D), dz + 8 * Math.sin(D), t + 1.9), accent, { bold: true });
      scene.panel(circ(ds, dz, 2.6, t + 3, 12), accent);
      // The handle wheel: three spokes with knobs, near the free edge.
      const hs = 45, hz = 46;
      for (let k = 0; k < 3; k++) {
        const g = Math.PI / 2 + Wh * 1.2 + (k * 2 * Math.PI) / 3;
        const end: [number, number] = [hs + 10 * Math.cos(g), hz + 10 * Math.sin(g)];
        scene.line(P(hs, hz, t + 3), P(end[0], end[1], t + 3), tone === "base" ? "muted" : tone, { bold: true });
        scene.panel(circ(end[0], end[1], 2, t + 3.1, 10), tone);
      }
      scene.panel(circ(hs, hz, 3.6, t + 3.2, 14), tone);
    }
    // Hinges on the y- edge.
    for (const z of [zb + 8, zt - 14]) scene.cylinder(X + 1.5, HY - 2.5, z, 2.2, 7, "base");
  },
});

/** A fingerprint being read on a reader's glass. Use for biometric sign in and device trust. */
export const fingerprint = /*#__PURE__*/ defineFigure({
  name: "Fingerprint",
  label: "A fingerprint being scanned",
  offset: 34,
  setup: ({ spring }) => ({ shown: spring(0.5, 120, 18), scan: spring(18, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const face = 7.05, cz = 46, low = 18, high = 76;
    // How far up the glass the ridges are lit, 0…1.
    let lit = 0.45 + ctx.hover * 0.55, scan = low;
    if (state === "loading") {
      const p = ctx.loop(2.2);
      scan = low + (high - low) * (1 - Math.abs(2 * p - 1));
      lit = (scan - low) / (high - low);
      m.scan.set(scan); m.shown.set(lit);
    }
    if (state === "success" || state === "error") lit = 1;
    if (state === "empty") lit = 0;
    const L = m.shown.to(lit).value;
    const reader: Tone = state === "empty" ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const ridge: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "base";

    scene.box(0, 0, 0, 112, 84, 4, "base");
    scene.box(shake, 0, 4, 66, 14, 82, reader);
    scene.box(shake, 0, 86, 14, 6, 3, state === "success" ? "ok" : state === "error" ? "err" : "muted");
    const at = (u: number, z: number): Vec3 => [shake + u, face, z];
    scene.polyline([at(-26, 14), at(26, 14), at(26, 80), at(-26, 80)], "faint", { closed: true });
    if (state === "empty") {
      scene.polyline(Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return at(16 * Math.cos(a), cz + 22 * Math.sin(a));
      }), "ghost");
      return;
    }

    // Nested arches, open at the bottom, like the whorl of a fingertip.
    for (let k = 1; k <= 6; k++) {
      const rx = 3 + 3.3 * k, rz = 3.5 + 4 * k;
      const pts = Array.from({ length: 29 }, (_, i) => {
        const a = -0.18 * Math.PI + (i / 28) * 1.36 * Math.PI;
        return at(rx * Math.cos(a), cz + rz * Math.sin(a));
      });
      // On error the print is smudged: every other ridge breaks in the middle.
      const parts = state === "error" && k % 2 === 0 ? [pts.slice(0, 11), pts.slice(18)] : [pts];
      const on = (cz - rz - low) / (high - low) < L;
      for (const part of parts) scene.polyline(part, on ? ridge : "faint");
    }
    if (state === "loading") scene.line(at(-26, m.scan.value), at(26, m.scan.value), "hi", { bold: true });
  },
});

/** A brick firewall with packets bouncing off. Use for network protection, blocked traffic and firewall rules. */
export const firewall = /*#__PURE__*/ defineFigure({
  name: "Firewall",
  label: "A wall stopping packets",
  offset: 16,
  setup: ({ spring }) => ({ back: spring(0, 110, 16), fall: spring(0, 120, 14), near: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const Bk = m.back.to(state === "success" ? 1 : 0).value, F = m.fall.to(state === "error" ? 1 : 0).value;
    const N = m.near.to(state === "idle" ? ctx.hover : 0).value;
    const wall: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const WX = -8, WT = 10, BH = 10, face = WX + WT / 2;

    scene.box(0, 0, 0, 128, 112, 4, "base");
    // The network it guards: a server behind the wall, its top showing above.
    const server: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    scene.box(-42, 0, 4, 18, 46, 54, server);
    if (!empty) {
      for (const z of [44, 50]) scene.line([-32.95, -17, z], [-32.95, 13, z], "muted");
      scene.disc(-38, -16, 58.05, 1.6, "muted", { fill: true });
    }
    if (empty) {
      scene.box(WX, 0, 4, WT, 90, BH * 3, "ghost");
      return;
    }

    // Courses of bricks, staggered. On error two bricks are knocked out and lie on the plate.
    type Item = { depth: number; draw: () => void };
    const wallItems: Item[] = [];
    const lost: Record<string, [number, number]> = { "2:0": [16, 8], "1:9": [26, -12] };
    for (let r = 0; r < 3; r++) {
      const cells: [number, number][] = r % 2 === 0
        ? [-36, -18, 0, 18, 36].map(y => [y, 18])
        : [[-40.5, 9], [-27, 18], [-9, 18], [9, 18], [27, 18], [40.5, 9]];
      for (const [y, d] of cells) {
        const z = 4 + r * BH, gone = lost[`${r}:${y}`];
        if (gone && F > 0.01) continue;
        wallItems.push({ depth: r * 1000 + y, draw: () => scene.box(WX, y, z, WT, d, BH, wall) });
      }
    }
    // The breaching packet sits in the gap.
    if (F > 0.01) wallItems.push({ depth: 1000 + 9.5, draw: () => scene.box(lerp(face + 14, WX, F), 9, 14, 8, 8, 8, "err") });
    wallItems.sort((p, q) => p.depth - q.depth).forEach(i => i.draw());

    // Packets on three lanes in front of the wall.
    const front: Item[] = [];
    const lanes = [-28, -4, 24];
    const rest = [30, 18, 40], away = [52, 58, 50];
    lanes.forEach((y, k) => {
      let x = lerp(rest[k]! - N * 5, away[k]!, Bk), z = 4, opacity = 1, tone: Tone = state === "success" ? "muted" : "base";
      if (state === "loading") {
        const q = (ctx.loop(1.9) + k / 3) % 1;
        tone = "hi";
        if (q < 0.6) x = lerp(58, face + 5, smoothstep(q / 0.6));
        else { const b = (q - 0.6) / 0.4; x = lerp(face + 5, face + 26, b); z = 4 + 12 * bump(b); }
        opacity = smoothstep(q / 0.1) * (1 - smoothstep((q - 0.82) / 0.18));
      }
      if (state === "error" && k === 1) return;
      front.push({ depth: x + y, draw: () => scene.box(x, y + (k === 1 ? 0 : 0), z, 8, 8, 8, tone, opacity) });
    });
    // The knocked-out bricks fall forward onto the plate.
    if (F > 0.01) {
      for (const [keyName, [tx, ty]] of Object.entries(lost)) {
        const [r, y] = keyName.split(":").map(Number) as [number, number];
        const x0 = WX, z0 = 4 + r * BH;
        const x = lerp(x0, tx, F), yy = lerp(y, ty, F), z = lerp(z0, 4, F) + 8 * bump(F);
        front.push({ depth: x + yy, draw: () => scene.box(x + shake, yy, z, WT, 18, BH * 0.8, "err") });
      }
    }
    front.sort((p, q) => p.depth - q.depth).forEach(i => i.draw());
  },
});

/** A breach alert: a radar sweep finds a threat. Use for security alerts, monitoring and incidents. */
export const radar = /*#__PURE__*/ defineFigure({
  name: "Radar",
  label: "A radar sweep finding a threat",
  offset: 30,
  setup: ({ spring }) => ({ sweep: spring(1.1, 90, 16), threat: spring(0, 160, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    // The scope faces the viewer on a stand; (u, v) are screen units across and up its face.
    const CZ = 70, R = 48;
    const at = (u: number, v: number): Vec3 => facing(shake, 0, CZ, u, v);
    const ring = (r: number, steps = 40): Vec3[] => Array.from({ length: steps + 1 }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      return at(r * Math.cos(a), r * Math.sin(a));
    });
    const BLIPS = [{ u: 22, v: 17 }, { u: -27, v: 10 }, { u: 8, v: -31 }, { u: -14, v: -16 }];
    const threatAngle = Math.atan2(BLIPS[0]!.v, BLIPS[0]!.u);

    // Where the beam points. It turns clockwise while loading; at rest it leans toward the pointer.
    let sweep = 1.1;
    if (state === "idle") {
      const cy = -CZ + 30;
      sweep = 1.1 + ctx.hover * 0.6 * Math.atan2(-(ctx.pointer.y - cy), ctx.pointer.x) / Math.PI;
    }
    if (state === "loading") { sweep = Math.PI / 2 - ctx.loop(2.4) * Math.PI * 2; m.sweep.set(sweep); }
    if (state === "error") sweep = threatAngle;
    const S = m.sweep.to(sweep).value, T = m.threat.to(state === "error" ? 1 : 0).value;
    const screen: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "muted";
    const beam: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "base";

    scene.box(0, 0, 0, 104, 84, 4, "base");
    scene.box(shake, 0, 4, 46, 38, 8, empty ? "ghost" : "base");
    scene.box(shake, 0, 12, 8, 8, 14, empty ? "ghost" : "base");
    // The bezel and its screen.
    scene.panel(ring(R + 6), empty ? "ghost" : "base");
    scene.polyline(ring(R), screen);
    if (empty) return;
    scene.polyline(ring(R * 0.66), "faint");
    scene.polyline(ring(R * 0.33), "faint");
    scene.line(at(-R, 0), at(R, 0), "faint");
    scene.line(at(0, -R), at(0, R), "faint");

    // The afterglow: fading spokes trailing the beam.
    if (state !== "success") {
      for (let k = 14; k >= 1; k--) {
        const a = S + k * 0.06;
        scene.line(at(0, 0), at(R * Math.cos(a), R * Math.sin(a)), beam, { opacity: 0.6 * (1 - k / 15) });
      }
    }
    scene.line(at(0, 0), at(R * Math.cos(S), R * Math.sin(S)), beam, { bold: true });

    // Contacts glow as the beam passes them and fade behind it. A cleared screen shows none.
    if (state !== "success") {
      BLIPS.forEach((b, i) => {
        const threat = state === "error" && i === 0;
        let o = 0.35;
        if (state === "loading") {
          const behind = ((S - Math.atan2(b.v, b.u)) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
          o = Math.max(0.12, 1 - (Math.PI * 2 - behind) / 3);
        }
        if (state === "error") o = threat ? 1 : 0.2;
        const tone: Tone = threat ? "err" : state === "loading" ? "hi" : "muted";
        const dot = Array.from({ length: 13 }, (_, k) => at(b.u + 2.6 * Math.cos((k / 12) * Math.PI * 2), b.v + 2.6 * Math.sin((k / 12) * Math.PI * 2)));
        scene.panel(dot, tone, o);
        if (threat && T > 0.05) {
          const halo = Array.from({ length: 25 }, (_, k) => at(b.u + 7 * T * Math.cos((k / 24) * Math.PI * 2), b.v + 7 * T * Math.sin((k / 24) * Math.PI * 2)));
          scene.polyline(halo, "err", { opacity: T });
        }
      });
    }
    scene.panel(Array.from({ length: 13 }, (_, k) => at(2 * Math.cos((k / 12) * Math.PI * 2), 2 * Math.sin((k / 12) * Math.PI * 2))), beam);
  },
});

/** A pen, from its tip along +l, half-width along w. */
const PEN: P2[] = [[0, 0], [5, -1.9], [33, -1.9], [36, -1.2], [36, 1.2], [33, 1.9], [5, 1.9]];

/** A checklist on a clipboard, its security steps completed one by one. Use for onboarding security, audits and compliance. `count`: items, 2–5. */
export const compliance = /*#__PURE__*/ defineFigure({
  name: "Compliance",
  label: "A clipboard checklist being filled in",
  offset: 22,
  setup: ({ spring }) => ({
    tick: Array.from({ length: 5 }, () => spring(0, 180, 16)), pen: spring(0, 130, 16), row: spring(0, 150, 16), seal: spring(0, 140, 14),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const n = ctx.count(4, 5, 2);
    const done = state === "success" ? n : state === "loading" ? Math.round(ctx.progress(n + 1) * n) : state === "error" ? n - 1 : 0;
    const up = m.pen.to(state === "loading" || state === "error" ? 1 : 0).value;
    const row = m.row.to(Math.min(n - 1, state === "error" ? n - 1 : done)).value;
    const seal = m.seal.to(state === "success" ? 1 : 0).value;

    // The board leans back on a ledge, its face toward the lower left.
    const tilt = 0.3 - ctx.hover * 0.06, st = Math.sin(tilt), ct = Math.cos(tilt);
    const B = (a: number, b: number, nn = 0): Vec3 => [a + (nn > 1 ? shake : 0), 16 - b * st + nn * ct, 10 + b * ct + nn * st];
    const board: Tone = empty ? "ghost" : "base";
    scene.box(0, 0, 0, 104, 96, 4, "base");
    scene.line(B(0, 58, -2.6), [0, -32, 4], empty ? "ghost" : "muted", { bold: true });
    scene.box(0, 19, 4, 78, 12, 6, empty ? "ghost" : "base");
    const corner = (w: number, h: number, b0: number, c: number): P2[] =>
      [[-w + c, b0], [w - c, b0], [w, b0 + c], [w, b0 + h - c], [w - c, b0 + h], [-w + c, b0 + h], [-w, b0 + h - c], [-w, b0 + c]];
    const outline = corner(34, 84, 0, 4);
    if (empty) {
      scene.polyline(outline.map(([a, b]) => B(a, b)), "ghost", { closed: true });
      return;
    }
    scene.panel(outline.map(([a, b]) => B(a, b, -2.6)), board);
    scene.panel(outline.map(([a, b]) => B(a, b)), board);
    scene.panel(corner(29, 70, 5, 0).map(([a, b]) => B(a, b, 0.3)), "base");

    // The clip at the top: a plate and a wire loop.
    const clipTone: Tone = state === "success" ? "ok" : "base";
    scene.polyline(Array.from({ length: 13 }, (_, i) => { const g = (i / 12) * Math.PI; return B(7 * Math.cos(g), 80 + 6 * Math.sin(g), 1.6); }), "muted", { bold: true });
    scene.panel(corner(14, 9, 72, 2).map(([a, b]) => B(a, b, 1.8)), clipTone);
    scene.line(B(-10, 76.5, 1.85), B(10, 76.5, 1.85), "faint");

    // The rows: a box and a line each. A done box is drawn bold and filled in.
    const sp = 11.5, rowB = (k: number) => 41 + ((n - 1) / 2 - k) * sp;
    for (let k = 0; k < n; k++) {
      const b = rowB(k), T = m.tick[k]!.to(k < done ? 1 : 0).value, failed = state === "error" && k === n - 1;
      const tone: Tone = failed ? "err" : T > 0.5 ? (state === "success" ? "ok" : state === "loading" ? "hi" : "base") : "muted";
      const box = (r: number): Vec3[] => [B(-22 - r, b - r, 0.4), B(-22 + r, b - r, 0.4), B(-22 + r, b + r, 0.4), B(-22 - r, b + r, 0.4)];
      scene.polyline(box(3.8), tone, { closed: true, bold: T > 0.5 || failed });
      if (T > 0.5) { scene.polyline(box(2.2), tone, { closed: true }); scene.polyline(box(0.9), tone, { closed: true, bold: true }); }
      scene.line(B(-13, b + 1.2, 0.4), B(16 + (k % 2) * 6, b + 1.2, 0.4), failed ? "err" : T > 0.5 ? "base" : "faint");
      scene.line(B(-13, b - 2, 0.4), B(2 + (k % 3) * 4, b - 2, 0.4), failed ? "err" : "faint");
      // The failed step is flagged with a tab sticking out past the board's edge.
      if (failed) scene.panel([B(26, b - 3.5, 0.6), B(40 * ctx.fade(0.4) + 26 * (1 - ctx.fade(0.4)), b - 3.5, 0.6), B(40 * ctx.fade(0.4) + 26 * (1 - ctx.fade(0.4)), b + 3.5, 0.6), B(26, b + 3.5, 0.6)], "err");
    }
    // Signed off: a round seal pressed onto the foot of the sheet.
    if (seal > 0.02) {
      const sb = 11, sa = 17;
      [6.5, 4.5].forEach((r, i) => scene.polyline(Array.from({ length: 21 }, (_, j) => {
        const g = (j / 20) * Math.PI * 2;
        return B(sa + r * seal * Math.cos(g), sb + r * seal * Math.sin(g), 0.45);
      }), "ok", { bold: i === 0 }));
    }

    // The pen writes on the sheet, and lies on the plate when not in use.
    const penTone: Tone = state === "loading" ? "hi" : state === "error" ? "muted" : state === "success" ? "ok" : "base";
    if (up < 0.98) {
      const phi = -0.55;
      const flat = (l: number, w: number, z: number): Vec3 => [30 + l * Math.cos(phi) - w * Math.sin(phi), 32 + l * Math.sin(phi) + w * Math.cos(phi), z];
      scene.panel(PEN.map(([l, w]) => flat(l, w, 4.6)), penTone, 1 - up);
      scene.panel(PEN.map(([l, w]) => flat(l, w, 6.4)), penTone, 1 - up);
      scene.line(flat(24, -1.9, 6.45), flat(24, 1.9, 6.45), "muted", { opacity: 1 - up });
    }
    if (up > 0.02) {
      const rk = Math.max(0, Math.min(n - 1, row));
      const pb = rowB(0) + (rowB(n - 1) - rowB(0)) * (n > 1 ? rk / (n - 1) : 0), pa = -21, g = 0.9;
      const onSheet = (l: number, w: number, nn: number): Vec3 => B(pa + l * Math.cos(g) - w * Math.sin(g), pb + l * Math.sin(g) + w * Math.cos(g), nn);
      scene.panel(PEN.map(([l, w]) => onSheet(l, w, 2.2)), penTone, up);
      scene.panel(PEN.map(([l, w]) => onSheet(l, w, 3.6)), penTone, up);
      scene.line(onSheet(24, -1.9, 3.65), onSheet(24, 1.9, 3.65), "muted", { opacity: up });
    }
  },
});

/** A password field with its characters masked, and one revealed. Use for password entry, strength and masked input. */
export const password = /*#__PURE__*/ defineFigure({
  name: "Password",
  label: "A masked password field",
  offset: 22,
  setup: ({ spring }) => ({ lid: spring(0.22, 150, 16), done: spring(0, 130, 15) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const t = m.lid.to(state === "idle" ? 0.22 - ctx.hover * 0.1 : 0.22).value;
    const Dn = m.done.to(state === "success" ? 1 : 0).value;
    const st = Math.sin(t), ct = Math.cos(t);
    const shell: Tone = empty ? "ghost" : "base";

    // A laptop: the deck with its keyboard, the lid hinged at the back edge, its screen toward the lower right.
    scene.box(0, 0, 0, 104, 112, 4, "base");
    scene.box(8, 0, 4, 50, 86, 5, shell);
    const Ld = (a: number, b: number, nn = 0): Vec3 => [-17 - b * st + nn * ct, -a, 9 + b * ct + nn * st];
    const lid: Vec3[] = [Ld(-43, 0), Ld(43, 0), Ld(43, 62), Ld(-43, 62)];
    if (empty) {
      scene.polyline(lid, "ghost", { closed: true });
      return;
    }
    scene.rect(-13, -36, 8, 36, 9.05, "faint");
    for (const x of [-7.8, -2.6]) scene.line([x, -36, 9.05], [x, 36, 9.05], "faint");
    scene.rect(2.6, -15, 8, 15, 9.05, "faint");
    scene.rect(15, -11, 28, 11, 9.05, "muted");

    scene.panel([Ld(-43, 0, -2.6), Ld(43, 0, -2.6), Ld(43, 62, -2.6), Ld(-43, 62, -2.6)], shell);
    scene.panel(lid, shell);
    const S = (a: number, b: number): Vec3 => Ld(a, b, 0.3);
    const rect = (a0: number, b0: number, a1: number, b1: number): Vec3[] => [S(a0, b0), S(a1, b0), S(a1, b1), S(a0, b1)];
    const circle = (a: number, b: number, r: number, steps = 18): Vec3[] =>
      Array.from({ length: steps + 1 }, (_, i) => S(a + r * Math.cos((i / steps) * Math.PI * 2), b + r * Math.sin((i / steps) * Math.PI * 2)));
    scene.polyline(rect(-39, 5, 39, 57), "faint", { closed: true });
    scene.polyline(circle(0, 59.5, 0.9, 8), "muted");

    // The sign-in card: an avatar, the masked field with its eye toggle, and the button.
    const field: Tone = state === "loading" ? "hi" : state === "idle" ? "muted" : ctx.verdict();
    const av = 5 + Dn * 4, ab = 45 - Dn * 6;
    scene.polyline(circle(0, ab, av), state === "success" ? "ok" : "muted", { bold: Dn > 0.5 });
    if (Dn > 0.02) scene.polyline(Array.from({ length: 13 }, (_, i) => {
      const g = (i / 12) * Math.PI;
      return S(10 * Math.cos(g), ab - av - 11 + 9 * Math.sin(g));
    }), "ok", { opacity: Dn });
    const fo = 1 - Dn, dx = shake * 0.6;
    if (fo > 0.02) {
      scene.polyline(rect(-26 + dx, 24, 26 + dx, 33), field, { closed: true, bold: state === "error" || state === "loading", opacity: fo });
      let typed = 7, reveal = -1;
      if (state === "loading") { typed = Math.floor(ctx.loop(2.4) * 8); reveal = typed - 1; }
      if (state === "error") typed = 0;
      for (let k = 0; k < typed; k++) {
        const a = -21 + k * 5 + dx;
        if (k === reveal) scene.line(S(a, 26), S(a, 31.5), "hi", { bold: true });
        else scene.polyline(circle(a, 28.5, 1.3, 6), field === "muted" ? "base" : field, { bold: true, opacity: fo });
      }
      const caret = -21 + typed * 5 - 2.5 + dx;
      scene.line(S(caret, 25.5), S(caret, 31.5), field === "muted" ? "base" : field, { opacity: fo });
      // The eye: an almond and its pupil.
      const eye = [...Array.from({ length: 7 }, (_, i) => S(17 + dx + (i / 6) * 8, 28.5 + 2.4 * Math.sin((i / 6) * Math.PI))),
        ...Array.from({ length: 7 }, (_, i) => S(25 + dx - (i / 6) * 8, 28.5 - 2.4 * Math.sin((i / 6) * Math.PI)))];
      scene.polyline(eye, "muted", { closed: true, opacity: fo });
      scene.polyline(circle(21 + dx, 28.5, 1, 6), "muted", { opacity: fo });
      if (state === "error") scene.line(S(-26 + dx, 21), S(-6 + dx, 21), "err", { bold: true, opacity: ctx.fade() });
      scene.polyline(rect(-14, 11, 14, 17), state === "loading" ? "hi" : "muted", { closed: true, opacity: fo });
    }
    if (Dn > 0.02) {
      [14, 10].forEach((b, i) => scene.line(S(-16, b), S(i ? 8 : 16, b), "ok", { opacity: Dn }));
    }
  },
});
