import { defineFigure } from "../../core/define";
import { clamp, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { faceArc, facing, frontArc } from "../shapes";

const TAU = Math.PI * 2;

/** The television: its body, and the plane of its screen (the y+ face). */
const TV = { y: -6, w: 116, d: 8, z: 18, h: 64 };
const TV_FACE = TV.y + TV.d / 2;
/** The paused frame on the screen: hills under a sun, as (u, z) points. */
const HILLS: [number, number][] = [[-50, 40], [-32, 56], [-18, 46], [2, 66], [24, 46], [36, 52], [50, 44]];

/** A video frame with a play button that is pressed. Use for video players, reels and watch actions. */
export const play = /*#__PURE__*/ defineFigure({
  name: "Play",
  label: "A video frame with a play button",
  offset: 14,
  setup: ({ spring }) => ({ press: spring(0, 200, 18), progress: spring(0), picture: spring(0, 140, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let frac = 0, spin = 0;
    if (state === "loading") { frac = ctx.progress(4); spin = ctx.loop(1.1) * TAU; }
    if (state === "success") frac = 1;
    if (state === "error") frac = 0.3;
    const bar = m.progress.to(frac).value;
    // 0: the button stands out; 1: pressed flush; past 1 it sinks away while the video plays.
    const press = m.press.to(state === "loading" ? 1 : state === "success" ? 1.6 : state === "idle" ? ctx.hover * 0.6 : 0).value;
    const pic = m.picture.to(state === "success" ? 1 : 0).value;
    const on = (u: number, z: number, f = 0.05): Vec3 => [u + shake, TV_FACE + f, z];
    const tone: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();

    scene.box(0, 0, 0, 136, 76, 4, "base");
    const body: Tone = empty ? "ghost" : "base";
    // The stand: a foot and a neck, then the set with its bezel and glass.
    scene.box(0, TV.y, 4, 56, 26, 3, body);
    scene.box(0, TV.y, 7, 12, 5, TV.z - 7, body);
    scene.box(shake, TV.y, TV.z, TV.w, TV.d, TV.h, body);
    const z0 = TV.z + 5, z1 = TV.z + TV.h - 5, cz = 52;
    scene.polyline([on(-53, z0), on(53, z0), on(53, z1), on(-53, z1)], empty ? "ghost" : "muted", { closed: true });
    if (empty) {
      scene.polyline(frontArc(0, TV_FACE + 0.1, cz, 13, 0, TAU, 24), "ghost");
      return;
    }

    // The frame: hills and a sun. Paused it is faint; playing it comes up in full.
    const pz = (z: number) => z + 2;
    if (state === "error") {
      // The picture tears: the right half slips down and sideways, with static across it.
      const left = HILLS.filter(([u]) => u <= 2), right = HILLS.filter(([u]) => u >= 2);
      scene.polyline(left.map(([u, z]) => on(u, pz(z))), "err");
      scene.polyline(right.map(([u, z]) => on(u + 6, pz(z) - 9)), "err");
      for (let k = 0; k < 3; k++) scene.line(on(-46 + k * 9, 70 - k * 13), on(-12 + k * 22, 70 - k * 13), "err", { opacity: 0.5 });
    } else {
      const ptone: Tone = pic > 0.5 ? "ok" : "faint";
      scene.polyline(HILLS.map(([u, z]) => on(u, pz(z))), ptone, { bold: pic > 0.5 });
      scene.polyline(frontArc(36, TV_FACE + 0.05, 70, 4, 0, TAU, 14).map(([x, y, z]) => [x + shake, y, z] as Vec3), ptone);
    }

    // The scrub bar along the bottom of the glass, with its knob at the play position.
    const bz = z0 + 4, bx = -48 + 96 * clamp(bar);
    scene.line(on(-48, bz), on(48, bz), "faint", { bold: true });
    if (bar > 0.01) scene.line(on(-48, bz), on(bx, bz), tone === "base" ? "muted" : tone, { bold: true });
    scene.panel(frontArc(bx + shake, TV_FACE + 1.2, bz, 2.6, 0, TAU, 12), tone);

    // The play button stands proud of the glass; pressed, it sinks flush, and while playing it is gone.
    const gone = clamp((press - 1) / 0.5);
    if (gone < 0.98) {
      const depth = 3.5 * (1 - clamp(press)), op = 1 - gone;
      const f = TV_FACE + 0.1;
      scene.panel(frontArc(shake, f, cz, 14, 0, TAU, 28), "base", op);
      scene.panel(frontArc(shake, f + depth, cz, 13, 0, TAU, 28), tone, op);
      scene.panel([on(-4, cz + 7, depth + 0.2), on(-4, cz - 7, depth + 0.2), on(8, cz, depth + 0.2)], tone, op);
    }
    if (state === "loading") {
      // Buffering: a turning ring around the pressed button.
      scene.polyline(frontArc(0, TV_FACE + 0.2, cz, 17.5, spin, spin + 4.2, 20), "hi", { bold: true });
    }
  },
});

/** The clapperboard stands on the plate facing lower right; (u, z) run across and up its face. */
const SLATE = { x: 8, t: 8, w: 84, h: 50 };
const SLATE_FACE = SLATE.x + SLATE.t / 2;
const HINGE = { u: -SLATE.w / 2 + 2, z: 4 + SLATE.h + 10 };

/** A clapperboard snapping shut. Use for video rendering, editing and scene exports. */
export const clap = /*#__PURE__*/ defineFigure({
  name: "Clap",
  label: "A clapperboard snapping shut",
  offset: 24,
  setup: ({ spring }) => ({ hinge: spring(0.42, 200, 18), slip: spring(0, 140, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let open = 0.42 + ctx.hover * 0.14;
    if (state === "loading") {
      const q = ctx.loop(1.4);
      open = q < 0.55 ? 0.55 * smoothstep(q / 0.55) : 0.55 * (1 - smoothstep((q - 0.55) / 0.12));
      m.hinge.set(open);
    }
    if (state === "success" || empty) open = 0;
    if (state === "error") open = -0.78;
    const A = m.hinge.to(open).value;
    const S = m.slip.to(state === "error" ? 1 : 0).value;
    const on = (u: number, z: number, f = 0.05): Vec3 => [SLATE_FACE + f, -u, z];
    const board: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    const stickTone: Tone = empty ? "ghost" : state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();

    scene.box(10, 4, 0, 66, 112, 4, "base");
    // The slate and the fixed striped bar along its top.
    scene.box(SLATE.x, 0, 4, SLATE.t, SLATE.w, SLATE.h, board);
    scene.box(SLATE.x, 0, 4 + SLATE.h, SLATE.t, SLATE.w, 10, board);
    if (!empty) {
      const bz0 = 4 + SLATE.h, bz1 = bz0 + 10;
      for (let k = 0; k < 5; k++) {
        const u = -SLATE.w / 2 + 6 + k * 16;
        scene.polyline([on(u, bz0), on(u + 8, bz0), on(u + 14, bz1), on(u + 6, bz1)], "muted", { closed: true });
      }
      // The slate's fields: two rules, a divider and the lines written in them.
      const L = -SLATE.w / 2 + 4, R = SLATE.w / 2 - 4;
      scene.line(on(L, 40), on(R, 40), "muted");
      scene.line(on(L, 24), on(R, 24), "muted");
      scene.line(on(2, 24), on(2, 40), "muted");
      scene.line(on(L + 4, 48), on(L + 34, 48), board === "ok" ? "ok" : "base", { bold: true });
      scene.line(on(L + 4, 32), on(-12, 32), "faint");
      scene.line(on(8, 32), on(30, 32), "faint");
      scene.line(on(L + 4, 14), on(10, 14), "faint");
    }

    // The clapstick, hinged at the left end. On error it comes off its pin and hangs across the slate.
    const ca = Math.cos(A), sa = Math.sin(A), len = SLATE.w - 2, th = 10;
    const hu = HINGE.u + shake * 0.3, hz = HINGE.z;
    const sp = (a: number, b: number): [number, number] => [hu + a * ca - b * sa, hz + a * sa + b * ca];
    const front = SLATE_FACE + S * 6, back = front - SLATE.t;
    const P = (a: number, b: number, x: number): Vec3 => { const [u, z] = sp(a, b); return [x, -u, z]; };
    if (empty) {
      scene.polyline([P(0, 0, front), P(len, 0, front), P(len, th, front), P(0, th, front)], "ghost", { closed: true });
      return;
    }
    // Its top edge, then its face with the stripes running the other way.
    scene.panel([P(0, th, back), P(len, th, back), P(len, th, front), P(0, th, front)], stickTone);
    scene.panel([P(0, 0, front), P(len, 0, front), P(len, th, front), P(0, th, front)], stickTone);
    for (let k = 0; k < 5; k++) {
      const a = 6 + k * 16;
      scene.polyline([P(a + 6, 0, front + 0.05), P(a + 14, 0, front + 0.05), P(a + 8, th, front + 0.05), P(a, th, front + 0.05)],
        stickTone === "base" ? "muted" : stickTone, { closed: true });
    }
    // The hinge pin.
    const pin = Array.from({ length: 13 }, (_, k) => {
      const a = (k / 12) * TAU;
      return [front + 0.1, -(HINGE.u + 3 * Math.cos(a)), HINGE.z + 4 + 3 * Math.sin(a)] as Vec3;
    });
    scene.panel(pin, state === "error" ? "err" : "muted");
  },
});

/** The recorder: a phone standing square to the viewer; (u, v) run across and up its face in pixels. */
const REC = { a: 44, b: 76, r: 13, t: 3.5 };
/** The waveform's bars across the screen, mirrored about the line v. */
const WAVE = { n: 19, l: -33, r: 33, v: 86 };
const waveHeight = (i: number) => 2.5 + 19 * Math.abs(Math.sin(i * 1.3)) * (0.45 + 0.55 * Math.sin(i * 0.37 + 0.4) ** 2);

/** A rounded rectangle centred on (cu, cv) with half sizes a and b, clockwise from the top right, in (u, v). */
function roundRect(cu: number, cv: number, a: number, b: number, r: number, steps = 3): [number, number][] {
  const out: [number, number][] = [];
  const corners: [number, number, number][] = [[a - r, b - r, Math.PI / 2], [a - r, -b + r, 0], [-a + r, -b + r, -Math.PI / 2], [-a + r, b - r, Math.PI]];
  for (const [x, y, a0] of corners) for (let i = 0; i <= steps; i++) {
    const t = a0 - (Math.PI / 2) * (i / steps);
    out.push([cu + x + r * Math.cos(t), cv + y + r * Math.sin(t)]);
  }
  return out;
}

/** A voice recorder with a waveform and a record button. Use for audio, podcasts, voice notes and sound levels. */
export const waveform = /*#__PURE__*/ defineFigure({
  name: "Waveform",
  label: "A voice recorder showing a waveform with a playhead and a record button",
  offset: 22,
  setup: ({ spring }) => ({
    heights: Array.from({ length: WAVE.n }, (_, i) => spring(waveHeight(i), 160, 16)),
    head: spring(0.45, 120, 18),
    stop: spring(0, 180, 18),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), empty = state === "empty";
    const N = WAVE.n, pitch = (WAVE.r - WAVE.l) / N, bu = (i: number) => WAVE.l + pitch * (i + 0.5);
    // Recording scrolls the wave to the left past a fixed playhead; elsewhere the head sits on a finished take.
    let head = 0.45, scroll = 0;
    if (state === "loading") { head = 0.72; scroll = Math.floor(ctx.time * 7); m.head.set(head); }
    if (state === "success") head = 1;
    if (state === "error") head = 0.55;
    if (state === "empty") head = 0;
    if (state === "idle") head += ctx.hover * clamp((ctx.pointer.x - WAVE.l) / (WAVE.r - WAVE.l) - head, -0.3, 0.3);
    const H = clamp(m.head.to(head).value);
    const S = clamp(m.stop.to(state === "loading" ? 1 : 0).value);
    const at = (u: number, v: number, d = 0): Vec3 => { const p = facing(shake * 0.6, 0, 4, u, v); return [p[0] + d, p[1] + d, p[2]]; };
    const shape = (pts: [number, number][], d: number): Vec3[] => pts.map(([u, v]) => at(u, v, d));

    scene.box(0, 0, 0, 104, 104, 4, "base");
    // The body: its back layer, then the face, the screen's edge, the speaker slot and the camera.
    const body = roundRect(0, REC.b, REC.a, REC.b, REC.r);
    if (empty) {
      scene.panel(shape(body, 0), "ghost");
      scene.line(at(WAVE.l, WAVE.v, 0.1), at(WAVE.r, WAVE.v, 0.1), "ghost");
      scene.polyline(faceArc(...at(0, 30, 0.1), 11, 0, TAU, 20), "ghost");
      return;
    }
    scene.panel(shape(body, -REC.t), "base");
    scene.panel(shape(body, 0), "base");
    scene.polyline(shape(roundRect(0, REC.b + 2, REC.a - 5, REC.b - 9, REC.r - 5), 0.05), "faint", { closed: true });
    scene.line(at(-9, 2 * REC.b - 4.5, 0.05), at(9, 2 * REC.b - 4.5, 0.05), "muted", { bold: true });

    // The timer at the top: a bold line that grows while recording.
    const live = state === "loading";
    const ink: Tone = live ? "hi" : state === "idle" ? "muted" : ctx.verdict("muted");
    scene.line(at(-16, 130, 0.1), at(live ? -16 + 32 * (0.5 + 0.5 * ((scroll % 20) / 20)) : 16, 130, 0.1), ink, { bold: true });
    scene.line(at(WAVE.l, 116, 0.1), at(WAVE.r, 116, 0.1), "faint");
    scene.line(at(WAVE.l, 56, 0.1), at(WAVE.r, 56, 0.1), "faint");

    // The waveform: bars mirrored about the centre line; those past the playhead are still to come.
    const hu = lerp(WAVE.l, WAVE.r, H);
    for (let i = 0; i < N; i++) {
      const done = bu(i) <= hu + 0.5;
      let h = waveHeight(i);
      if (live) {
        h = done ? waveHeight(i + scroll) : 0.6;
        m.heights[i]!.set(h);
      }
      if (state === "error" && !done) h = 0.6;
      if (state === "idle" && !done) h *= 0.85;
      const Hh = Math.max(0.6, m.heights[i]!.to(h).value);
      const tone: Tone = !done ? (state === "error" ? "err" : "faint")
        : live ? (bu(i) > hu - pitch * 3 ? "hi" : "base") : state === "idle" ? "base" : ctx.verdict();
      scene.line(at(bu(i), WAVE.v - Hh, 0.1), at(bu(i), WAVE.v + Hh, 0.1), tone, { bold: true });
    }
    if (state === "error") scene.line(at(hu, WAVE.v, 0.1), at(WAVE.r, WAVE.v, 0.1), "err", { bold: true, opacity: ctx.fade(0.4) });
    // The playhead: a line through the wave with a knob on top.
    const pt: Tone = live ? "hi" : state === "idle" ? "base" : ctx.verdict();
    scene.line(at(hu, 60, 0.15), at(hu, 110, 0.15), pt);
    scene.panel(faceArc(...at(hu, 112, 0.15), 3, 0, TAU, 10), pt);

    // The record button in its ring: a round dot, a rounded square while recording, a play arrow once saved.
    const bt: Tone = live ? "hi" : state === "error" ? "err" : "base";
    scene.polyline(faceArc(...at(0, 30, 0.05), 14, 0, TAU, 24), "muted");
    if (state === "success") {
      const tri: [number, number][] = [[-5, -8], [9, 0], [-5, 8]];
      scene.panel(tri.map(([u, v]) => at(u, 30 + v, -1.2)), bt);
      scene.panel(tri.map(([u, v]) => at(u, 30 + v, 0.2)), bt);
    } else {
      const dot = Array.from({ length: 24 }, (_, k): [number, number] => {
        const a = (k / 24) * TAU, c = Math.cos(a), s = Math.sin(a);
        const sq = 7 / Math.max(Math.abs(c), Math.abs(s)) ** 0.35;
        const r = lerp(10, Math.min(sq, 8.6), S);
        return [r * c, 30 + r * s];
      });
      scene.panel(shape(dot, -1.5), bt);
      scene.panel(shape(dot, 0.2), bt);
    }
  },
});

/** The gallery wall stands square to the viewer on the plate's diagonal; (u, v) run across and up it in pixels. */
const WALL = { a: 114, h: 124, t: 4, top: 110, bottom: 20 };
/** How a frame sits: its centre, size, scale, turn about its nail, how far it stands out, and its drop. */
interface Hang { cu: number; cv: number; w: number; h: number; s: number; rot: number; d: number; drop: number }

/** One framed photo: frame, mat and a picture of hills under a sun; `crack` breaks its glass. */
function frame(scene: Scene, f: Hang, tone: Tone, crack = 0): void {
  const nail: [number, number] = [f.cu, f.cv + f.h / 2];
  const c = Math.cos(f.rot), s = Math.sin(f.rot);
  const P = (u: number, v: number, d = 0): Vec3 => {
    const du = (u - nail[0]) * f.s, dv = (v - nail[1]) * f.s;
    const p = facing(0, 0, 4, nail[0] + du * c - dv * s, nail[1] + du * s + dv * c - f.drop);
    return [p[0] + f.d + d, p[1] + f.d + d, p[2]];
  };
  const box = (inset: number, d: number): Vec3[] => {
    const a = f.w / 2 - inset, b = f.h / 2 - inset;
    return [P(f.cu - a, f.cv - b, d), P(f.cu + a, f.cv - b, d), P(f.cu + a, f.cv + b, d), P(f.cu - a, f.cv + b, d)];
  };
  if (tone === "ghost") { scene.panel(box(0, 0), "ghost"); return; }
  scene.panel(box(0, -3), tone);
  scene.panel(box(0, 0), tone);
  const ink: Tone = tone === "base" ? "muted" : tone;
  scene.polyline(box(4, 0.05), ink, { closed: true });
  // The picture inside the mat: a ridge of hills and the sun.
  const a = f.w / 2 - 8, b = f.h / 2 - 8;
  const q = (x: number, y: number): Vec3 => P(f.cu + a * x, f.cv + b * y, 0.1);
  scene.polyline([q(-1, -0.45), q(-0.45, 0.25), q(-0.1, -0.2), q(0.35, 0.45), q(1, -0.35)], ink);
  scene.polyline(Array.from({ length: 11 }, (_, k) => {
    const t = (k / 10) * TAU, r = Math.min(a, b) * 0.22;
    return P(f.cu + a * 0.55 + r * Math.cos(t), f.cv + b * 0.55 + r * Math.sin(t), 0.1);
  }), ink);
  if (crack > 0.02) {
    scene.polyline([q(-0.9, 0.8), q(-0.35, 0.2), q(-0.05, 0.45), q(0.3, -0.2), q(0.75, -0.85)], "err", { bold: true, opacity: crack });
  }
}

/** Framed photos on a wall, and one is picked. Use for galleries, photo uploads and media libraries. `count`: photos, 2–9. */
export const gallery = /*#__PURE__*/ defineFigure({
  name: "Gallery",
  label: "Framed photos hanging on a wall, one picked",
  offset: 10,
  setup: ({ spring }) => ({ pick: spring(0, 150, 18), lift: spring(0, 160, 18), fall: spring(0, 90, 12) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(6, 9, 2), cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols);
    const gu = 14, gv = rows === 3 ? 8 : 12;
    const w = cols === 2 ? 70 : 54, h = Math.min(56, (WALL.top - WALL.bottom - gv * (rows - 1)) / rows);
    const totalW = w * cols + gu * (cols - 1), totalH = h * rows + gv * (rows - 1);
    const mid = (WALL.top + WALL.bottom) / 2;
    const at = (k: number): [number, number] => {
      const c = k % cols, r = Math.floor(k / cols);
      // The last row is centred when it is short.
      const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      const rowW = w * inRow + gu * (inRow - 1);
      return [-rowW / 2 + c * (w + gu) + w / 2, mid + totalH / 2 - r * (h + gv) - h / 2];
    };
    const empty = state === "empty";
    let picked = -1;
    if (state === "idle") {
      const v = -ctx.pointer.y - 4;
      picked = clamp(Math.floor((ctx.pointer.x + totalW / 2) / (w + gu)), 0, cols - 1) + cols * clamp(Math.floor((mid + totalH / 2 - v) / (h + gv)), 0, rows - 1);
    }
    if (state === "loading") picked = Math.floor(ctx.loop(2.4) * n) % n;
    if (state === "success" || state === "error") picked = Math.min(n - 1, cols + 1 < n ? cols + 1 : 0);
    picked = Math.min(picked, n - 1);
    const P = clamp(m.pick.to(state === "success" ? 1 : 0).value, 0, 1.2);
    const L = m.lift.to(state === "loading" ? 1 : state === "idle" ? ctx.hover : 0).value;
    const D = clamp(m.fall.to(state === "error" ? 1 : 0).value, 0, 1.1);

    // The floor and the wall, with a picture rail near the top and a skirting board at the foot.
    scene.box(4, 4, 0, 134, 134, 4, "base");
    const W = (u: number, v: number, d = 0): Vec3 => { const p = facing(0, 0, 4, u, v); return [p[0] + d, p[1] + d, p[2]]; };
    const wall = (d: number) => [W(-WALL.a, 0, d), W(WALL.a, 0, d), W(WALL.a, WALL.h, d), W(-WALL.a, WALL.h, d)];
    if (empty) {
      scene.panel(wall(0), "ghost");
      for (let k = 0; k < n; k++) { const [cu, cv] = at(k); frame(scene, { cu, cv, w, h, s: 1, rot: 0, d: 0.2, drop: 0 }, "ghost"); }
      return;
    }
    scene.panel(wall(-WALL.t), "base");
    scene.panel(wall(0), "base");
    scene.line(W(-WALL.a, WALL.h - 8, 0.05), W(WALL.a, WALL.h - 8, 0.05), "faint");
    scene.line(W(-WALL.a, 8, 0.05), W(WALL.a, 8, 0.05), "muted");

    for (let k = 0; k < n; k++) {
      const [cu, cv] = at(k);
      const hang: Hang = { cu, cv, w, h, s: 1, rot: 0, d: 0.2, drop: 0 };
      if (k !== picked) { frame(scene, hang, "base"); continue; }
      if (state === "error" || D > 0.02) {
        // It slips off its nail, turns, drops to the floor and leans there with its glass cracked.
        const t = clamp(D);
        scene.polyline([W(cu - w / 2, cv - h / 2, 0.05), W(cu + w / 2, cv - h / 2, 0.05), W(cu + w / 2, cv + h / 2, 0.05), W(cu - w / 2, cv + h / 2, 0.05)], "faint", { closed: true, opacity: t });
        scene.disc(...W(cu, cv + h / 2 + 3, 0.3), 1.2, "muted", { fill: true });
        const floor = cv - h / 2 - 2;
        frame(scene, { ...hang, cu: cu + shake, rot: -0.2 * t, d: 0.2 + 7 * t, drop: floor * smoothstep(t) }, state === "error" ? "err" : "base", t);
        continue;
      }
      // Picked: it comes forward off the wall and grows.
      const lift = Math.max(P, 0.35 * L);
      const tone: Tone = state === "success" ? "ok" : state === "loading" ? "hi" : "base";
      frame(scene, { ...hang, s: 1 + 0.22 * lift, d: 0.2 + 9 * lift, drop: -6 * lift }, tone);
    }
  },
});

/** The turntable: a plinth, a platter with the record, and the tone arm pivoting at the back right. */
const DECK = { top: 16, cx: -12, cy: 4, r: 38 };
const PIVOT = { x: 42, y: -30, z: 30 };
const ARM = 50;

/** A record spinning on a turntable with its tone arm. Use for music, playlists, streaming and sound loading. */
export const vinyl = /*#__PURE__*/ defineFigure({
  name: "Vinyl",
  label: "A record spinning on a turntable",
  offset: 14,
  setup: ({ spring }) => ({ arm: spring(Math.PI / 2, 120, 18), drop: spring(0, 140, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let phi = Math.PI / 2 + ctx.hover * 0.22, down = 0, rot = 0.6;
    if (state === "loading") { phi = 2.02; down = 1; rot = ctx.time * 3.2; }
    if (state === "success") { phi = 2.2; down = 1; }
    if (state === "error") { phi = 1.8; down = -1; }
    const A = m.arm.to(phi).value, D = m.drop.to(down).value;
    const arm: Tone = state === "loading" ? "hi" : state === "idle" || empty ? "base" : ctx.verdict();
    const recZ = DECK.top + 4;

    scene.box(0, 0, 0, 140, 112, 4, "base");
    scene.box(0, 0, 4, 120, 96, 12, empty ? "ghost" : "base");
    // On the plinth: the start button and the speed knob at the front left, the arm rest at the right.
    scene.box(-44, 38, DECK.top, 12, 8, 2, "muted");
    scene.cylinder(-24, 40, DECK.top, 4, 3, "muted");
    scene.cylinder(50, 18, DECK.top, 2, 10, "muted");
    // The platter and the record on it.
    scene.cylinder(DECK.cx, DECK.cy, DECK.top, DECK.r + 3, 4, empty ? "ghost" : "base");
    if (empty) scene.disc(DECK.cx, DECK.cy, recZ + 0.05, DECK.r - 2, "ghost");
    else {
      scene.disc(DECK.cx, DECK.cy, recZ + 0.05, DECK.r, "base", { plate: true });
      for (const r of [33, 27, 21]) scene.disc(DECK.cx, DECK.cy, recZ + 0.1, r, "faint");
      const label: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : "muted";
      scene.disc(DECK.cx, DECK.cy, recZ + 0.15, 12, label, { plate: true });
      scene.line([DECK.cx + Math.cos(rot) * 4, DECK.cy + Math.sin(rot) * 4, recZ + 0.2], [DECK.cx + Math.cos(rot) * 10, DECK.cy + Math.sin(rot) * 10, recZ + 0.2], label);
      if (state === "loading") scene.arc(DECK.cx, DECK.cy, recZ + 0.2, 30, rot, rot + 1.1, "hi", { bold: true });
      if (state === "error") {
        // The needle skidded: a scratch across the grooves.
        scene.polyline([[DECK.cx + 8, DECK.cy - 32, recZ + 0.2], [DECK.cx + 14, DECK.cy - 16, recZ + 0.2], [DECK.cx + 26, DECK.cy - 8, recZ + 0.2]], "err", { bold: true, opacity: ctx.fade() });
      }
    }
    scene.disc(DECK.cx, DECK.cy, recZ + 0.3, 1.6, "base", { fill: true });

    // The tone arm: base, post, counterweight behind the pivot, a bent arm and the headshell.
    const px = PIVOT.x + shake * 0.3;
    scene.cylinder(px, PIVOT.y, DECK.top, 9, 3, empty ? "ghost" : "base");
    scene.cylinder(px, PIVOT.y, DECK.top + 3, 3, PIVOT.z - DECK.top - 3, empty ? "ghost" : "base");
    const c = Math.cos(A), s = Math.sin(A);
    const endZ = lerp(PIVOT.z - 2, recZ + 3, clamp(D)) + Math.max(0, -D) * 14;
    const along = (t: number, side = 0, z = PIVOT.z): Vec3 => [px + c * t - s * side, PIVOT.y + s * t + c * side, z];
    scene.cylinder(px - c * 10, PIVOT.y - s * 10, PIVOT.z - 3, 4, 6, empty ? "ghost" : "muted");
    const tip = along(ARM, 0, endZ);
    scene.polyline([along(-6), along(ARM * 0.55, -4, lerp(PIVOT.z, endZ, 0.55)), along(ARM - 8, 0, lerp(PIVOT.z, endZ, 0.85)), tip], arm, { bold: true });
    scene.panel([along(ARM - 4, -4, endZ + 0.2), along(ARM + 4, -2, endZ), along(ARM + 4, 4, endZ), along(ARM - 4, 4, endZ + 0.2)], arm);
  },
});


/** The review card faces the viewer, its bottom edge (v = 18) on the plate; (u, v) run across and up its face. */
const card = (u: number, v: number, front = 0): Vec3 => {
  const p = facing(0, 0, -14, u, v);
  return [p[0] + front, p[1] + front, p[2]];
};
const STAR = { v: 64, pitch: 22, R: 9.5, r: 4 };
const starPts = (cu: number, cv: number, s = 1): [number, number][] =>
  Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i * Math.PI) / 5, r = (i % 2 ? STAR.r : STAR.R) * s;
    return [cu + r * Math.cos(a), cv + r * Math.sin(a)];
  });

/** A star rating being filled in. Use for ratings, reviews, scores and feedback. `count`: stars, 3–5. */
export const rating = /*#__PURE__*/ defineFigure({
  name: "Rating",
  label: "A row of stars being filled",
  offset: 25,
  setup: ({ spring }) => ({ fill: Array.from({ length: 5 }, () => spring(0, 180, 16)), drop: spring(0, 120, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const n = ctx.count(5, 5, 3), u0 = -((n - 1) * STAR.pitch) / 2;
    let value = Math.ceil(n * 0.6);
    if (state === "success") value = n;
    if (state === "error") value = 1;
    if (state === "empty") value = 0;
    if (state === "loading") value = ctx.progress(n + 1) * n;
    if (state === "idle" && ctx.hover > 0.05) value = clamp(Math.round((ctx.pointer.x - u0) / STAR.pitch + 0.5), 1, n);
    const D = m.drop.to(state === "error" ? 1 : 0).value;

    scene.box(-4, -2, 0, 124, 96, 4, "base");
    // The card stands in the slot of a holder: the holder's top, the card's back and face, then the holder's front.
    const body: Tone = empty ? "ghost" : "base";
    const H = 25, W = 68;
    scene.panel([card(-W, H, -8), card(W, H, -8), card(W, H, 8), card(-W, H, 8)], body);
    if (!empty) scene.panel([card(-62, 18, -4), card(62, 18, -4), card(62, 104, -4), card(-62, 104, -4)], "base");
    scene.panel([card(-62, 18), card(62, 18), card(62, 104), card(-62, 104)], state === "success" ? "ok" : body);
    scene.panel([card(-W, H, 0.3), card(W, H, 0.3), card(W, H, 8), card(-W, H, 8)], body);
    scene.panel([card(-W, 18, 8), card(W, 18, 8), card(W, H, 8), card(-W, H, 8)], body);
    if (empty) {
      scene.polyline(starPts(0, STAR.v).map(([u, v]) => card(u, v, 0.2)), "ghost", { closed: true });
      return;
    }
    const av = Array.from({ length: 16 }, (_, k) => card(-48 + 7 * Math.cos((k / 16) * TAU), 90 + 7 * Math.sin((k / 16) * TAU), 0.2));
    scene.polyline(av, "muted", { closed: true });
    scene.line(card(-36, 93, 0.2), card(-6, 93, 0.2), "base", { bold: true });
    scene.line(card(-36, 86, 0.2), card(-18, 86, 0.2), "faint");
    scene.line(card(-50, 42, 0.2), card(50, 42, 0.2), "faint");
    scene.line(card(-50, 33, 0.2), card(22, 33, 0.2), "faint");

    for (let k = 0; k < n; k++) {
      const on = k < value, current = state === "loading" && on && k === Math.ceil(value) - 1;
      const F = m.fill[k]!.to(on ? 1 : 0).value;
      const cu = u0 + k * STAR.pitch;
      const tone: Tone = state === "success" ? "ok" : state === "error" && k === 0 ? "err" : current ? "hi" : "base";
      if (state === "error" && k === 1) {
        // The second star would not take: it falls off the card and lies on the plate.
        const lie = (u: number, v: number): Vec3 => {
          const up = card(u + shake, v, 0.2), fu = (u - cu) / Math.sqrt(3), fv = v - STAR.v;
          const flat: Vec3 = [cu / Math.sqrt(3) + 26 + fu - fv * 0.5, -cu / Math.sqrt(3) + 30 - fu - fv * 0.5, 4.05];
          return [lerp(up[0], flat[0], D), lerp(up[1], flat[1], D), lerp(up[2], flat[2], D)];
        };
        scene.polyline(starPts(cu, STAR.v).map(([u, v]) => card(u, v, 0.2)), "faint", { closed: true });
        scene.panel(starPts(cu, STAR.v).map(([u, v]) => lie(u, v)), "err");
        continue;
      }
      // An unset star is a faint outline on the card; a set one stands out of it, layer on layer.
      scene.polyline(starPts(cu, STAR.v).map(([u, v]) => card(u, v, 0.2)), "faint", { closed: true });
      if (F < 0.03) continue;
      const depth = 4 * F;
      scene.panel(starPts(cu, STAR.v).map(([u, v]) => card(u, v, 0.3 + depth * 0.5)), tone);
      scene.panel(starPts(cu, STAR.v).map(([u, v]) => card(u, v, 0.4 + depth)), tone);
      scene.polyline(starPts(cu, STAR.v, 0.5).map(([u, v]) => card(u, v, 0.5 + depth)), tone === "base" ? "muted" : tone);
    }
  },
});

/** The heart stands on its point on a pedestal, its face on the y+ plane; it is three layers thick. */
const LIKE = { y: 4, k: 2.1, base: 14 };
const heartAt = (t: number): [number, number] => [
  16 * Math.sin(t) ** 3,
  13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
];
/** The crack that splits the heart, top notch to bottom point. */
const CRACK: [number, number][] = [[0, 5], [2.4, 1], [-2, -3.5], [2.2, -8], [-1.2, -12.5], [0, -17]];

/** A heart beating while a message is liked. Use for likes, favourites and reactions. */
export const like = /*#__PURE__*/ defineFigure({
  name: "Like",
  label: "A heart beating",
  offset: 18,
  setup: ({ spring }) => ({ beat: spring(0, 220, 14), split: spring(0, 120, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const pulse = state === "loading" ? Math.abs(Math.sin(ctx.time * 5)) ** 3 : 0;
    const b = m.beat.to(state === "success" ? 1 : state === "idle" ? ctx.hover * 0.35 : pulse * 0.6).value;
    const S = m.split.to(state === "error" ? 1 : 0).value;
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();
    const k = LIKE.k * (1 + b * 0.18);
    const tipZ = 4 + LIKE.base + 2;
    // A heart point (u, v) on the layer `f` units in front of the face; halves turn about the tip.
    const pt = (u: number, v: number, f: number, side = 0): Vec3 => {
      const a = side * S * 0.32, du = u * k, dv = (v + 17) * k;
      const ru = du * Math.cos(a) + dv * Math.sin(a) + side * S * 6, rv = -du * Math.sin(a) + dv * Math.cos(a);
      return [ru + shake, LIKE.y + f, tipZ + rv];
    };

    scene.box(0, 0, 0, 112, 80, 4, "base");
    // The pedestal: a round foot and a cup the point sits in.
    scene.cylinder(0, LIKE.y - 3, 4, 16, 5, empty ? "ghost" : "base");
    scene.cylinder(0, LIKE.y - 3, 9, 6, LIKE.base - 5 + 2, empty ? "ghost" : "base");
    const outline = (f: number, side = 0): Vec3[] => Array.from({ length: 36 }, (_, i) => {
      const [u, v] = heartAt((i / 36) * TAU);
      return pt(u, v, f, side);
    });
    if (empty) { scene.polyline(outline(0), "ghost", { closed: true }); return; }

    const layers = [-6, -3, 0];
    if (S < 0.02) {
      layers.forEach((f, i) => scene.panel(outline(f), i === 2 ? tone : tone === "base" ? "muted" : tone));
      // A highlight on the upper left lobe.
      scene.polyline(Array.from({ length: 7 }, (_, i) => {
        const [u, v] = heartAt(3.95 + i * 0.12);
        return pt(u * 0.68, v * 0.68 + 1.5, 0.1);
      }), tone === "base" ? "muted" : tone);
      return;
    }
    // Broken: the heart splits down a crack and its halves lean apart.
    const half = (side: 1 | -1, f: number): Vec3[] => {
      const arc = Array.from({ length: 19 }, (_, i) => {
        const t = side > 0 ? (i / 18) * Math.PI : Math.PI + (i / 18) * Math.PI;
        const [u, v] = heartAt(t);
        return pt(u, v, f, side);
      });
      const crack = (side > 0 ? [...CRACK].reverse() : CRACK).map(([u, v]) => pt(u, v, f, side));
      return [...arc, ...crack];
    };
    for (const side of [-1, 1] as const) layers.forEach((f, i) => scene.panel(half(side, f), i === 2 ? "err" : "err"));
  },
});

/** The tablet stands facing lower right; (u, z) run across and up its face. */
const TAB = { t: 6, w: 92, z: 10, h: 96 };
const TAB_FACE = TAB.t / 2;
/** Comments: avatar position, then the bubble's left and right edges, bottom and height. */
const PARENT = { au: -36, az: 92, l: -27, r: 40, z: 84, h: 18 };
const REPLY = { au: -22, az: 68, l: -14, r: 40, z: 62, h: 14 };
const NEW = { au: -22, az: 46, l: -14, r: 32, z: 40, h: 14 };

/** A comment bubble with a reply thread. Use for comments, replies and discussion threads. */
export const thread = /*#__PURE__*/ defineFigure({
  name: "Thread",
  label: "A comment with replies beneath",
  offset: 30,
  setup: ({ spring }) => ({ reply: spring(0, 160, 18), lift: spring(0, 160, 18), fall: spring(0, 110, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const R = m.reply.to(state === "success" || state === "error" || state === "loading" ? 1 : 0).value;
    const L = m.lift.to(state === "idle" ? ctx.hover : 0).value;
    const F = m.fall.to(state === "error" ? 1 : 0).value;
    const on = (u: number, z: number, f = 0.05): Vec3 => [TAB_FACE + f, -u, z];
    const ring = (u: number, z: number, r: number, f = 0.1): Vec3[] =>
      Array.from({ length: 14 }, (_, k) => on(u + r * Math.cos((k / 14) * TAU), z + r * Math.sin((k / 14) * TAU), f));
    /** A bubble standing proud of the face by `depth`, with a tail toward its avatar and lines on it. */
    const bubble = (b: typeof PARENT, depth: number, tone: Tone, lines: number[], dx = 0, dz = 0, opacity?: number) => {
      const cu = (b.l + b.r) / 2, x = TAB_FACE + dx;
      scene.box(x + depth / 2, -cu, b.z + dz, depth, b.r - b.l, b.h, tone, opacity);
      const fx = x + depth + 0.05;
      scene.panel([[fx, -b.l, b.z + dz + b.h - 3], [fx, -(b.l - 5), b.z + dz + b.h - 1], [fx, -b.l, b.z + dz + b.h - 7]], tone, opacity);
      lines.forEach((w, i) => scene.line([fx, -(b.l + 5), b.z + dz + b.h - 5 - i * 6], [fx, -(b.l + 5 + w), b.z + dz + b.h - 5 - i * 6],
        i === 0 ? (tone === "base" ? "muted" : tone) : "faint", { opacity }));
    };

    scene.box(6, 2, 0, 64, 118, 4, "base");
    // The stand behind and the tablet with its bezel.
    scene.box(-12, 0, 4, 18, 30, 3, empty ? "ghost" : "base");
    scene.box(0, 0, 4, TAB.t + 4, TAB.w - 20, TAB.z - 4, empty ? "ghost" : "base");
    scene.box(0, 0, TAB.z, TAB.t, TAB.w, TAB.h, empty ? "ghost" : "base");
    const top = TAB.z + TAB.h;
    scene.polyline([on(-42, TAB.z + 5), on(42, TAB.z + 5), on(42, top - 5), on(-42, top - 5)], empty ? "ghost" : "faint", { closed: true });
    if (empty) {
      scene.box(TAB_FACE + 1, -((PARENT.l + PARENT.r) / 2), PARENT.z, 2, PARENT.r - PARENT.l, PARENT.h, "ghost");
      return;
    }
    // The reply field at the bottom with its send button.
    scene.polyline([on(-38, 18), on(26, 18), on(26, 28), on(-38, 28)], "muted", { closed: true });
    scene.line(on(-34, 23), on(-12, 23), "faint");
    scene.polyline(ring(34, 23, 4.5), state === "loading" ? "hi" : "muted", { closed: true });

    // The thread: a line from the first avatar down to each reply.
    const joined = R > 0.5 && state !== "error";
    const last = joined ? NEW : REPLY;
    scene.polyline([on(PARENT.au, PARENT.az - 7), on(PARENT.au, last.az), on(REPLY.au - 5, last.az)], "muted");
    if (joined) scene.line(on(PARENT.au, REPLY.az), on(REPLY.au - 5, REPLY.az), "muted");
    scene.polyline(ring(PARENT.au, PARENT.az, 6), "base", { closed: true });
    scene.polyline(ring(REPLY.au, REPLY.az, 5), "base", { closed: true });
    bubble(PARENT, 3 + L * 3, "base", [36, 50]);
    bubble(REPLY, 3, "base", [30]);

    if (R < 0.03) return;
    const tone: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    if (state === "error") {
      // The reply would not post: it slides off the tablet and lands on the plate in front.
      bubble(NEW, 3, "err", [26], F * 14 + shake * 0.3, -F * (NEW.z - 4));
      return;
    }
    scene.polyline(ring(NEW.au, NEW.az, 5), tone, { closed: true, opacity: R });
    if (state === "loading") {
      bubble({ ...NEW, r: NEW.l + 22 }, 3 * R, "hi", [], 0, 0, R);
      const active = Math.floor(ctx.time * 5) % 3;
      for (let i = 0; i < 3; i++) {
        scene.polyline(Array.from({ length: 9 }, (_, k) => on(NEW.l + 5 + i * 6 + 1.6 * Math.cos((k / 8) * TAU), NEW.z + 7 + 1.6 * Math.sin((k / 8) * TAU), 3.1)),
          i === active ? "hi" : "muted");
      }
      return;
    }
    bubble(NEW, 3 * R, tone, [26], 0, 0, R);
  },
});

/** The mast stands at the back right; the receiving set stands at the front left facing lower right. */
const MAST = { x: 34, y: -24, foot: 13, head: 3, top: 90 };
const SET = { x: -30, y: 22, t: 8, w: 62, z: 12, h: 44 };
const SET_FACE = SET.x + SET.t / 2;

/** A live stream: an antenna sending waves toward a screen. Use for live streams, broadcasts and real-time status. */
export const live = /*#__PURE__*/ defineFigure({
  name: "Live",
  label: "An antenna sending waves to a screen",
  offset: 22,
  setup: ({ spring }) => ({ tilt: spring(0, 120, 16), picture: spring(0, 140, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const tilt = m.tilt.to(state === "idle" ? (ctx.pointer.x / 140) * 0.3 * ctx.hover : state === "error" ? 1.25 : 0).value;
    const P = m.picture.to(state === "success" ? 1 : 0).value;
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();
    const frame: Tone = empty ? "ghost" : "base";

    scene.box(0, 0, 0, 140, 104, 4, "base");
    // The mast: four tapering legs, rings, and cross braces on the two near faces.
    const leg = (sx: number, sy: number, z: number): Vec3 => {
      const h = lerp(MAST.foot, MAST.head, (z - 4) / (MAST.top - 4));
      return [MAST.x + sx * h, MAST.y + sy * h, z];
    };
    scene.box(MAST.x, MAST.y, 4, 32, 32, 3, frame);
    const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sy] of corners) scene.line(leg(sx, sy, 7), leg(sx, sy, MAST.top), frame);
    const levels = [7, 34, 58, MAST.top];
    for (let i = 0; i < levels.length; i++) {
      scene.polyline(corners.map(([sx, sy]) => leg(sx, sy, levels[i]!)), empty ? "ghost" : "muted", { closed: true });
      if (i === 0 || empty) continue;
      const a = levels[i - 1]!, b = levels[i]!;
      scene.line(leg(-1, 1, a), leg(1, 1, b), "muted");
      scene.line(leg(1, 1, a), leg(-1, 1, b), "muted");
      scene.line(leg(1, -1, a), leg(1, 1, b), "muted");
      scene.line(leg(1, 1, a), leg(1, -1, b), "muted");
    }
    // The aerial on top, bending over when the signal is lost, with a beacon at its tip.
    const len = 18, bx = MAST.x + len * Math.sin(tilt) + shake * 0.4, bz = MAST.top + len * Math.cos(tilt);
    const mid: Vec3 = [MAST.x + len * 0.5 * Math.sin(tilt * 0.4), MAST.y, MAST.top + len * 0.5 * Math.cos(tilt * 0.4)];
    scene.polyline([[MAST.x, MAST.y, MAST.top], mid, [bx, MAST.y, bz]], tone, { bold: true });
    scene.panel(faceArc(bx, MAST.y, bz, 3.2, 0, TAU, 12), tone === "base" ? "muted" : tone);
    if (state === "loading") {
      for (let k = 0; k < 3; k++) {
        const q = (ctx.loop(1.6) + k / 3) % 1, r = 8 + 26 * q;
        scene.polyline(faceArc(bx, MAST.y, bz, r, Math.PI - 0.7, Math.PI + 0.7, 12), "hi", { opacity: 1 - q });
        scene.polyline(faceArc(bx, MAST.y, bz, r, -0.7, 0.7, 12), "hi", { opacity: 1 - q });
      }
    } else if (state === "success") {
      for (const r of [10, 18]) {
        scene.polyline(faceArc(bx, MAST.y, bz, r, Math.PI - 0.6, Math.PI + 0.6, 10), "ok");
        scene.polyline(faceArc(bx, MAST.y, bz, r, -0.6, 0.6, 10), "ok");
      }
    }

    // The set: feet, body and screen, a presenter on it and the live badge in the corner.
    const on = (u: number, z: number, f = 0.05): Vec3 => [SET_FACE + f, SET.y - u, z];
    scene.box(SET.x, SET.y - 20, 4, 14, 10, SET.z - 4, frame);
    scene.box(SET.x, SET.y + 20, 4, 14, 10, SET.z - 4, frame);
    scene.box(SET.x, SET.y, SET.z, SET.t, SET.w, SET.h, frame);
    const z0 = SET.z + 4, z1 = SET.z + SET.h - 4, u1 = SET.w / 2 - 4;
    scene.polyline([on(-u1, z0), on(u1, z0), on(u1, z1), on(-u1, z1)], empty ? "ghost" : "muted", { closed: true });
    if (empty) return;
    if (state === "error") {
      // No signal: static across the glass where the picture was.
      for (let i = 0; i < 5; i++) {
        const z = z0 + 5 + i * 6.5, s = (i % 2 ? 5 : -3) + shake * 0.5;
        scene.line(on(-u1 + 7 + s, z), on(u1 - 6 + s * 0.5, z), "err", { opacity: 0.7 });
      }
    } else {
      const pt: Tone = P > 0.5 ? "ok" : state === "loading" ? "base" : "muted";
      // The presenter: head and shoulders.
      scene.polyline(Array.from({ length: 15 }, (_, k) => on(2 + 6 * Math.cos((k / 14) * TAU), z0 + 22 + 6 * Math.sin((k / 14) * TAU))), pt, { bold: P > 0.5 });
      scene.polyline(Array.from({ length: 11 }, (_, k) => on(2 - 13 * Math.cos((k / 10) * Math.PI), z0 + 1 + 12 * Math.sin((k / 10) * Math.PI))), pt, { bold: P > 0.5 });
    }
    // The live badge: a pill with a dot and a word line.
    const bu = -u1 + 4, bz2 = z1 - 7, badge: Tone = state === "idle" ? "muted" : tone;
    scene.polyline([on(bu, bz2 - 3), on(bu + 14, bz2 - 3), on(bu + 14, bz2 + 3), on(bu, bz2 + 3)], badge, { closed: true });
    scene.panel(Array.from({ length: 9 }, (_, k) => on(bu + 4 + 1.6 * Math.cos((k / 8) * TAU), bz2 + 1.6 * Math.sin((k / 8) * TAU), 0.1)), badge);
    scene.line(on(bu + 7.5, bz2), on(bu + 11.5, bz2, 0.1), badge);
  },
});
