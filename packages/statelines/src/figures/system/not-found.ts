import { defineFigure } from "../../core/define";
import { bump, clamp, wrap } from "../../engine/math";

const N = 5;
const PITCH = 22;
const HOLE = { i: 3, j: 1 };
const at = (k: number) => (k - (N - 1) / 2) * PITCH;
const TILES = Array.from({ length: N * N }, (_, n) => ({ i: n % N, j: Math.floor(n / N) }))
  .filter(t => t.i !== HOLE.i || t.j !== HOLE.j)
  .sort((a, b) => a.i + a.j - (b.i + b.j));
const HOPS = [[0, 4], [1, 3], [2, 2], [1, 1], [3, 1]] as const;

/** A pin searching a grid for a missing tile. Use for 404s, missing pages and lost items. */
export const notFound = defineFigure({
  name: "NotFound",
  label: "A pin over a grid with a missing tile",
  offset: 4,
  setup: ({ spring }) => ({ x: spring(at(HOLE.i)), y: spring(at(HOLE.j)), fill: spring(40, 150, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(10);
    let x = at(HOLE.i), y = at(HOLE.j), hop = 0;
    if (state === "idle" && ctx.pointer.over > 0.2) { x = clamp(g.x, -48, 48); y = clamp(g.y, -48, 48); }
    if (state === "loading") {
      const t = ctx.time * 2.2, [i, j] = HOPS[Math.floor(t) % HOPS.length]!;
      x = at(i); y = at(j); hop = bump(wrap(t, 1));
    }
    const X = m.x.to(x).value + shake, Y = m.y.to(y).value;
    const F = m.fill.to(state === "success" ? 0 : 40).value;
    const hx = at(HOLE.i), hy = at(HOLE.j);

    scene.box(0, 0, 0, 120, 120, 4, "base");
    const hole = () => {
      scene.rect(hx - 9.5, hy - 9.5, hx + 9.5, hy + 9.5, 4, state === "error" ? "err" : "ghost");
      if (state === "success" || F < 39) scene.box(hx, hy, 4 + F, 19, 19, 6, "ok", 1 - F / 40);
    };
    let holeDrawn = false;
    for (const t of TILES) {
      if (!holeDrawn && t.i + t.j > HOLE.i + HOLE.j) { hole(); holeDrawn = true; }
      scene.box(at(t.i), at(t.j), 4, 19, 19, 6, state === "empty" ? "ghost" : "base");
    }
    if (!holeDrawn) hole();
    if (state === "error") scene.cross(hx, hy, 4, "err", ctx.fade());

    const pin = state === "empty" ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    const z = 16 + 12 * hop;
    scene.cylinder(X, Y, z, 2.2, 24, pin);
    scene.cylinder(X, Y, z + 24, 8, 8, pin);
    if (state === "success") scene.check(X, Y, z + 32, "ok", ctx.fade());
  },
});
