import { defineFigure } from "../../core/define";
import type { DrawContext } from "../../core/types";
import { bump, clamp, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { faceArc, facing, frontArc } from "../shapes";

const TAU = Math.PI * 2;
type UV = [number, number];

/** The tone of the object a verdict is about: ghost when empty, plain while loading. */
const bodyTone = (ctx: DrawContext): Tone =>
  ctx.state === "empty" ? "ghost" : ctx.state === "loading" ? "base" : ctx.verdict();

/** The tone of the part that shows the state: `hi` while loading, the verdict after, `rest` otherwise. */
const accentTone = (ctx: DrawContext, rest: Tone = "muted"): Tone =>
  ctx.state === "loading" ? "hi" : ctx.state === "empty" ? "ghost" : ctx.verdict(rest);

/** A circle on the vertical plane x, the face that looks to the lower right; `u` runs right across the screen. */
const sideArc = (x: number, cy: number, cz: number, r: number, a0 = 0, a1 = TAU, steps = 20): Vec3[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [x, cy - r * Math.cos(a), cz + r * Math.sin(a)] as Vec3;
  });

/** A crescent: a disc of radius R with a disc of radius r, offset by (dx, dz), taken out of it. */
function crescent(R: number, r: number, dx: number, dz: number, steps = 18): UV[] {
  const d = Math.hypot(dx, dz), a = (R * R - r * r + d * d) / (2 * d), beta = Math.atan2(-dz, -dx);
  const al = Math.acos(clamp(-a / R, -1, 1)), ga = Math.acos(clamp((d - a) / r, -1, 1));
  const out: UV[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = beta - al + (2 * al * i) / steps;
    out.push([R * Math.cos(t), R * Math.sin(t)]);
  }
  for (let i = 0; i <= steps; i++) {
    const t = beta + ga - (2 * ga * i) / steps;
    out.push([dx + r * Math.cos(t), dz + r * Math.sin(t)]);
  }
  return out;
}

/** A five-pointed star, point up. */
const star = (r: number): UV[] => Array.from({ length: 10 }, (_, i) => {
  const a = Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r * 0.45 : r;
  return [k * Math.cos(a), k * Math.sin(a)];
});

/** A cylinder lying along y, its round end facing the lower left at y1. */
function tube(scene: Scene, x: number, y0: number, y1: number, cz: number, r: number, tone: Tone, opacity?: number): void {
  const ring = (y: number, a0: number, a1: number): Vec3[] => Array.from({ length: 13 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / 12;
    return [x + r * Math.cos(a), y, cz + r * Math.sin(a)];
  });
  scene.panel([...ring(y0, -Math.PI / 4, (3 * Math.PI) / 4), ...ring(y1, (3 * Math.PI) / 4, (7 * Math.PI) / 4)], tone, opacity);
  scene.panel(frontArc(x, y1, cz, r, 0, TAU, 24), tone, opacity);
}

/** A mood dial with the needle at a feeling. Use for mood check-ins, surveys and sentiment. */
export const mood = defineFigure({
  name: "Mood",
  label: "A mood dial with a needle",
  offset: 20,
  setup: ({ spring }) => ({ needle: spring(0.5, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const empty = state === "empty";
    let v = 0.5 + clamp(g.x / 120, -0.3, 0.3) * ctx.hover;
    if (state === "loading") v = 0.5 + 0.42 * Math.sin(ctx.time * 1.8);
    if (state === "success") v = 0.9;
    if (state === "error") v = -0.42;
    const V = m.needle.to(v).value;
    const body = bodyTone(ctx), accent = accentTone(ctx, "base");
    const X = shake, PZ = 54, R = 40, F = 7;
    scene.box(0, 0, 0, 136, 104, 4, "base");

    // The foot and a housing with a round top, its face looking down-left.
    scene.box(X, 0, 4, 100, 30, 8, body);
    const shape = (y: number, r: number, low: number): Vec3[] =>
      [...frontArc(X, y, PZ, r, 0, Math.PI, 20), [X - r, y, low], [X + r, y, low]];
    if (empty) {
      scene.panel(shape(F, R, 12), "ghost");
      return;
    }
    const back = -F, rise = (y: number): Vec3[] => frontArc(X, y, PZ, R, 0, (3 * Math.PI) / 4, 12);
    scene.panel(shape(back, R, 12), body);
    scene.panel([[X + R, back, 12], ...rise(back), ...rise(F).reverse(), [X + R, F, 12]], body);
    scene.panel(shape(F, R, 12), body);
    scene.cylinder(X + 44, 6, 12, 3.5, 4, body);
    const f = F + 0.05;
    scene.polyline(shape(f, R - 4, 16), "faint", { closed: true });

    // The scale in three zones, sad to happy, and a face under each.
    const pick = clamp(Math.round(V * 2), 0, 2);
    const zones: [number, number][] = [[0.7, 0.97], [0.36, 0.64], [0.03, 0.3]];
    zones.forEach(([a0, a1], i) => {
      const on = i === pick && state !== "idle";
      scene.polyline(frontArc(X, f, PZ, 31, Math.PI * a0, Math.PI * a1, 8), on ? accent : "muted", { bold: true });
    });
    [-22, 0, 22].forEach((fx, i) => {
      const on = i === pick && state !== "idle", t: Tone = on ? accent : "muted", cx = X + fx, cz = 27;
      scene.polyline(frontArc(cx, f, cz, 7, 0, TAU, 16), t, { bold: on });
      scene.line([cx - 2.5, f, cz + 2.5], [cx - 2.5, f, cz + 1], t);
      scene.line([cx + 2.5, f, cz + 2.5], [cx + 2.5, f, cz + 1], t);
      if (i === 0) scene.polyline(frontArc(cx, f, cz - 5, 3.2, 0.6, Math.PI - 0.6, 6), t);
      else if (i === 1) scene.line([cx - 2.5, f, cz - 2], [cx + 2.5, f, cz - 2], t);
      else scene.polyline(frontArc(cx, f, cz - 0.5, 3.2, Math.PI + 0.6, TAU - 0.6, 6), t);
    });

    // The needle on its hub; on error it has come loose and hangs below the scale.
    const a = Math.PI * (1 - V), len = state === "error" ? 24 : 28;
    scene.line([X - 5 * Math.cos(a), f + 0.2, PZ - 5 * Math.sin(a)], [X + len * Math.cos(a), f + 0.2, PZ + len * Math.sin(a)], accent, { bold: true });
    scene.panel(frontArc(X, f + 0.3, PZ, 3.5, 0, TAU, 12), body);
  },
});

/** A moon and stars for sleep, drifting. Use for sleep tracking, bedtime and night mode. */
export const sleepMoon = defineFigure({
  name: "SleepMoon",
  label: "A crescent moon with drifting stars",
  offset: 16,
  setup: ({ spring }) => ({ tip: spring(0, 90, 12), sway: spring(0, 140, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const T = m.tip.to(state === "error" ? 1.35 : 0).value;
    const S = m.sway.to(ctx.hover).value;
    const body = bodyTone(ctx);
    const BX = -4 + shake, BY = -12, R = 38, base = 12;
    scene.box(0, 0, 0, 124, 108, 4, "base");

    // Glow rings on the plate once the night light is on.
    if (state === "success") for (let k = 0; k < 2; k++) {
      scene.arc(BX, BY, 4.05, 36 + k * 10, -Math.PI / 4, (3 * Math.PI) / 4, "ok", { opacity: ctx.fade() * (1 - k * 0.4) });
    }
    // The round lamp base.
    scene.cylinder(BX, BY, 4, 28, base - 4, body);

    // The crescent stands on the base facing the viewer; on error it has rolled off the base onto the plate.
    const shape = crescent(R, 36, 10.8, 8);
    const c = Math.cos(T), s = Math.sin(T), n = Math.SQRT1_2, fall = T / 1.35;
    const at = ([u, v]: UV, o: number): Vec3 => {
      const dv = v + R, uu = u * c - dv * s - 10 * fall, vv = u * s + dv * c;
      return facing(BX + o * n, BY + o * n, base - 1 - 7 * fall + vv, uu, 0);
    };
    if (empty) {
      scene.panel(shape.map(p => at(p, 0)), "ghost");
      return;
    }

    // Three stars on wire stems beside the moon; they light in turn while it plays.
    const stars: [number, number, number][] = [[18, 26, 8], [32, 2, 6], [34, 42, 5]];
    const drawStars = () => stars.forEach(([u, v, r], k) => {
      let tone: Tone = state === "error" ? "faint" : state === "success" ? "ok" : "muted", grow = 1;
      if (state === "loading") {
        const q = (ctx.loop(1.8) - k / 3 + 1) % 1;
        grow = 1 + 0.4 * bump(q * 2);
        tone = q < 0.5 ? "hi" : "muted";
      }
      const sx = BX + 6 * n, sy = BY + 6 * n, su = u + S * 2 * (k + 1), z = base + R + v;
      scene.line(facing(sx, sy, base, u * 0.8, 0), facing(sx, sy, z - r * 0.4, su, 0), "faint");
      scene.panel(star(r * grow).map(([a, b]) => facing(sx, sy, z, su + a, b)), tone);
    });
    for (const o of [-2.5, 2.5]) scene.panel(shape.map(p => at(p, o)), body);
    if (T < 0.2) scene.polyline(crescent(R - 6, 35, 10.8, 8, 14).map(p => at(p, 2.55)), "faint", { closed: true });
    drawStars();
  },
});

/** A habit streak of days being filled in. Use for streaks, habits and daily goals. `count`: days, 4–10. */
export const streak = defineFigure({
  name: "Streak",
  label: "A row of days filling in as a streak",
  offset: 14,
  setup: ({ spring }) => ({
    fill: Array.from({ length: 10 }, () => spring(0, 160, 16)),
    drop: spring(0, 90, 12),
    flame: spring(0.6, 120, 14),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const n = ctx.count(7, 10, 4);
    const lit = state === "success" ? n : state === "loading" ? Math.floor(ctx.progress(n + 1) * n) : state === "error" ? n - 1 : empty ? 0 : Math.max(1, n - 2);
    const D = clamp(m.drop.to(state === "error" ? 1 : 0).value, 0, 1.1);
    let fl = 0.6 + ctx.hover * 0.2;
    if (state === "loading") fl = 0.75 + 0.15 * Math.sin(ctx.time * 11) + lit / n * 0.2;
    if (state === "success") fl = 1.15;
    if (state === "error") fl = 0.2;
    if (empty) fl = 0;
    const FL = m.flame.to(fl).value;
    const body = bodyTone(ctx);
    const BX = -24, face = BX + 3, span = 104, pitch = span / n, w = pitch * 0.78;
    const yAt = (k: number) => span / 2 - pitch * (k + 0.5);
    scene.box(0, 0, 0, 128, 112, 4, "base");

    // The board stands on two feet, its face toward the lower right, a header strip across the top.
    for (const fy of [-40, 40]) scene.box(BX, fy, 4, 22, 8, 4, body);
    scene.box(BX, 0, 8, 6, 112, 44, body);
    if (empty) {
      for (let k = 0; k < n; k++) scene.rect(face, yAt(k) - w / 2, face, yAt(k) + w / 2, 18, "ghost");
      scene.cylinder(30, -32, 4, 13, 6, "ghost");
      return;
    }
    scene.box(BX + 0.5, 0, 52, 7, 112, 6, body);
    for (const hy of [-30, 30]) scene.cylinder(BX, hy, 58, 2.5, 4, body);

    // The days: cards on the board, each stamped as it is done.
    for (let k = 0; k < n; k++) {
      const on = k < lit, y = yAt(k) + (state === "error" && k === n - 1 ? shake : 0);
      const F = m.fill[k]!.to(on ? 1 : 0).value;
      if (state === "error" && k === n - 1) {
        // The day that broke the streak has fallen off the board onto the plate.
        scene.rect(face + 0.05, y - w / 2, face + 0.05, y + w / 2, 18, "ghost");
        scene.polyline([[face + 0.05, y - w / 2, 18], [face + 0.05, y + w / 2, 18], [face + 0.05, y + w / 2, 38], [face + 0.05, y - w / 2, 38]], "ghost", { closed: true });
        scene.box(face + 1 + 12 * D, y, lerp(18, 4, D), lerp(2, 20, D), w, lerp(20, 2, D), "err");
        continue;
      }
      const tone: Tone = on ? (state === "success" ? "ok" : state === "loading" && k === lit - 1 ? "hi" : "base") : "faint";
      const x = face + 1 + F * 1.5;
      scene.box(x, y, 18, 2, w, 20, tone);
      if (F > 0.3) scene.polyline(sideArc(x + 1.05, y, 28, Math.min(5, w * 0.3) * F, 0, TAU, 14), tone === "base" ? "muted" : tone, { bold: true });
    }

    // The streak flame on its puck at the end of the row.
    const PX = 30, PY = -32;
    scene.cylinder(PX, PY, 4, 13, 6, body);
    const flame: Tone = state === "loading" ? "hi" : ctx.verdict("base");
    const drop = (W: number, H: number, z: number) => Array.from({ length: 24 }, (_, i) => {
      const t = (i / 24) * TAU;
      return facing(PX, PY, z, W * Math.sin(t) * Math.sin(t / 2), (H * (1 + Math.cos(t))) / 2);
    });
    const H = 6 + 30 * FL;
    scene.panel(drop(9 + 4 * FL, H, 10), flame);
    if (FL > 0.35) scene.panel(drop(4 + 2 * FL, H * 0.5, 10), flame === "base" ? "muted" : flame);
    if (state === "error") {
      // Smoke curling off the dying flame.
      const f = ctx.fade(1);
      scene.polyline(Array.from({ length: 10 }, (_, i) => facing(PX, PY, 18 + i * 2.6 * f, 4 * Math.sin(i * 0.9), 0)), "faint");
    }
  },
});

/** A person meditating on a cushion as breath rings expand and contract. Use for breathing exercises, meditation and calm moments. */
export const breathe = defineFigure({
  name: "Breathe",
  label: "A person meditating as rings expand and contract in breath",
  offset: 18,
  setup: ({ spring }) => ({ breath: spring(0.3, 90, 14), slump: spring(0, 100, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let I = m.breath.to(state === "success" ? 1 : state === "error" ? 0 : 0.3 + ctx.hover * 0.2).value;
    if (state === "loading") {
      const q = ctx.loop(5);
      I = q < 0.5 ? smoothstep(q * 2) : 1 - smoothstep((q - 0.5) * 2);
      m.breath.set(I);
    }
    const S = clamp(m.slump.to(state === "error" ? 1 : 0).value, 0, 1.2);
    const body = bodyTone(ctx);
    const X = shake;
    scene.cylinder(0, 0, 0, 66, 4, "base");

    // The breath rings on the mat.
    for (let k = 2; k >= 0; k--) {
      const r = 41 + k * 8 + I * 6;
      if (empty) {
        if (k === 0) scene.arc(0, 0, 4.05, r, 0, TAU, "ghost");
        continue;
      }
      if (state === "idle" && k === 2) continue;
      if (state === "error") {
        // Broken, ragged rings: the breath lost its rhythm.
        for (let j = 0; j < 4; j++) {
          const a = (j * TAU) / 4 + k * 0.7;
          scene.arc(0, 0, 4.05, r - k * 2, a, a + 0.9 - k * 0.2, k === 0 ? "err" : "faint", { bold: k === 0 });
        }
        continue;
      }
      const t: Tone = state === "loading" ? (k === 0 ? "hi" : "faint") : state === "success" ? "ok" : "faint";
      scene.arc(0, 0, 4.05, r, 0, TAU, t, { bold: k === 0 && state !== "idle", opacity: 1 - k * 0.25 });
    }

    // The cushion, then the person sitting cross-legged on it.
    scene.cylinder(X, 0, 4, 32, 9, body);
    if (empty) return;
    scene.arc(X, 0, 8.5, 32.05, -Math.PI / 4, (3 * Math.PI) / 4, "faint");
    // Crossed legs, knees out to each side, facing the viewer.
    const n = Math.SQRT1_2, fwd = (d: number): [number, number] => [X + d * n, d * n];
    const [lx, ly] = fwd(6);
    for (const side of [-1, 1]) scene.cylinder(...(facing(lx, ly, 13, side * 22, 0).slice(0, 2) as [number, number]), 13, 10, 7, body);
    scene.cylinder(lx, ly, 13, 15, 7, body);
    const lean = ctx.lean(2.5);
    const th = 33 + 5 * I - 11 * S, tr = 13 + 1.8 * I;
    const [tx, ty] = fwd(-3 + 4 * S);
    scene.cylinder(tx, ty, 20, tr, th, body);
    const top = 20 + th;
    // Arms hang from the shoulders, hands resting on the knees.
    const [kx, ky] = fwd(10);
    for (const side of [-1, 1]) {
      scene.polyline([facing(tx, ty, top - 3, side * (tr - 1), 0), facing(tx, ty, top - 15, side * (tr + 9), 0), facing(kx, ky, 20.5, side * 26, 0)], body, { bold: true });
      scene.disc(...(facing(kx, ky, 20.6, side * 26, 0)), 3, body);
    }
    const [hx, hy] = fwd(-3 + 11 * S);
    scene.panel(faceArc(hx + lean.x, hy + lean.y, top + 13 - 9 * S, 10, 0, TAU, 20), body);
  },
});

/** A water glass that fills. Use for hydration, drinks and water goals. */
export const hydrate = defineFigure({
  name: "Hydrate",
  label: "A glass filling with water",
  offset: 16,
  setup: ({ spring }) => ({ level: spring(0.35, 110, 16), tip: spring(0, 90, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let v = 0.35 + ctx.hover * 0.12;
    if (state === "loading") v = ctx.progress(3);
    if (state === "success") v = 0.92;
    if (empty) v = 0;
    const L = clamp(m.level.to(v).value, 0, 1);
    const T = clamp(m.tip.to(state === "error" ? 1 : 0).value, 0, 1);
    const body = bodyTone(ctx), water = accentTone(ctx, "muted");
    const GX = -14 + shake, GY = -4, r0 = 17, r1 = 21, H = 62;
    scene.box(0, 0, 0, 124, 112, 4, "base");

    // A water bottle stands behind to the right.
    const BX = 32, BY = -30;
    scene.cylinder(BX, BY, 4, 12, 38, empty ? "ghost" : "base");
    if (!empty) {
      scene.arc(BX, BY, 18, 12.05, -Math.PI / 4, (3 * Math.PI) / 4, "faint");
      scene.arc(BX, BY, 32, 12.05, -Math.PI / 4, (3 * Math.PI) / 4, "faint");
      scene.cylinder(BX, BY, 42, 8, 5, "base");
      scene.cylinder(BX, BY, 47, 5, 6, "base");
      scene.cylinder(BX, BY, 53, 6, 6, "base");
    }

    // On error the glass has tipped over and spilled across the plate.
    if (T > 0.02) {
      const pts: Vec3[] = Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * TAU, r = 15 * T * (1 + 0.18 * Math.sin(a * 3) + 0.1 * Math.cos(a * 5));
        return [GX + 2 + r * 1.2 * Math.cos(a), 40 + r * 0.8 * Math.sin(a), 4.05];
      });
      scene.panel(pts, "err", T);
      scene.line([GX + 30, 20, 5], [GX + 44, -8, 5], "muted", { bold: true, opacity: T });
      tube(scene, GX, -30, 28, 4 + r1, r1 - 1, "err", T);
      scene.polyline(frontArc(GX, 28.05, 4 + r1, r1 - 3, 0, TAU, 24), "muted", { opacity: T });
      scene.polyline(frontArc(GX, 28.1, 4 + r1, r1 - 3, Math.PI * 1.15, Math.PI * 1.85, 8), "err", { bold: true, opacity: T });
    }
    const up = 1 - T;
    if (up < 0.02) return;
    if (empty) {
      scene.cylinder(GX, GY, 4, r1, H, "ghost");
      return;
    }

    // The glass: a thick base, the water, a straw, then the clear wall drawn as lines.
    scene.cylinder(GX, GY, 4, r0, 5, body, up);
    const wz = 9, wh = (H - 10) * L, rw = (z: number) => r0 - 1 + ((r1 - r0) * (z - 4)) / H;
    if (wh > 1) scene.cylinder(GX, GY, wz, rw(wz + wh), wh, water, up);
    if (state === "loading" && wh > 4) for (let k = 0; k < 3; k++) {
      const q = (ctx.loop(1.2) + k / 3) % 1;
      scene.arc(GX - 6 + k * 6, GY + 4 - k * 3, wz + wh * q, 1.6, 0, TAU, "hi", { opacity: 1 - q });
    }
    scene.polyline([[GX + 4, GY - 2, 12], [GX + 9, GY - 7, H + 8], [GX + 19, GY - 15, H + 16]], "muted", { bold: true, opacity: up });
    const rim = 4 + H;
    const corner = (a: number, r: number, z: number): Vec3 => [GX + r * Math.cos(a), GY + r * Math.sin(a), z];
    scene.line(corner(-Math.PI / 4, r0, 4), corner(-Math.PI / 4, r1, rim), body, { opacity: up });
    scene.line(corner((3 * Math.PI) / 4, r0, 4), corner((3 * Math.PI) / 4, r1, rim), body, { opacity: up });
    scene.arc(GX, GY, rim, r1, 0, TAU, body, { opacity: up });
    scene.arc(GX, GY, rim, r1 - 1.5, -Math.PI / 4, (3 * Math.PI) / 4, "faint", { opacity: up });
    scene.arc(GX, GY, 4, r0, -Math.PI / 4, (3 * Math.PI) / 4, body, { opacity: up });
    for (const z of [24, 40, 56]) scene.arc(GX, GY, z, rw(z) + 1.05, Math.PI / 4 - 0.3, Math.PI / 4 + 0.3, "faint", { opacity: up });
  },
});
/** The outline of a heart, `size` units across, centred on (0, 0). */
const heartUV = (size: number): UV[] => Array.from({ length: 24 }, (_, i) => {
  const t = (i / 24) * TAU, k = size / 32;
  return [16 * Math.sin(t) ** 3 * k, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k];
});

/** One heartbeat over t in [0, 1): a P wave, the QRS spike and a T wave. */
function beat(t: number): number {
  if (t > 0.1 && t < 0.2) return 3 * Math.sin((Math.PI * (t - 0.1)) / 0.1);
  if (t >= 0.3 && t < 0.34) return lerp(0, -3, (t - 0.3) / 0.04);
  if (t >= 0.34 && t < 0.4) return lerp(-3, 22, (t - 0.34) / 0.06);
  if (t >= 0.4 && t < 0.46) return lerp(22, -9, (t - 0.4) / 0.06);
  if (t >= 0.46 && t < 0.5) return lerp(-9, 0, (t - 0.46) / 0.04);
  if (t > 0.62 && t < 0.78) return 5 * Math.sin((Math.PI * (t - 0.62)) / 0.16);
  return 0;
}

/** A heartbeat trace drawn across a bedside monitor. Use for heart rate, vitals and health monitoring. */
export const pulse = defineFigure({
  name: "Pulse",
  label: "A heartbeat trace drawing across",
  offset: 12,
  setup: ({ spring }) => ({ clip: spring(0, 110, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const C = clamp(m.clip.to(state === "error" ? 1 : ctx.hover * 0.3).value, 0, 1.1);
    const body = bodyTone(ctx), trace = accentTone(ctx, "muted");
    const MX = -22 + shake, D = 20, W = 100, Z0 = 21, H = 60, face = MX + D / 2;
    scene.box(0, 0, 0, 128, 116, 4, "base");

    // The stand and the monitor, its screen looking down-right.
    scene.box(MX, 0, 4, 30, 46, 5, body);
    scene.box(MX, 0, 9, 8, 12, Z0 - 9, body);
    scene.box(MX, 0, Z0, D, W, H, body);
    if (empty) return;
    const on = (u: number, z: number, d = 0.05): Vec3 => [face + d, -u, z];
    const s0 = -44, s1 = 24, z0 = Z0 + 7, z1 = Z0 + H - 6, mid = Z0 + 30;
    scene.polyline([on(s0, z0), on(s1, z0), on(s1, z1), on(s0, z1)], "muted", { closed: true });
    scene.line(on(s0 + 2, mid - 12), on(s1 - 2, mid - 12), "faint");

    // The trace: steady beats, a sweep while it reads, a flat line on error.
    const pts: Vec3[] = [], from = s0 + 2, to = s1 - 2;
    const sweep = state === "loading" ? lerp(from, to, ctx.loop(2.4)) : to;
    const old: Vec3[] = [];
    for (let u = from; u <= to + 0.01; u += 1) {
      const z = mid + (state === "error" ? 0 : beat((((u - from) / 34) % 1 + 1) % 1));
      if (u <= sweep) pts.push(on(u, z, 0.1));
      else if (u > sweep + 6) old.push(on(u, z, 0.1));
    }
    if (old.length > 1) scene.polyline(old, "faint");
    if (pts.length > 1) scene.polyline(pts, trace, { bold: state !== "idle" });

    // The side panel: a heart, a readout and a knob, with buttons under the screen.
    let hs = 12;
    if (state === "loading") hs = 12 * (1 + 0.25 * bump((ctx.loop(0.8) * 3) % 1));
    scene.panel(heartUV(hs).map(([a, b]) => on(36 + a, z1 - 8 + b, 0.1)), state === "idle" ? "muted" : trace);
    scene.line(on(29, z1 - 21), on(43, z1 - 21), "muted", { bold: true });
    scene.line(on(29, z1 - 27), on(38, z1 - 27), "faint", { bold: true });
    scene.polyline(sideArc(face + 0.1, -36, Z0 + 12, 5, 0, TAU, 14), "muted");
    scene.line(on(36, Z0 + 12, 0.15), on(36, Z0 + 16, 0.15), "muted");
    for (const u of [-34, -22, -10]) scene.box(face + 1, -u, Z0 + 1.5, 2, 7, 3.5, body);

    // The lead runs off the side to a finger clip on the plate; on error the clip has sprung open.
    const CX = 28, CY = 36;
    scene.polyline([[MX + 3, W / 2 + 0.1, Z0 + 10], [MX + 5, W / 2 + 3, 4.5], [CX - 18, CY + 6, 4.5], [CX - 9, CY, 6]], "muted", { bold: true });
    scene.box(CX, CY, 4, 18, 12, 4, body);
    scene.box(CX + 2 * C, CY + 13 * C, lerp(8, 4, C) + 4 * bump(C), 16, 11, 4, body);
    if (C < 0.5) scene.disc(CX + 3, CY, 12.1, 2, state === "loading" ? "hi" : "muted", { fill: true });
  },
});

/** A sun rising over a horizon, for a new day. Use for morning routines, daily summaries and good-morning states. */
export const sunrise = defineFigure({
  name: "Sunrise",
  label: "A sun rising over a horizon",
  offset: 16,
  setup: ({ spring }) => ({ rise: spring(0.45, 100, 16), cloud: spring(0, 90, 15) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const empty = state === "empty";
    let r = 0.5 + ctx.hover * 0.15;
    if (state === "loading") r = ctx.progress(4);
    if (state === "success") r = 1;
    if (state === "error") r = 0.3;
    const R = m.rise.to(r).value, K = m.cloud.to(state === "error" ? 1 : 0).value;
    const sun = accentTone(ctx, "base");
    const SX = -8, SY = -22, SR = 20, sz = lerp(0, 66, R);
    scene.box(0, 0, 0, 132, 104, 4, "base");

    // Water in front of the range, with the sun's reflection once it is up.
    if (!empty) {
      for (const [y, x0, x1] of [[18, -54, -26], [18, 30, 52], [28, -46, -14], [28, 22, 44], [38, -36, -16], [38, 30, 46]] as const) {
        scene.line([x0, y, 4.05], [x1, y, 4.05], "faint");
      }
      const show = clamp((sz - 14) / 30, 0, 1);
      if (show > 0.02) [[20, 11], [28, 8], [36, 5]].forEach(([y, h]) => {
        scene.line([SX - h! * show, y!, 4.05], [SX + h! * show, y!, 4.05], sun === "base" ? "muted" : sun, { bold: true });
      });
    }

    // The sun, cut off at the plate, and its rays; the mountains in front hide what is still below the ridge.
    const disc = frontArc(SX, SY, sz, SR, 0, TAU, 28).map(([x, y, z]) => [x, y, Math.max(4, z)] as Vec3);
    if (empty) scene.polyline(disc, "ghost", { closed: true });
    else {
      const rays: Tone = sun === "base" ? (R > 0.6 ? "muted" : "faint") : sun;
      for (let k = 0; k < 12; k++) {
        const a = (k * TAU) / 12 + Math.PI / 12, z0 = sz + (SR + 5) * Math.sin(a), z1 = sz + (SR + 12) * Math.sin(a);
        if (z0 > 6 && z1 > 6) scene.line([SX + (SR + 5) * Math.cos(a), SY, z0], [SX + (SR + 12) * Math.cos(a), SY, z1], rays);
      }
      scene.panel(disc, sun);
    }

    // A cloud drifts in over the sun on error.
    if (K > 0.02) {
      const cx = lerp(80, SX + 6, K), cz = 36;
      const puffs: [number, number, number][] = [[-14, 0, 9], [0, 5, 12], [14, 0, 9]];
      const top: Vec3[] = [];
      for (let x = -23; x <= 23; x += 2) {
        const z = Math.max(0, ...puffs.map(([px, pz, pr]) => Math.abs(x - px) < pr ? pz + Math.sqrt(pr * pr - (x - px) ** 2) : 0));
        top.push([cx + x, SY + 6, cz + z]);
      }
      scene.panel([...top, [cx + 23, SY + 6, cz - 3], [cx - 23, SY + 6, cz - 3]], "base", Math.min(1, K * 1.5));
    }

    // The mountain range behind and the low hills in front, each a flat cut-out with depth.
    const range: [number, number][] = [[-62, 4], [-32, 50], [-20, 38], [4, 14], [24, 34], [36, 42], [62, 4]];
    const hill = (x0: number, x1: number, h: number): [number, number][] =>
      Array.from({ length: 13 }, (_, i) => [lerp(x0, x1, i / 12), 4 + h * Math.sin((Math.PI * i) / 12) ** 0.8]);
    const layers: [number, [number, number][]][] = [[-10, range], [4, hill(-64, -14, 16)], [4, hill(22, 64, 18)]];
    for (const [y, pts] of layers) {
      if (empty) {
        scene.polyline(pts.map(([x, z]) => [x, y, z] as Vec3), "ghost", { closed: true });
        continue;
      }
      scene.panel(pts.map(([x, z]) => [x, y - 3, z] as Vec3), "base");
      scene.panel(pts.map(([x, z]) => [x, y, z] as Vec3), "base");
    }
    if (!empty) scene.polyline([[-38.5, -9.95, 40], [-35, -9.95, 36], [-31, -9.95, 41], [-26, -9.95, 36], [-22, -9.95, 40]], "muted");
  },
});

/** A bed with a tucked blanket, for bedtime and rest reminders. Use for bedtime, rest and sleep settings. */
export const rest = defineFigure({
  name: "Rest",
  label: "A bed with a blanket pulled up",
  offset: 10,
  setup: ({ spring }) => ({ blanket: spring(0.45, 110, 16), fall: spring(0, 90, 13), sleeper: spring(0, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let b = 0.4 + ctx.hover * 0.15;
    if (state === "loading") b = 0.4 + 0.6 * bump(ctx.loop(3));
    if (state === "success") b = 1;
    if (state === "error") b = 0.7;
    const B = m.blanket.to(b).value, F = clamp(m.fall.to(state === "error" ? 1 : 0).value, 0, 1.1);
    const P = clamp(m.sleeper.to(state === "success" ? 1 : 0).value, 0, 1);
    const body = bodyTone(ctx), cover: Tone = state === "loading" ? "hi" : ctx.verdict("base");
    scene.box(0, 0, 0, 132, 124, 4, "base");

    // Legs, frame, headboard and mattress; the bed runs along x with its head at the back.
    const X0 = -50, X1 = 44, HW = 30, top = 26;
    if (empty) {
      scene.box(-3, 0, 4, X1 - X0, HW * 2, top - 4, "ghost");
      scene.box(X0 - 3, 0, 4, 6, HW * 2 + 4, 52, "ghost");
      return;
    }
    for (const [x, y] of [[X0 + 4, -HW + 4], [X1 - 4, -HW + 4], [X0 + 4, HW - 4], [X1 - 4, HW - 4]] as const) scene.box(x, y, 4, 5, 5, 6, body);
    scene.box(X0 - 3, 0, 4, 6, HW * 2 + 4, 52, body);
    scene.box(X0 - 3, 0, 56, 9, HW * 2 + 8, 4, body);
    scene.box(-3, 0, 10, X1 - X0, HW * 2, 6, body);
    scene.box(-3, 0, 16, X1 - X0 - 4, HW * 2 - 4, top - 16, body);
    // The pillow, and the sleeper's head on it once tucked in.
    scene.box(X0 + 13, 0, top, 16, 40, 6, body);
    scene.line([X0 + 13, -16, top + 6.05], [X0 + 13, 16, top + 6.05], "faint");

    // The blanket: turned down to a fold, pulled up while loading, slid off the side on error.
    const xt = lerp(14, X0 + 24, clamp(B, 0, 1.05)), len = X1 - xt;
    const by = lerp(0, HW + 15, F), bz = lerp(top, 4, F), bd = lerp(HW * 2 + 2, 26, F);
    const cx = (xt + X1) / 2 + F * 6 + shake;
    if (F < 0.5) {
      scene.panel([[xt, HW + 1, top + 3], [X1, HW + 1, top + 3], [X1, HW + 1, 15], [xt, HW + 1, 15]].map(([x, y, z]) => [x!, y! + by, z! - (top - bz)] as Vec3), cover, 1 - F * 2);
    }
    scene.box(cx, by, bz, len, bd, 3, cover);
    if (P > 0.05) scene.box(cx + 2, by, bz + 3, len - 14, 22, 4 * P, cover);
    scene.box(xt + 5, by, bz + 3, 10, bd, 1.5, cover);
    if (F > 0.3) scene.line([cx - len / 3, by - 4, bz + 3.05], [cx + len / 3, by + 6, bz + 3.05], "faint", { opacity: F });
    if (P > 0.05) scene.panel(faceArc(X0 + 14, 0, top + 14, 8, 0, TAU, 20), cover, P);

    // The footboard, low, at the near end.
    scene.box(X1 + 3, 0, 4, 6, HW * 2 + 4, 30, body);
  },
});

/** A medal with a ribbon, for badges and achievements. Use for rewards, badges and milestones reached. */
export const badge = defineFigure({
  name: "Badge",
  label: "A medal with a ribbon",
  offset: 10,
  setup: ({ spring }) => ({ spin: spring(0), drop: spring(0, 90, 12) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const empty = state === "empty";
    let S = m.spin.to(state === "idle" ? clamp(g.x / 60, -0.6, 0.6) * ctx.hover : 0).value;
    if (state === "loading") {
      S = ctx.time * 3;
      m.spin.set(S % TAU);
    }
    const Dp = clamp(m.drop.to(state === "error" ? 1 : 0).value, 0, 1);
    const body = bodyTone(ctx), accent = accentTone(ctx, "base");
    const MY = 0, MZ = 38, MR = 21, bar = 82;
    scene.box(0, 0, 0, 112, 96, 4, "base");

    // The display stand: a base, two posts and a crossbar.
    const stand: Tone = empty ? "ghost" : "base";
    scene.box(0, -6, 4, 76, 26, 5, stand);
    for (const x of [-32, 32]) scene.box(x, -6, 9, 5, 5, bar - 9, stand);
    scene.box(0, -6, bar, 70, 5, 5, stand);
    if (empty) {
      scene.polyline(frontArc(0, MY, MZ, MR, 0, TAU, 28), "ghost");
      return;
    }

    // The fallen medal, on error, lies on the plate in front of the stand.
    if (Dp > 0.02) {
      const fx = 6 + shake, fy = 28;
      scene.cylinder(fx, fy, 4, MR, 3, "err", Dp);
      scene.panel(star(12).map(([a, b]) => [fx + a, fy - b, 7.1] as Vec3), "err", Dp);
    }

    // The ribbon: two striped straps meeting in a V at the medal's ring; on error they hang torn short.
    const ringZ = MZ + MR + 3, end = lerp(ringZ, 58, Dp);
    for (const side of [-1, 1]) {
      const t = (z: number) => (bar - z) / (bar - ringZ);
      const at = (x0: number, x1: number, z: number): Vec3 => [lerp(x0, x1, t(z)), MY - 2, z];
      const strap: Vec3[] = [at(side * 25, side * -5, bar), at(side * 12, side * 5, bar), at(side * 12, side * 5, end), at(side * 25, side * -5, end)];
      scene.panel(strap, "base");
      scene.line(at(side * 18.5, 0, bar), at(side * 17, 0, end), "muted");
    }
    if (Dp >= 0.98) return;

    // The medal: a thick disc that turns while loading, a rim, a raised star and a hanging ring.
    const k = Math.cos(S), up = 1 - Dp, X = shake, cz = MZ - Dp * 20;
    const disc = (y: number, r: number): Vec3[] => frontArc(0, y, cz, r, 0, TAU, 28).map(([x, yy, z]) => [X + x * k, yy, z] as Vec3);
    scene.polyline(frontArc(X, MY, ringZ - 1, 3, 0, TAU, 10), "base", { opacity: up });
    for (const y of [MY - 1.5, MY, MY + 1.5]) scene.panel(disc(y, MR), body, up);
    if (Math.abs(k) > 0.25) {
      const f = MY + 1.6;
      scene.polyline(disc(f, MR - 4), state === "loading" ? "hi" : "muted", { closed: true, opacity: up });
      scene.panel(star(12).map(([a, b]) => [X + a * k, f + 0.1, cz + b] as Vec3), accent, up);
    }
  },
});

/** A journal page being written, with a gentle heart on it. Use for journaling, gratitude and reflection prompts. */
export const journal = defineFigure({
  name: "Journal",
  label: "A journal page with a heart",
  offset: 14,
  setup: ({ spring }) => ({ fold: spring(0, 110, 15), slip: spring(0, 90, 12), pen: spring(0, 120, 15) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const fold = m.fold.to(state === "success" ? Math.PI : ctx.hover * 0.35).value;
    const Sl = clamp(m.slip.to(state === "error" ? 1 : 0).value, 0, 1.1);
    const Pn = m.pen.to(state === "loading" ? 1 : 0).value;
    const body = bodyTone(ctx);
    const th = lerp(0.95, 0.1, Sl), X0 = lerp(6, 34, Sl) + shake, Z0 = lerp(14, 6, Sl), Yc = 0, W = 34, HH = 46;
    const c = Math.cos(th), s = Math.sin(th);
    // A point on the book: u across (screen right), w up the page, n out of the page toward the viewer.
    const P = (u: number, w: number, n = 0): Vec3 => {
      let uu = u, nn = n;
      if (u < 0) {
        uu = u * Math.cos(fold) - n * Math.sin(fold);
        nn = n * Math.cos(fold) - u * Math.sin(fold);
      }
      return [X0 - w * c + nn * s, Yc - uu, Z0 + w * s + nn * c];
    };
    const quad = (u0: number, u1: number, w0: number, w1: number, n: number) => [P(u0, w0, n), P(u1, w0, n), P(u1, w1, n), P(u0, w1, n)];
    scene.box(0, 0, 0, 120, 112, 4, "base");

    // The book stand: a base, a slanted back board and a ledge for the book to rest on.
    const stand: Tone = empty ? "ghost" : "base";
    scene.box(-10, 0, 4, 44, 80, 6, stand);
    const B = (u: number, w: number): Vec3 => [6 - w * Math.cos(0.95) - 5 * Math.sin(0.95), -u, 14 + w * Math.sin(0.95) - 5 * Math.cos(0.95)];
    scene.panel([B(-30, -6), B(30, -6), B(30, 40), B(-30, 40)], stand);
    if (Sl < 0.5) scene.box(9, 0, 10, 5, 80, 5, stand);
    if (empty) {
      scene.polyline(quad(-W, W, 0, HH, 0), "ghost", { closed: true });
      return;
    }

    // The covers, the page block and the two pages.
    scene.panel(quad(0, W + 2, -2, HH + 2, -3), body);
    scene.panel(quad(0, W, 0, HH, 0), body);
    for (const w of [16, 22, 28, 34, 40]) scene.line(P(5, w, 0.1), P(w === 16 ? 18 : W - 5, w, 0.1), "faint");
    const hs = state === "success" ? 18 : 15;
    scene.panel(heartUV(hs).map(([a, b]) => P(W / 2 + 1 + a, 29 + b, 0.15)), state === "loading" ? "base" : ctx.verdict("muted"));
    // The ribbon bookmark down from the spine.
    scene.polyline([P(1, HH, 0.2), P(4, 2, 0.2), P(6, -10, 0.2)], "muted", { bold: true });

    // The left half: written lines, the line being written while loading; on success it folds shut over the right.
    const back = fold > Math.PI / 2;
    const left = () => {
      scene.panel(quad(-W, 0, 0, HH, 0), body);
      if (back) return;
      const lines = [40, 34, 28, 22, 16];
      lines.forEach((w, i) => {
        const end = i === lines.length - 1 ? -16 : -5;
        if (state === "loading" && i === lines.length - 1) {
          const q = ctx.loop(2.4), x = lerp(-W + 5, end, q);
          scene.line(P(-W + 5, w, 0.1), P(x, w, 0.1), "hi", { bold: true });
          return;
        }
        scene.line(P(-W + 5, w, 0.1), P(end, w, 0.1), "muted");
      });
    };
    const leftCover = () => {
      scene.panel(quad(-W - 2, 0, -2, HH + 2, -3), body);
      if (back) scene.panel(heartUV(16).map(([a, b]) => P(-W / 2 - 1 - a, 25 + b, -3.1)), body);
    };
    if (back) {
      left();
      leftCover();
    } else {
      leftCover();
      left();
    }

    // The pen: on the plate at rest, lifted to the page to write while loading.
    const q = state === "loading" ? ctx.loop(2.4) : 0;
    const tip = P(lerp(-W + 5, -16, q), 16, 0.3), restTip: Vec3 = [30, 40, 5];
    const T: Vec3 = [lerp(restTip[0], tip[0], Pn), lerp(restTip[1], tip[1], Pn), lerp(restTip[2], tip[2], Pn)];
    const tail: Vec3 = [T[0] + lerp(26, 12, Pn), T[1] + lerp(-14, -10, Pn), T[2] + lerp(0, 22, Pn)];
    const mid: Vec3 = [lerp(T[0], tail[0], 0.15), lerp(T[1], tail[1], 0.15), lerp(T[2], tail[2], 0.15)];
    scene.line(T, mid, "muted", { bold: true });
    scene.line(mid, tail, state === "loading" ? "hi" : "base", { bold: true });
  },
});
