import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { frontArc } from "../shapes";

const MX = -10;
const MY = 0;
/** The monitor's screen: half width, half height, centre height and depth. */
const SCREEN = { a: 62, b: 41, z: 64, d: 6 };
const FACE = MY + SCREEN.d / 2;
const CARD = { w: 30, h: 27 };
/** Profile cards on the screen, (u, z) of each centre: two rows of three. */
const SLOTS: [number, number][] = [[-37, 76], [0, 76], [37, 76], [-37, 45], [0, 45], [37, 45]];
const MATCHES = new Set([1, 3, 5]);
const SWEEP = [0, 1, 2, 5, 4, 3];
const LENS_Y = FACE + 18;
const LENS_R = 19;

/** A rectangle with rounded corners on the plane y, centred on (cx, cz), half sizes a and b. */
function rounded(cx: number, y: number, cz: number, a: number, b: number, r: number, steps = 4): Vec3[] {
  const out: Vec3[] = [];
  const corners: [number, number, number][] = [
    [cx + a - r, cz + b - r, Math.PI / 2], [cx + a - r, cz - b + r, 0],
    [cx - a + r, cz - b + r, -Math.PI / 2], [cx - a + r, cz + b - r, Math.PI],
  ];
  for (const [x, z, a0] of corners) for (let i = 0; i <= steps; i++) {
    const t = a0 - (Math.PI / 2) * (i / steps);
    out.push([x + r * Math.cos(t), y, z + r * Math.sin(t)]);
  }
  return out;
}

/** The monitor: foot, neck and a rounded screen whose face looks to the lower left. */
function monitor(scene: Scene, tone: Tone): void {
  const { a, b, z, d } = SCREEN;
  scene.box(MX, MY + 2, 4, 50, 28, 3, tone);
  scene.box(MX, MY - 1, 7, 10, 4, z - b - 6, tone);
  const front = rounded(MX, FACE, z, a, b, 5), back = rounded(MX, MY - d / 2, z, a, b, 5);
  if (tone === "ghost") { scene.panel(front, "ghost"); return; }
  const idx = [15, 16, 17, 18, 19, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  scene.panel([...idx.map(i => back[i]!), ...idx.slice().reverse().map(i => front[i]!)], tone);
  scene.panel(front, tone);
  scene.polyline(rounded(MX, FACE + 0.05, z, a - 4, b - 4, 2, 2), "faint", { closed: true });
}

/** A creator's profile card standing `dep` proud of the screen: avatar head and shoulders. */
function card(scene: Scene, k: number, dep: number, tone: Tone): void {
  const [u, z] = SLOTS[k]!, x = MX + u;
  scene.box(x, FACE + dep / 2, z - CARD.h / 2, CARD.w, dep, CARD.h, tone);
  if (tone === "ghost") return;
  const f = FACE + dep + 0.05, ink: Tone = tone === "base" ? "muted" : tone;
  scene.polyline(frontArc(x, f, z + 5, 4.6, 0, Math.PI * 2, 14), ink);
  scene.polyline(frontArc(x, f, z - 9, 8.5, 0, Math.PI, 10), ink, { closed: true });
}

/** A magnifier standing in front of the screen: handle to the lower right, glass showing a bigger avatar. */
function lens(scene: Scene, u: number, z: number, tone: Tone, mag: Tone | null, ang = -0.75): void {
  const x = MX + u, y = LENS_Y;
  const hu = Math.cos(ang), hz = Math.sin(ang);
  const P = (s: number, t: number, dy = 0): Vec3 => [x + hu * s - hz * t, y + dy, z + hz * s + hu * t];
  if (tone === "ghost") { scene.panel(frontArc(x, y, z, LENS_R, 0, Math.PI * 2, 24), "ghost"); return; }
  for (const dy of [-2.5, 0]) scene.panel([P(LENS_R - 2, -3, dy), P(LENS_R + 20, -3.4, dy), P(LENS_R + 20, 3.4, dy), P(LENS_R - 2, 3, dy)], tone);
  scene.panel(frontArc(x, y - 2.5, z, LENS_R, 0, Math.PI * 2, 24), tone);
  scene.panel(frontArc(x, y, z, LENS_R, 0, Math.PI * 2, 24), tone);
  scene.polyline(frontArc(x, y + 0.05, z, LENS_R - 3.5, 0, Math.PI * 2, 24), tone === "base" ? "muted" : tone);
  if (!mag) return;
  scene.polyline(frontArc(x, y + 0.1, z + 4, 5.6, 0, Math.PI * 2, 14), mag);
  scene.polyline(frontArc(x, y + 0.1, z - 10, 10, 0.25, Math.PI - 0.25, 10), mag);
}

/** A magnifier sweeps a grid of creator profiles on a monitor and pops the ones that fit. Use for creator search and discovery. */
export const discover = /*#__PURE__*/ defineFigure({
  name: "Discover",
  label: "A magnifier sweeping creator profiles on a monitor",
  offset: 14,
  setup: ({ spring }) => ({
    u: spring(26, 90, 15), z: spring(40, 90, 15), ang: spring(-0.75, 90, 12),
    pops: SLOTS.map(() => spring(3, 160, 16)),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(10);
    const empty = state === "empty";
    let lu = 26 + lean.x, lz = 40 - lean.y * 0.6;
    if (state === "loading") {
      const t = ctx.loop(SWEEP.length * 0.55) * SWEEP.length;
      [lu, lz] = SLOTS[SWEEP[clamp(Math.floor(t), 0, SWEEP.length - 1)]!]!;
    }
    if (state === "success") [lu, lz] = SLOTS[5]!;
    // Nothing fits: the magnifier drops to the desk in front of the monitor.
    if (state === "error") { lu = -44; lz = LENS_R + 5; }
    const U = m.u.to(lu).value + shake, Z = m.z.to(lz).value;
    // The card the glass is over, if any.
    let under = -1;
    SLOTS.forEach(([u, z], k) => { if (Math.abs(u - U) < 15 && Math.abs(z - Z) < 15) under = k; });

    scene.box(-4, 8, 0, 156, 66, 4, "base");
    monitor(scene, empty ? "ghost" : "base");
    if (!empty) {
      // The search bar across the top of the screen.
      scene.polyline(rounded(MX, FACE + 0.05, 97, 54, 3.5, 3.5, 3), "muted", { closed: true });
      scene.polyline(frontArc(MX - 49, FACE + 0.1, 97, 1.8, 0, Math.PI * 2, 8), "muted");
    }

    SLOTS.forEach((_, k) => {
      if (empty) { card(scene, k, 3, "ghost"); return; }
      const match = MATCHES.has(k);
      let dep = 3;
      if (state === "loading" && k === under) dep = 8;
      if (state === "success") dep = match ? 13 : 2;
      if (state === "error") dep = 1.5;
      const D = Math.max(1, m.pops[k]!.to(dep).value);
      const tone: Tone = state === "success" ? (match ? "ok" : "faint")
        : state === "error" ? "faint" : state === "loading" && k === under ? "hi" : "base";
      card(scene, k, D, tone);
    });

    if (empty) { lens(scene, 26, 40, "ghost", null); return; }
    const glass: Tone = state === "loading" ? "hi" : ctx.verdict();
    const mag: Tone | null = state === "error" || under < 0 ? null
      : state === "loading" ? "hi" : state === "success" ? "ok" : "muted";
    lens(scene, U, Z, glass, mag, m.ang.to(state === "error" ? -0.2 : -0.75).value);
  },
});
