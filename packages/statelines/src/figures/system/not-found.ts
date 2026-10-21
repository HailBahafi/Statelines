import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { add, obox, rotX, tube } from "./solid";

const N = 4;
const PITCH = 26;
const TILE = 22;
const BOARD_TOP = 10;
const HOLE = { i: 2, j: 1 };
const at = (k: number) => (k - (N - 1) / 2) * PITCH;
const TILES = Array.from({ length: N * N }, (_, n) => ({ i: n % N, j: Math.floor(n / N) }))
  .filter(t => t.i !== HOLE.i || t.j !== HOLE.j)
  .sort((a, b) => a.i + a.j - (b.i + b.j));
const LENS = 22;
const RIM = 4;
const HANDLE: Vec3 = [0.94, 0.34, 0];
const HX = at(HOLE.i), HY = at(HOLE.j);

/** A magnifying glass searching a board for a missing tile. Use for 404s, missing pages and lost items. */
export const notFound = defineFigure({
  name: "NotFound",
  label: "A magnifying glass over a board with a missing tile",
  offset: 14,
  setup: ({ spring }) => ({
    x: spring(at(0), 110, 16), y: spring(at(2), 110, 16), z: spring(36, 110, 16),
    tilt: spring(0, 110, 12), drop: spring(30, 140, 16),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(BOARD_TOP);
    const empty = state === "empty";
    let x = at(0) + 4, y = at(2) - 4, z = 36, tilt = 0;
    if (state === "idle" && ctx.pointer.over > 0.2) { x = clamp(g.x, -34, 34); y = clamp(g.y, -40, 34); z = 36 - 4 * ctx.hover; }
    if (state === "loading") {
      const a = ctx.time * 2.4;
      x = 24 * Math.cos(a) - 4; y = 22 * Math.sin(a); z = 30;
      m.x.set(x); m.y.set(y); m.z.set(z);
    }
    if (state === "success") { x = HX - 20; y = HY - 22; z = 32; }
    if (state === "error") { x = HX - 24; y = HY + 18; z = BOARD_TOP + 11; tilt = 0.3; }
    const X = m.x.to(x).value + shake, Y = m.y.to(y).value, Z = m.z.to(z).value, T = m.tilt.to(tilt).value;
    const D = m.drop.to(state === "success" ? 9 : 30).value;

    scene.box(0, 0, 0, 124, 124, 4, "base");
    scene.box(0, 0, 4, 112, 112, BOARD_TOP - 4, empty ? "ghost" : "base");
    const hole = () => {
      const r = TILE / 2;
      scene.rect(HX - r, HY - r, HX + r, HY + r, BOARD_TOP + 0.05, state === "error" ? "err" : "ghost");
      // On success the missing tile is found, floating just above its slot.
      if (D < 29.5) scene.box(HX, HY, BOARD_TOP + D, TILE, TILE, 7, "ok", clamp(1 - D / 30));
    };
    let holeDrawn = false;
    for (const t of TILES) {
      if (!holeDrawn && t.i + t.j > HOLE.i + HOLE.j) { hole(); holeDrawn = true; }
      scene.box(at(t.i), at(t.j), BOARD_TOP, TILE, TILE, 7, empty ? "ghost" : "base");
    }
    if (!holeDrawn) hole();

    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : state === "error" ? "err" : state === "success" ? "ok" : "base";
    const C: Vec3 = [X, Y, Z];
    const put = (u: number, v: number, w: number): Vec3 => rotX(add(C, [u, v, w]), C, T);
    // Its shadow on the tiles, while it floats.
    if (!empty && T < 0.05) scene.disc(X, Y, BOARD_TOP + 7.1, LENS, "faint", { opacity: clamp((Z - 20) / 20) * 0.8 });

    // The lens: a rim with depth and a glint, then the collar and handle reaching out toward the viewer.
    const ring = (r: number, w: number, a0 = 0, a1 = Math.PI * 2): Vec3[] =>
      Array.from({ length: 25 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 24; return put(r * Math.cos(a), r * Math.sin(a), w); });
    scene.polyline(ring(LENS, 0, -Math.PI / 4, (3 * Math.PI) / 4), tone);
    scene.polyline(ring(LENS, 3), tone, { bold: true, closed: true });
    scene.polyline(ring(LENS - RIM, 3), tone === "ghost" ? "ghost" : "muted", { closed: true });
    scene.line(put(LENS * Math.cos(-Math.PI / 4), LENS * Math.sin(-Math.PI / 4), 0), put(LENS * Math.cos(-Math.PI / 4), LENS * Math.sin(-Math.PI / 4), 3), tone);
    scene.line(put(LENS * Math.cos(0.75 * Math.PI), LENS * Math.sin(0.75 * Math.PI), 0), put(LENS * Math.cos(0.75 * Math.PI), LENS * Math.sin(0.75 * Math.PI), 3), tone);
    if (!empty) scene.polyline(ring(LENS - 7, 3, Math.PI * 1.05, Math.PI * 1.45), "faint");

    const hu = HANDLE[0], hv = HANDLE[1];
    tube(scene, put(hu * LENS, hv * LENS, 1.5), put(hu * (LENS + 7), hv * (LENS + 7), 1.5), 3, 3, tone);
    const mid = LENS + 7 + 17;
    obox(scene, put(hu * mid, hv * mid, 1.5), [hu * 17, hv * 17 * Math.cos(T), hv * 17 * Math.sin(T)],
      [-hv * 3.6, hu * 3.6 * Math.cos(T), hu * 3.6 * Math.sin(T)], [0, -2.8 * Math.sin(T), 2.8 * Math.cos(T)], tone);
  },
});
