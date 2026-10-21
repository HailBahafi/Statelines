import { defineFigure } from "../../core/define";
import { clamp, falloff, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { faceArc, facing, frontArc, heart } from "../shapes";

const TAU = Math.PI * 2;

/** The television: its body, and the plane of its screen (the y+ face). */
const TV = { y: -6, w: 116, d: 8, z: 18, h: 64 };
const TV_FACE = TV.y + TV.d / 2;
/** The paused frame on the screen: hills under a sun, as (u, z) points. */
const HILLS: [number, number][] = [[-50, 40], [-32, 56], [-18, 46], [2, 66], [24, 46], [36, 52], [50, 44]];

/** A video frame with a play button that is pressed. Use for video players, reels and watch actions. */
export const play = defineFigure({
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
export const clap = defineFigure({
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

/** The waveform runs along x inside a shallow track; a ruler marks time along its back rim. */
const WAVE = { n: 24, span: 150 };
const waveHeight = (i: number) => 9 + 30 * Math.abs(Math.sin(i * 1.3)) * (0.55 + 0.45 * Math.sin(i * 0.37 + 0.4) ** 2);

/** A waveform with a playhead. Use for audio, podcasts, voice notes and sound levels. */
export const waveform = defineFigure({
  name: "Waveform",
  label: "A waveform with a moving playhead",
  offset: 10,
  setup: ({ spring }) => ({
    heights: Array.from({ length: WAVE.n }, (_, i) => spring(waveHeight(i), 160, 16)),
    head: spring(WAVE.n * 0.4, 120, 18),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(4);
    const { n: N, span } = WAVE, pitch = span / N, bar = (i: number) => -span / 2 + pitch * (i + 0.5);
    const empty = state === "empty";
    let head = N * 0.4;
    if (state === "loading") { head = ctx.loop(2.8) * N; m.head.set(head); }
    if (state === "success") head = N;
    if (state === "error") head = N * 0.55;
    if (state === "empty") head = 0;
    if (state === "idle") head += ctx.hover * clamp((g.x + span / 2) / pitch - head, -4, 4);
    const H = m.head.to(head).value;
    const stopped = state === "error";
    const hx = -span / 2 + clamp(H / N) * span;
    const ht: Tone = state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict();

    // The track: a deck with a raised back rim carrying the time ruler.
    scene.box(0, 0, 0, span + 22, 60, 4, "base");
    scene.box(0, -22, 4, span + 10, 6, 6, empty ? "ghost" : "base");
    if (!empty) {
      for (let k = 0; k <= 8; k++) {
        const x = -span / 2 + (span * k) / 8;
        scene.line([x, -24, 10.05], [x, k % 2 ? -22 : -20, 10.05], "muted");
      }
    }
    if (!empty) scene.line([hx, -19, 4.05], [hx, 20, 4.05], ht);
    for (let i = 0; i < N; i++) {
      const base = waveHeight(i), after = i >= H;
      let h = base;
      if (state === "loading") h = base * (i < H ? 1 : 0.55 + 0.25 * Math.abs(Math.sin(ctx.time * 3 + i)));
      if (state === "idle") h += 7 * ctx.hover * falloff(bar(i) - g.x, 12);
      if (stopped && after) h = 1.2;
      if (empty) h = 1;
      const Hh = m.heights[i]!.to(h).value;
      const tone: Tone = empty ? "ghost" : stopped && after ? "err" : !after ? (state === "success" ? "ok" : state === "loading" ? "hi" : "base") : "muted";
      scene.box(bar(i) + (stopped && after ? shake * 0.4 : 0), 2, 4, pitch * 0.6, pitch * 0.6, Math.max(0.5, Hh), tone);
    }
    if (empty) return;
    // The playhead: a pin standing at the front of the track with a cap on top.
    scene.box(hx, 20, 4, 2.5, 2.5, 46, ht);
    scene.panel([facing(hx, 20, 56, -6, 5), facing(hx, 20, 56, 6, 5), facing(hx, 20, 56, 0, -5)], ht);
  },
});

/** One print, lying flat: a white border with a thicker strip at the front, a picture inside. */
function print(scene: Scene,
  o: Vec3, U: Vec3, V: Vec3, w: number, tone: Tone, picture: "full" | "torn" | "none", bold = false): void {
  const d = w * 1.18;
  const P = (a: number, b: number, lift = 0): Vec3 =>
    [o[0] + a * U[0] + b * V[0], o[1] + a * U[1] + b * V[1], o[2] + a * U[2] + b * V[2] + lift];
  scene.panel([P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)], tone);
  scene.panel([P(-w / 2, -d / 2, 2), P(w / 2, -d / 2, 2), P(w / 2, d / 2, 2), P(-w / 2, d / 2, 2)], tone);
  if (tone === "ghost" || picture === "none") return;
  // The picture window: margins on three sides, the wide strip at the bottom (b = -d/2).
  const a0 = -w / 2 + 3, a1 = w / 2 - 3, b0 = -d / 2 + w * 0.3, b1 = d / 2 - 3, z = 2.05;
  const inner: Tone = tone === "base" ? "muted" : tone;
  scene.polyline([P(a0, b0, z), P(a1, b0, z), P(a1, b1, z), P(a0, b1, z)], inner, { closed: true });
  const t = (fa: number, fb: number): Vec3 => P(lerp(a0, a1, fa), lerp(b0, b1, fb), z + 0.05);
  if (picture === "torn") {
    scene.polyline([t(0, 0.75), t(0.25, 0.5), t(0.45, 0.68), t(0.7, 0.35), t(1, 0.5)], "err", { bold: true });
    return;
  }
  scene.polyline([t(0, 0.2), t(0.32, 0.62), t(0.52, 0.36), t(0.72, 0.58), t(1, 0.25)], inner, { bold });
  scene.polyline(Array.from({ length: 9 }, (_, k) => {
    const a = (k / 8) * TAU;
    return P(lerp(a0, a1, 0.74) + 2.4 * Math.cos(a), lerp(b0, b1, 0.8) + 2.4 * Math.sin(a), z + 0.05);
  }), inner);
}

/** Photos spread into a grid, and one is picked. Use for galleries, photo uploads and media libraries. `count`: photos, 2–9. */
export const gallery = defineFigure({
  name: "Gallery",
  label: "Photos fanned into a grid with one picked",
  offset: 14,
  setup: ({ spring }) => ({ spread: spring(1, 130, 18), pick: spring(0, 150, 18), lift: spring(0, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(6);
    const n = ctx.count(6, 9, 2), cols = n <= 4 ? 2 : 3, rows = Math.ceil(n / cols), gap = 7;
    const w = cols === 2 ? 34 : 30, d = w * 1.18;
    const totalW = w * cols + gap * (cols - 1), totalD = d * rows + gap * (rows - 1);
    const at = (k: number): [number, number] => {
      const c = k % cols, r = Math.floor(k / cols);
      return [-totalW / 2 + c * (w + gap) + w / 2, -totalD / 2 + r * (d + gap) + d / 2];
    };
    const empty = state === "empty";
    const spread = m.spread.to(empty ? 0 : 1).value;
    let picked = -1;
    if (state === "idle") picked = clamp(Math.floor((g.x / totalW + 0.5) * cols), 0, cols - 1) + cols * clamp(Math.floor((g.y / totalD + 0.5) * rows), 0, rows - 1);
    if (state === "loading") picked = Math.floor(ctx.loop(2.4) * n) % n;
    if (state === "success" || state === "error") picked = Math.min(n - 1, cols + 1 < n ? cols + 1 : 0);
    picked = Math.min(picked, n - 1);
    const P = m.pick.to(state === "success" ? 1 : state === "error" ? -1 : 0).value;
    const L = m.lift.to(state === "loading" ? 1 : state === "idle" ? 0.4 + ctx.hover * 0.6 : 0).value;

    scene.box(0, 0, 0, totalW + 26, totalD + 26, 4, "base");
    const flatU: Vec3 = [1, 0, 0], flatV: Vec3 = [0, -1, 0];
    if (empty) {
      for (let k = 0; k < n; k++) { const [x, y] = at(k); scene.rect(x - w / 2, y - d / 2, x + w / 2, y + d / 2, 4.05, "ghost"); }
      return;
    }
    for (let k = 0; k < n; k++) {
      if (k === picked && (state === "success" || state === "error" || L > 0.05)) continue;
      const [x, y] = at(k);
      print(scene, [x * spread, y * spread, 4], flatU, flatV, w, "base", "full");
    }
    if (picked < 0) return;
    const [px, py] = at(picked);
    if (state === "success" || (state !== "error" && P > 0.02)) {
      // Picked: it lifts and stands up toward the viewer, a size larger.
      const t = clamp(P), th = t * 1.15, s = 1 + t * 0.35;
      const V: Vec3 = [0, -Math.cos(th) * s, Math.sin(th) * s], U: Vec3 = [s, 0, 0];
      print(scene, [px, py + t * 14, 4 + t * 26 + L * 10], U, V, w, state === "success" ? "ok" : "base", "full", true);
    } else if (state === "error" || P < -0.02) {
      // Failed: it slides off the grid at an angle and its picture is torn.
      const t = clamp(-P), a = t * 0.5;
      const U: Vec3 = [Math.cos(a), Math.sin(a), 0], V: Vec3 = [Math.sin(a), -Math.cos(a), 0];
      print(scene, [px + shake + t * (totalW / 2 + 10 - px), py + t * 6, 4], U, V, w, "err", "torn");
    } else {
      const tone: Tone = state === "loading" ? "hi" : "base";
      print(scene, [px, py, 4 + L * 12], flatU, flatV, w, tone, "full");
    }
  },
});

/** The turntable: a plinth, a platter with the record, and the tone arm pivoting at the back right. */
const DECK = { top: 16, cx: -12, cy: 4, r: 38 };
const PIVOT = { x: 42, y: -30, z: 30 };
const ARM = 50;

/** A record spinning on a turntable with its tone arm. Use for music, playlists, streaming and sound loading. */
export const vinyl = defineFigure({
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
