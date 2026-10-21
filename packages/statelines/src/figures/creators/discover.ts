import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { person } from "../shapes";

const PITCH = 36;
const LENS_Z = 50;
const MATCHES = new Set([1, 5, 6]);
const SWEEP: [number, number][] = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2]];
const at = (k: number) => (k - 1) * PITCH;
const CARDS = Array.from({ length: 9 }, (_, n) => ({ n, i: n % 3, j: Math.floor(n / 3) }))
  .sort((a, b) => a.i + a.j - (b.i + b.j));

/** A lens sweeps a wall of creators and lifts the ones that fit. Use for creator search and discovery. */
export const discover = defineFigure({
  name: "Discover",
  label: "A lens finding matching creators in a grid",
  offset: 6,
  setup: ({ spring }) => ({ x: spring(at(2)), y: spring(at(0)), z: spring(LENS_Z), lifts: CARDS.map(() => spring(0)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(LENS_Z);
    let lx = at(2), ly = at(0), lz = LENS_Z;
    if (state === "idle" && ctx.pointer.over > 0.2) { lx = clamp(g.x, -40, 40); ly = clamp(g.y, -40, 40); }
    if (state === "loading") {
      const t = ctx.loop(SWEEP.length * 0.32) * SWEEP.length, [i, j] = SWEEP[Math.floor(t)]!;
      lx = at(i); ly = at(j);
    }
    if (state === "success") { lx = at(1); ly = at(1); }
    // Nothing fits: the lens sinks low over the middle of the wall.
    if (state === "error") { lx = at(1); ly = at(1); lz = 32; }
    const X = m.x.to(lx).value, Y = m.y.to(ly).value, Z = m.z.to(lz).value;

    scene.box(0, 0, 0, 128, 128, 4, "base");
    let floor = 4;
    for (const { n, i, j } of CARDS) {
      const x = at(i), y = at(j), near = Math.abs(X - x) < 18 && Math.abs(Y - y) < 18;
      if (state === "empty") { scene.box(x, y, 4, 30, 30, 3, "ghost"); continue; }
      const match = MATCHES.has(n);
      const lift = state === "success" ? (match ? 14 : 0) : (state === "idle" || state === "loading") && near ? 9 : 0;
      const L = m.lifts[n]!.to(lift).value;
      const tone: Tone = state === "success" && match ? "ok" : state === "error" ? "muted"
        : near && state === "loading" ? "hi" : "base";
      scene.box(x, y, 4 + L, 30, 30, 3, tone);
      person(scene, x - 2, y - 3, 7 + L, tone, undefined, 0.62);
      scene.line([x - 9, y + 10, 7.05 + L], [x + 5, y + 10, 7.05 + L], state === "error" ? "faint" : "muted");
      if (near) floor = 7 + L;
    }

    const lens: Tone = state === "empty" ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    // Where the lens looks: its circle cast down on the cards beneath it.
    if (state !== "empty") scene.disc(X, Y, floor + 0.1, 19, "faint");
    scene.disc(X + shake, Y, Z, 21, lens, { plate: true });
    scene.disc(X + shake, Y, Z, 16, "faint");
    scene.box(X + shake + 32, Y, Z - 2, 22, 6, 4, lens);
    if (state === "success") scene.check(X, Y, Z, "ok", ctx.fade());
    if (state === "error") scene.cross(X + shake, Y, Z, "err", ctx.fade());
  },
});
