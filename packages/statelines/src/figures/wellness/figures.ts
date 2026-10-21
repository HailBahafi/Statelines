import { defineFigure } from "../../core/define";
import type { DrawContext } from "../../core/types";
import { bump, clamp, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { faceArc, facing, frontArc, heart } from "../shapes";

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
/** A heartbeat trace drawn across the frame. Use for heart rate, vitals and health monitoring. */
export const pulse = defineFigure({
  name: "Pulse",
  label: "A heartbeat trace drawing across",
  offset: 4,
  setup: () => ({}),
  draw(ctx) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    const beat = (t: number) => (t > 0.4 && t < 0.46 ? 30 : t > 0.46 && t < 0.52 ? -18 : 0) + (t > 0.5 && t < 0.56 ? 8 : 0);
    const draw = state === "loading" ? ctx.loop(2.2) : state === "success" ? 1 : state === "error" ? 0.45 : state === "empty" ? 0 : 0.7;
    const pts: Vec3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      if (t > draw) break;
      pts.push([-64 + 128 * t, shake * (state === "error" && t > 0.4 ? 1 : 0), 4 + beat(t) * 0.6]);
    }
    scene.box(0, 0, 0, 140, 70, 4, "base");
    scene.line([-64, 0, 4.05], [64, 0, 4.05], "faint");
    if (pts.length > 1) scene.polyline(pts, tone, { bold: true });
    if (state === "success") scene.check(54, -26, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(54, -26, 4, "err", ctx.fade());
    if (state === "idle") scene.polyline([[-64, 0, 4], [64, 0, 4]], "faint");
  },
});

/** A sun rising over a horizon, for a new day. Use for morning routines, daily summaries and good-morning states. */
export const sunrise = defineFigure({
  name: "Sunrise",
  label: "A sun rising over a horizon",
  offset: 4,
  setup: ({ spring }) => ({ rise: spring(0.4, 100, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let r = 0.4;
    if (state === "loading") r = ctx.progress(4);
    if (state === "success") r = 1;
    if (state === "error") r = 0.2;
    if (state === "idle") r = 0.4 + ctx.hover * 0.2;
    const R = m.rise.to(r).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    const sunZ = 4 + R * 30;
    scene.box(0, 0, 0, 130, 80, 4, "base");
    scene.line([-60, 0, 4.05], [60, 0, 4.05], "muted", { bold: true });
    // The sun stands upright, facing the viewer, so it reads as a sun and not a flat disc.
    scene.panel(frontArc(shake, 0, sunZ, 22), "base");
    scene.polyline(frontArc(shake, 0, sunZ, 22), tone, { closed: true, bold: true });
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.1 + (k / 6) * 0.8);
      const r0 = 28, r1 = 38;
      scene.line([shake + r0 * Math.cos(a), 0, sunZ + r0 * Math.sin(a) * 0.9], [shake + r1 * Math.cos(a), 0, sunZ + r1 * Math.sin(a) * 0.9], R > 0.6 ? "muted" : "faint");
    }
    if (state === "success") scene.check(44, -24, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(44, -24, 4, "err", ctx.fade());
  },
});

/** A bed with a tucked blanket, for bedtime and rest reminders. Use for bedtime, rest and sleep settings. */
export const rest = defineFigure({
  name: "Rest",
  label: "A bed with a blanket pulled up",
  offset: 6,
  setup: ({ spring }) => ({ blanket: spring(0.4, 110, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let b = 0.4;
    if (state === "loading") b = 0.4 + 0.6 * smoothstep(ctx.loop(3));
    if (state === "success") b = 1;
    const B = m.blanket.to(b).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 120, 70, 6, "base");
    scene.box(-44 + shake, 0, 6, 60, 40, 8, "muted");
    scene.box(-16 + shake, 0, 14, 46 + 22 * B, 42, 8 + 2 * B, tone);
    if (state === "success") scene.check(44, -22, 6, "ok", ctx.fade());
    if (state === "error") scene.cross(44, -22, 6, "err", ctx.fade());
  },
});

/** A medal with a ribbon, for badges and achievements. Use for rewards, badges and milestones reached. */
export const badge = defineFigure({
  name: "Badge",
  label: "A medal with a ribbon",
  offset: 4,
  setup: ({ spring }) => ({ spin: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    let s = 0;
    if (state === "idle") s = clamp(g.x / 60, -0.5, 0.5) * ctx.hover;
    if (state === "loading") s = Math.sin(ctx.time * 2.4) * 0.5;
    if (state === "success") s = 0;
    const S = m.spin.to(s).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 100, 90, 4, "base");
    scene.polyline([[-14 + shake, -20, 10], [-22 + shake, -50, 6], [-8 + shake, -40, 6], [-2 + shake, -54, 10]] as Vec3[], "muted", { bold: true });
    scene.polyline([[14 + shake, -20, 10], [22 + shake, -50, 6], [8 + shake, -40, 6], [2 + shake, -54, 10]] as Vec3[], "muted", { bold: true });
    scene.cylinder(shake, 0, 4, 26 * (0.6 + 0.4 * Math.abs(Math.cos(S))), 8, tone);
    scene.disc(shake, 0, 12.1, 16, "faint");
    if (state === "success") scene.sparkle(44, -20, 22, 8, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -20, 14, "err", ctx.fade());
  },
});

/** A journal page being written, with a gentle heart on it. Use for journaling, gratitude and reflection prompts. */
export const journal = defineFigure({
  name: "Journal",
  label: "A journal page with a heart",
  offset: 4,
  setup: ({ spring }) => ({ beat: spring(0, 180, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const b = m.beat.to(state === "success" ? 1 : ctx.hover * 0.5).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 100, 120, 4, "base");
    for (let k = 0; k < 5; k++) scene.line([-34 + shake, -36 + k * 12, 4.05], [30 - (k === 4 ? 16 : 0), -36 + k * 12, 4.05], "muted");
    heart(scene, 6, 26, 4.05, 22 + 6 * b, tone);
    if (state === "loading") {
      const w = ctx.loop(2.4);
      scene.line([-34 + shake, -48, 4.1], [-34 + shake + 64 * w, -48, 4.1], "hi", { bold: true });
    }
    if (state === "error") scene.cross(6, 26, 4.1, "err", ctx.fade());
  },
});
