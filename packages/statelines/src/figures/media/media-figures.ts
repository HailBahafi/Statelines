import { defineFigure } from "../../core/define";
import { clamp, falloff, lerp, smoothstep } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";
import { faceArc, facing, heart } from "../shapes";

/** A video frame with a play button that is pressed. Use for video players, reels and watch actions. */
export const play = defineFigure({
  name: "Play",
  label: "A video frame with a play button",
  offset: 6,
  setup: ({ spring }) => ({ press: spring(0, 200, 18), progress: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const p = m.press.to(state === "loading" ? 2 : ctx.hover * 1.4).value;
    const playing = state === "success";
    const frac = state === "loading" ? ctx.progress(4) : playing ? 1 : state === "error" ? 0.3 : 0;
    const bar = m.progress.to(frac).value;
    scene.box(0, 0, 0, 132, 84, 3, state === "empty" ? "ghost" : "base");
    const tone = state === "error" ? "err" : state === "loading" ? "hi" : playing ? "ok" : "base";
    scene.rect(-54, -30, 54, 30, 3, "faint");
    if (state !== "empty") {
      scene.line([-54, -40, 3.05], [54, -40, 3.05], "faint", { bold: true });
      scene.line([-54, -40, 3.05], [-54 + 108 * bar, -40, 3.05], tone, { bold: true });
    }
    const r = 15 - p * 2 + (state === "error" ? shake * 0.2 : 0);
    if (state !== "empty") {
      scene.disc(0, 0, 3, r + 4, tone, { plate: true });
      const tri: Vec3[] = [facing(0, 0, 3, -r * 0.35, r * 0.55), facing(0, 0, 3, -r * 0.35, -r * 0.55), facing(0, 0, 3, r * 0.6, 0)];
      if (state === "success") scene.polyline(tri, "ok", { closed: true, bold: true });
      else if (state === "error") scene.cross(0, 0, 3, "err", ctx.fade());
      else scene.polyline(tri, tone, { closed: true, bold: true });
    }
    if (state === "empty") scene.polyline(faceArc(0, 0, 3, 16, 0, Math.PI * 2, 24), "ghost");
  },
});

/** A clapperboard snapping shut. Use for video rendering, editing and scene exports. */
export const clap = defineFigure({
  name: "Clap",
  label: "A clapperboard snapping shut",
  offset: 8,
  setup: ({ spring }) => ({ hinge: spring(0.5, 200, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let open = 0.5;
    if (state === "loading") open = 0.5 - 0.5 * smoothstep(ctx.loop(1.6) < 0.5 ? ctx.loop(1.6) * 2 : 2 - ctx.loop(1.6) * 2);
    if (state === "success") open = 0;
    if (state === "error") open = 0.2;
    if (state === "idle") open = 0.5 + ctx.hover * 0.2;
    const A = m.hinge.to(open).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";

    // The slate, lying flat.
    scene.box(0, 8, 0, 110, 70, 6, state === "empty" ? "ghost" : "base");
    for (let k = 0; k < 3; k++) scene.line([-38, -2 + k * 12, 6.05], [-14, -2 + k * 12, 6.05], "muted");
    // The clapstick, hinged at the back edge; its height and tilt follow `open`.
    const hingeY = -26, z0 = 6;
    const tilt = Math.cos(A), rise = 46 * tilt;
    const top = z0 + rise;
    const stick: Vec3[] = [[-50 + shake, hingeY, z0], [50 + shake, hingeY, z0], [50 + shake, hingeY, top], [-50 + shake, hingeY, top]];
    if (state !== "empty") {
      scene.panel(stick, state === "loading" ? "base" : ctx.verdict("base"));
      scene.polyline(stick, tone, { closed: true, bold: true });
      for (let k = 0; k < 4; k++) {
        const x = -40 + k * 26 + shake;
        scene.line([x, hingeY, z0 + rise * 0.15], [x + 12, hingeY, top - rise * 0.15], "muted");
      }
    } else scene.polyline(stick, "ghost", { closed: true });
    if (state === "success") scene.check(0, 14, 6, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 14, 6, "err", ctx.fade());
  },
});

/** A waveform with a playhead. Use for audio, podcasts, voice notes and sound levels. */
export const waveform = defineFigure({
  name: "Waveform",
  label: "A waveform with a moving playhead",
  offset: 6,
  setup: ({ spring }) => ({ heights: Array.from({ length: 24 }, (_, i) => spring(8 + 22 * Math.abs(Math.sin(i * 1.3)), 160, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const N = 24, span = 128, pitch = span / N, bar = (i: number) => -span / 2 + pitch * (i + 0.5);
    const head = state === "loading" ? ctx.loop(2.8) * N : state === "success" ? N : state === "empty" ? 0 : Math.max(0, Math.min(N, (g.x + span / 2) / pitch));
    scene.box(0, 0, 0, span + 14, 46, 4, "base");
    for (let i = 0; i < N; i++) {
      const base = 8 + 22 * Math.abs(Math.sin(i * 1.3));
      let h = base;
      if (state === "loading") h = base * (0.5 + 0.5 * Math.abs(Math.sin(ctx.time * 3 + i)));
      if (state === "idle") h += 6 * ctx.hover * falloff(bar(i) - g.x, 14);
      if (state === "error") h = i > N / 2 ? 2 : base;
      if (state === "empty") h = 2;
      const H = m.heights[i]!.to(h).value;
      const tone = state === "error" && i > N / 2 ? "err" : i < head ? (state === "success" ? "ok" : "hi") : "faint";
      scene.box(bar(i) + (state === "error" && i > N / 2 ? shake : 0), 0, 4, pitch * 0.5, pitch * 0.5, Math.max(0.5, H), tone);
    }
    if (state !== "empty") scene.line([bar(Math.min(N - 1, Math.floor(head))), -26, 4.1], [bar(Math.min(N - 1, Math.floor(head))), 26, 4.1], "base", { bold: true });
    if (state === "success") scene.check(0, 0, 40, "ok", ctx.fade());
  },
});

/** Photos spread into a grid, and one is picked. Use for galleries, photo uploads and media libraries. `count`: photos, 2–9. */
export const gallery = defineFigure({
  name: "Gallery",
  label: "Photos fanned into a grid with one picked",
  offset: 8,
  setup: ({ spring }) => ({ spread: spring(1, 130, 18), pick: spring(0, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(8);
    const n = ctx.count(6, 9, 2), cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), gap = 6;
    const cell = Math.min(34, 96 / cols), total = cell * cols + gap * (cols - 1);
    const at = (k: number) => {
      const c = k % cols, r = Math.floor(k / cols);
      return [-total / 2 + c * (cell + gap) + cell / 2, -(rows * (cell + gap)) / 2 + r * (cell + gap) + cell / 2] as const;
    };
    const spread = m.spread.to(state === "empty" ? 0 : 1).value;
    const picked = state === "success" || state === "error" ? 0 : state === "idle" ? Math.min(n - 1, Math.floor((g.x / total + 0.5) * n)) : state === "loading" ? Math.floor(ctx.loop(2.4) * n) % n : -1;
    const P = m.pick.to(state === "success" ? 1 : 0).value;

    scene.box(0, 0, 0, total + 14, rows * (cell + gap) + 10, 4, "base");
    for (let k = 0; k < n; k++) {
      const [x, y] = at(k), lifted = k === picked;
      const z = 6 + (lifted ? 12 + P * 6 : 0) + (lifted && state === "idle" ? ctx.hover * 6 : 0);
      const tone = state === "empty" ? "ghost"
        : state === "error" && k === 0 ? "err"
        : state === "success" && lifted ? "ok"
        : lifted ? (state === "loading" ? "hi" : "base") : "muted";
      const sx = state === "error" && k === 0 ? shake : 0;
      scene.box(x * spread + sx, y * spread, z * spread + (1 - spread) * 4, cell, cell, 3, tone);
      const mark: Vec3[] = [[x - cell * 0.3, y, z + 3.05], [x + cell * 0.05, y + cell * 0.1, z + 3.05], [x + cell * 0.3, y - cell * 0.1, z + 3.05]];
      scene.polyline(mark.map(([a, b, c]) => [a * spread + sx, b * spread, c] as Vec3), tone === "base" ? "muted" : tone);
    }
    if (state === "success") scene.check(0, 0, 40, "ok", ctx.fade());
    if (state === "error") scene.cross(at(0)[0] + shake, at(0)[1], 12, "err", ctx.fade());
  },
});

/** A record spinning on a turntable with its tone arm. Use for music, playlists, streaming and sound loading. */
export const vinyl = defineFigure({
  name: "Vinyl",
  label: "A record spinning on a turntable",
  offset: 4,
  setup: ({ spring }) => ({ arm: spring(-0.4, 120, 18), spin: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const armTarget = state === "idle" ? -0.4 + ctx.hover * 0.28 : state === "empty" ? -0.9 : state === "error" ? -0.7 : -0.4;
    const A = m.arm.to(armTarget).value;
    const rot = state === "loading" ? ctx.time * 3.2 : 0;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : "base";
    scene.box(0, 0, 0, 130, 100, 4, "base");
    scene.disc(0, 0, 4.05, 44, state === "empty" ? "ghost" : "base", { plate: true });
    for (let r = 40; r > 12; r -= 6) scene.disc(0, 0, 4.1, r, state === "empty" ? "ghost" : "faint");
    scene.disc(0, 0, 4.1, 14, tone, { plate: true });
    scene.line([Math.cos(rot) * 12, Math.sin(rot) * 12, 4.1], [Math.cos(rot) * 12 + 6, Math.sin(rot) * 12 + 6, 4.1], "faint");
    scene.disc(0, 0, 4.2, 3, tone, { fill: true });
    const px = 58 + shake * 0.3, py = -20;
    scene.cylinder(px, py, 4, 6, 8, "muted");
    scene.line([px, py, 12], [px - 34 * Math.cos(A), py - 34 * Math.sin(A) + 16, 12], tone, { bold: true });
    if (state === "success") scene.check(0, 0, 14, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 0, 14, "err", ctx.fade());
  },
});

/** A star rating being filled in. Use for ratings, reviews, scores and feedback. `count`: stars, 3–5. */
export const rating = defineFigure({
  name: "Rating",
  label: "A row of stars being filled",
  offset: 0,
  setup: ({ spring }) => ({ fill: Array.from({ length: 5 }, () => spring(0, 180, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const n = ctx.count(5, 5, 3), pitch = 30, x0 = -((n - 1) * pitch) / 2;
    const value = state === "success" ? n : state === "error" ? 1 : state === "empty" ? 0
      : state === "loading" ? ctx.progress(n + 1) * n : state === "idle" ? Math.max(1, Math.min(n, Math.round((g.x - x0) / pitch + 0.5))) : Math.ceil(n * 0.6);
    scene.box(0, 0, 0, pitch * n + 16, 36, 3, "base");
    for (let k = 0; k < n; k++) {
      const x = x0 + k * pitch, on = k < value;
      const F = m.fill[k]!.to(on ? 1 : 0).value;
      const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" && on && k === Math.floor(value) - 1 ? "hi" : "muted";
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 6.5 : 13;
        return facing(x + (state === "error" && k === 0 ? shake : 0), 0, 4, r * Math.cos(a), r * Math.sin(a));
      });
      scene.polyline(pts, tone, { closed: true });
      if (F > 0.02) scene.panel(pts.map(p => [p[0], p[1], p[2]] as Vec3), tone === "muted" ? "muted" : tone, F * 0.9);
    }
    if (state === "error") scene.cross(x0, 0, 20, "err", ctx.fade());
  },
});

/** A heart beating while a message is liked. Use for likes, favourites and reactions. */
export const like = defineFigure({
  name: "Like",
  label: "A heart beating",
  offset: 2,
  setup: ({ spring }) => ({ beat: spring(0, 220, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const pulse = state === "loading" ? 0.6 + 0.4 * Math.abs(Math.sin(ctx.time * 5)) : 0;
    const b = m.beat.to(state === "success" ? 1 : ctx.hover * 0.6 + pulse * 0.2).value;
    const size = 46 * (1 + b * 0.28);
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "empty" ? "ghost" : state === "loading" ? "hi" : "muted";
    scene.box(0, 0, 0, 100, 80, 3, "base");
    heart(scene, shake, 0, 10, size, tone, state === "empty" ? undefined : 1);
    if (state === "error") scene.cross(0, 0, 12, "err", ctx.fade());
    if (state === "success") scene.sparkle(42, -26, 30, 6, "ok", ctx.fade());
  },
});

/** A comment bubble with a reply thread. Use for comments, replies and discussion threads. */
export const thread = defineFigure({
  name: "Thread",
  label: "A comment with replies beneath",
  offset: 4,
  setup: ({ spring }) => ({ reply: spring(0, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const R = m.reply.to(state === "success" ? 1 : state === "idle" ? ctx.hover : 0).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : "base";
    scene.box(-18, -18, 4, 96, 30, 4, tone);
    scene.polyline([[-44, -10, 8], [-54, -2, 8], [-40, -8, 8]] as Vec3[], tone === "base" ? "muted" : tone, { bold: true });
    scene.line([-40, -20, 8.05], [14, -20, 8.05], "muted", { bold: true });
    scene.line([-40, -10, 8.05], [-6, -10, 8.05], "faint");
    scene.box(-4 + shake, 16 + R * 3, 4, 74, 24, 4, state === "empty" ? "ghost" : "muted");
    scene.line([-30 + shake, 12 + R * 3, 8.05], [26 + shake, 12 + R * 3, 8.05], "faint");
    scene.line([-30 + shake, 20 + R * 3, 8.05], [6 + shake, 20 + R * 3, 8.05], "faint");
    if (state === "loading") for (let k = 0; k < 3; k++) scene.disc(-14 + k * 10, -18, 8.1, 2.4, Math.floor(ctx.time * 4) % 3 === k ? "hi" : "muted", { fill: true });
    if (state === "success") scene.check(40, 16, 8, "ok", ctx.fade());
    if (state === "error") scene.cross(40, 16, 8, "err", ctx.fade());
  },
});

/** A live stream: an antenna sending waves toward a screen. Use for live streams, broadcasts and real-time status. */
export const live = defineFigure({
  name: "Live",
  label: "An antenna sending waves to a screen",
  offset: 4,
  setup: ({ spring }) => ({ tilt: spring(0, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const tilt = m.tilt.to(state === "idle" ? (ctx.pointer.x / 140) * 0.25 * ctx.hover : 0).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "empty" ? "ghost" : "base";
    scene.box(0, 14, 0, 110, 66, 4, "base");
    scene.box(-18, 12, 4, 54, 40, 4, tone);
    scene.rect(-20, 12, 0, 16, 8.05, tone === "base" ? "muted" : tone);
    scene.line([44, -10, 4], [44 + 14 * Math.sin(tilt) + shake, -10, 44 + 14 * Math.cos(tilt)], state === "loading" ? "hi" : "base", { bold: true });
    scene.disc(44 + 14 * Math.sin(tilt) + shake, -10, 44 + 14 * Math.cos(tilt), 3, "hi", { fill: true });
    if (state === "loading") for (let k = 0; k < 3; k++) {
      const q = ctx.loop(1.6) + k / 3;
      const r = 14 + 26 * (q % 1);
      scene.arc(44, -10, 14 + 14 * Math.cos(tilt), r, -0.9, 0.9, "hi", { opacity: 1 - (q % 1) });
    }
    if (state === "success") scene.check(-18, 12, 12, "ok", ctx.fade());
    if (state === "error") scene.cross(-18, 12, 12, "err", ctx.fade());
  },
});
