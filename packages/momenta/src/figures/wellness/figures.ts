import { defineFigure } from "../../core/define";
import { clamp, smoothstep } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";
import { faceArc, frontArc, heart } from "../shapes";

/** A mood dial with the needle at a feeling. Use for mood check-ins, surveys and sentiment. */
export const mood = defineFigure({
  name: "Mood",
  label: "A mood dial with a needle",
  offset: 6,
  setup: ({ spring }) => ({ needle: spring(0.5, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    let v = 0.5;
    if (state === "idle" && ctx.pointer.over > 0.2) v = clamp(0.5 + g.x / 120, 0, 1);
    if (state === "loading") v = 0.5 + 0.4 * Math.sin(ctx.time * 1.8);
    if (state === "success") v = 0.95;
    if (state === "error") v = 0.05;
    const V = m.needle.to(v).value, a = Math.PI * (1 - V);
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 120, 70, 4, "base");
    scene.polyline(faceArc(0, 0, 4, 42, Math.PI, 0, 28), "faint", { bold: true });
    if (state !== "empty") scene.line([shake, 0, 4], [42 * 0.8 * Math.cos(a) + shake, 42 * 0.8 * Math.sin(a), 4], tone, { bold: true });
    scene.disc(shake, 0, 4.1, 4, tone, { fill: true });
    if (state === "success") scene.check(0, -30, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -30, 4, "err", ctx.fade());
  },
});

/** A moon and stars for sleep, drifting. Use for sleep tracking, bedtime and night mode. */
export const sleepMoon = defineFigure({
  name: "SleepMoon",
  label: "A crescent moon with drifting stars",
  offset: 6,
  setup: () => ({}),
  draw(ctx) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 120, 90, 4, "base");
    const moon = faceArc(-6 + shake, 0, 20, 30, 0, Math.PI * 2, 40);
    const bite = faceArc(12 + shake, -4, 20, 24, 0, Math.PI * 2, 40);
    scene.panel(moon, state === "empty" ? "faint" : "base");
    scene.panel(bite, "faint");
    scene.polyline(moon, tone === "base" ? "muted" : tone, { closed: true, bold: true });
    for (let k = 0; k < 4; k++) {
      const q = state === "loading" ? (ctx.loop(3) + k / 4) % 1 : k / 4;
      scene.sparkle(30 + k * 10, -20 + k * 12, 14 + q * 20, 3 + 2 * Math.sin(q * Math.PI), state === "loading" ? "hi" : "muted", 1 - Math.abs(q - 0.5));
    }
    if (state === "success") scene.check(40, 30, 20, "ok", ctx.fade());
    if (state === "error") scene.cross(40, 30, 20, "err", ctx.fade());
  },
});

/** A habit streak of days being filled in. Use for streaks, habits and daily goals. `count`: days, 4–10. */
export const streak = defineFigure({
  name: "Streak",
  label: "A row of days filling in as a streak",
  offset: 4,
  setup: ({ spring }) => ({ fill: Array.from({ length: 10 }, () => spring(0, 160, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(7, 10, 4), pitch = 116 / n, x0 = -58 + pitch / 2;
    const lit = state === "success" ? n : state === "loading" ? Math.floor(ctx.progress(n + 1) * n) : state === "error" ? n - 1 : state === "empty" ? 0 : Math.max(1, n - 2);
    scene.box(0, 0, 0, 130, 50, 4, "base");
    for (let k = 0; k < n; k++) {
      const x = x0 + k * pitch, on = k < lit;
      const F = m.fill[k]!.to(on ? 1 : 0).value;
      const tone = state === "error" && k === n - 1 ? "err" : on ? (state === "success" ? "ok" : "hi") : "faint";
      scene.box(x + (state === "error" && k === n - 1 ? shake : 0), 0, 4 + F * 2, pitch * 0.7, pitch * 0.7, 3, tone, state === "empty" ? 0.6 : 1);
      if (F > 0.3) scene.check(x, 0, 9 + F * 2, tone === "hi" ? "muted" : tone, F);
    }
    if (state === "error") scene.cross(x0 + (n - 1) * pitch, 0, 10, "err", ctx.fade());
  },
});

/** Breathing rings expanding and contracting. Use for breathing exercises, meditation and calm moments. */
export const breathe = defineFigure({
  name: "Breathe",
  label: "Rings expanding and contracting in breath",
  offset: 4,
  setup: () => ({}),
  draw(ctx) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const cycle = state === "loading" ? ctx.loop(5) : 0.25;
    const inhale = cycle < 0.5 ? smoothstep(cycle * 2) : 1 - smoothstep((cycle - 0.5) * 2);
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    const size = state === "empty" ? 0 : 1;
    for (let k = 3; k >= 1; k--) {
      const r = (14 + k * 12 + inhale * 14) * size;
      scene.arc(shake, 0, 4, r, 0, Math.PI * 2, k === 1 ? tone : "faint", { opacity: 0.4 + 0.2 * (3 - k) });
    }
    scene.disc(shake, 0, 6, 12 + inhale * 8, tone, { fill: state !== "empty" });
    if (state === "success") scene.check(0, -54, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -54, 4, "err", ctx.fade());
  },
});

/** A water glass that fills. Use for hydration, drinks and water goals. */
export const hydrate = defineFigure({
  name: "Hydrate",
  label: "A glass filling with water",
  offset: 4,
  setup: ({ spring }) => ({ level: spring(0.3, 110, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let v = 0.3;
    if (state === "loading") v = ctx.progress(3);
    if (state === "success") v = 1;
    if (state === "error") v = 0.1;
    if (state === "empty") v = 0;
    const L = m.level.to(v).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : "base";
    scene.box(0, 0, 0, 100, 80, 4, "base");
    scene.cylinder(shake, 0, 4, 26, 60, state === "empty" ? "ghost" : tone === "base" ? "base" : tone);
    if (L > 0.02) scene.cylinder(shake, 0, 6, 24, 54 * L, state === "empty" ? "ghost" : tone === "base" ? "hi" : tone);
    if (state === "success") scene.check(44, -26, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(44, -26, 4, "err", ctx.fade());
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
