import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { facing, frontArc, heart } from "../shapes";

/** Two profile cards stand facing the viewer; the brand's tab fits the creator's notch. */
const W = 46;
const H = 64;
const MID = 32;
const FACE = 8;
const THICK = 4;
const GAP = 44;
const KNOB = 7;
/** The heart meter stands on a post behind the joint. */
const POST: [number, number] = [0, -6];
const HEART_Z = 84;

/** The joint: a neck and a round knob, from the bottom of the neck to its top, in (u, v). */
const knob: [number, number][] = (() => {
  const a0 = -2.25, pts: [number, number][] = [[0, MID - 5.5]];
  for (let i = 0; i <= 14; i++) {
    const a = a0 + ((-2 * a0) * i) / 14;
    pts.push([KNOB + KNOB * Math.cos(a), MID + KNOB * Math.sin(a)]);
  }
  pts.push([0, MID + 5.5]);
  return pts;
})();
/** Brand card, its right edge at u = 0 with the tab sticking out. */
const BRAND: [number, number][] = [[-W, 0], [0, 0], ...knob, [0, H], [-W, H]];
/** Creator card, its left edge at u = 0 with the notch cut in. */
const CREATOR: [number, number][] = [[0, 0], [W, 0], [W, H], [0, H], ...[...knob].reverse()];

type Place = (u: number, v: number, back?: boolean) => Vec3;

/** A card placed with its (u, v) origin at (x, z0), tilted in its own plane by `tilt` about (pu, 0). */
const placer = (x: number, tilt = 0, pu = 0): Place => (u, v, back = false) => {
  const c = Math.cos(tilt), s = Math.sin(tilt), du = u - pu;
  return [x + pu + du * c - v * s, back ? FACE - THICK : FACE, 4 + du * s + v * c];
};

function card(scene: Scene, shape: [number, number][], at: Place, tone: Tone) {
  scene.panel(shape.map(([u, v]) => at(u, v, true)), tone);
  scene.panel(shape.map(([u, v]) => at(u, v)), tone);
}

/** Half a heart facing the viewer, split along a crack. */
function halfHeart(scene: Scene, x: number, y: number, z: number, size: number, side: -1 | 1, tone: Tone) {
  const k = size / 32, pts: Vec3[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = side < 0 ? Math.PI + (Math.PI * i) / 14 : (Math.PI * i) / 14;
    const u = 16 * Math.sin(t) ** 3;
    const v = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push(facing(x, y, z, u * k, v * k));
  }
  // The crack zigzags from the top dip to the bottom point.
  const crack = [[0, 5], [-3, 0], [3, -5], [-2, -10], [0, -17]].map(([u, v]) => facing(x, y, z, u! * k, v! * k));
  scene.panel(side < 0 ? [...pts, ...crack] : [...pts, ...crack.reverse()], tone);
}

/** A brand and a creator with a match score between them. Use for creator matching and fit scores. */
export const match = defineFigure({
  name: "Match",
  label: "A brand card and a creator card fitting together under a heart",
  offset: 16,
  setup: ({ spring }) => ({ gap: spring(GAP, 120, 16), score: spring(0.55, 110, 14), tilt: spring(0, 120, 12), split: spring(0, 140, 14), rise: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let gap = GAP - 8 * ctx.hover, score = 0.55;
    if (state === "loading") {
      const t = Math.sin(ctx.time * 3.2);
      gap = 10 + 10 * t; score = 0.6 + 0.3 * t;
      m.gap.set(gap); m.score.set(score);
    }
    if (state === "success") { gap = 0; score = 1; }
    if (state === "error") { gap = GAP + 10; score = 1; }
    if (empty) { gap = GAP; score = 0; }
    const G = Math.max(0, m.gap.to(gap).value), S = clamp(m.score.to(score).value);
    // A miss: the creator card stands crooked and the heart cracks in two.
    const T = m.tilt.to(state === "error" ? -0.22 : 0).value;
    const X = m.split.to(state === "error" ? 1 : 0).value;
    const R = m.rise.to(state === "success" ? 8 : 0).value;
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    const cardTone: Tone = empty ? "ghost" : ctx.verdict();

    scene.box(0, 2, 0, 196, 64, 4, "base");

    // The heart meter on its post: an outline that fills as the fit grows.
    const [px, py] = POST, hz = HEART_Z + R;
    scene.box(px, py, 4, 4, 4, HEART_Z - 16, empty ? "ghost" : "base");
    if (X > 0.04) {
      halfHeart(scene, px - 7 * X, py, hz - 4 * X, 34, -1, "err");
      halfHeart(scene, px + 7 * X, py, hz - 8 * X, 34, 1, "err");
    } else {
      heart(scene, px, py, hz, 34, empty ? "ghost" : "base");
      if (!empty && S > 0.05) heart(scene, px, py, hz + 1.5 * (1 - S), 30 * S, tone);
    }

    // The two cards. Detail sits on the face plane.
    const brandAt = placer(-G / 2);
    const creatorAt = placer(G / 2 + shake, T, W);
    card(scene, BRAND, brandAt, cardTone);
    card(scene, CREATOR, creatorAt, cardTone);
    if (empty) return;
    const ink: Tone = cardTone === "base" ? "muted" : cardTone;
    const on = (at: Place, u: number, v: number): Vec3 => { const p = at(u, v); return [p[0], p[1] + 0.05, p[2]]; };
    // Brand: a logo badge and two lines of copy.
    const b = (u: number, v: number) => on(brandAt, u, v);
    scene.polyline([b(-23, 54), b(-14, 47), b(-17, 37), b(-29, 37), b(-32, 47)], ink, { closed: true });
    scene.line(b(-36, 24), b(-10, 24), ink);
    scene.line(b(-36, 16), b(-18, 16), ink);
    // Creator: an avatar and two lines of copy.
    const c = (u: number, v: number) => on(creatorAt, u, v);
    const head = frontArc(0, 0, 0, 5.5, 0, Math.PI * 2, 14).map(([u, , v]) => c(25 + u, 50 + v));
    scene.polyline(head, ink);
    scene.polyline(frontArc(0, 0, 0, 9, 0, Math.PI, 10).map(([u, , v]) => c(25 + u, 34 + v)), ink);
    scene.line(c(12, 24), c(38, 24), ink);
    scene.line(c(12, 16), c(30, 16), ink);
  },
});
