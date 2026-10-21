import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import { person } from "../shapes";

const PITCH = 36;
const MATCHES = new Set([1, 5, 6]);
const SWEEP: [number, number][] = [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2]];
const at = (k: number) => (k - 1) * PITCH;
const CARDS = Array.from({ length: 9 }, (_, n) => ({ n, i: n % 3, j: Math.floor(n / 3) }))
  .sort((a, b) => a.i + a.j - (b.i + b.j));

/** A lens sweeps a wall of creators and lifts the ones that fit. Use for creator search and discovery. */
export const discover = defineFigure({
  name: "Discover",
  label: "A lens finding matching creators in a grid",
  offset: 4,
  setup: ({ spring }) => ({ x: spring(at(2)), y: spring(at(0)), lifts: CARDS.map(() => spring(0)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(56);
    let lx = at(2), ly = at(0);
    if (state === "idle" && ctx.pointer.over > 0.2) { lx = clamp(g.x, -40, 40); ly = clamp(g.y, -40, 40); }
    if (state === "loading") {
      const t = ctx.loop(SWEEP.length * 0.32) * SWEEP.length, [i, j] = SWEEP[Math.floor(t)]!;
      lx = at(i); ly = at(j);
    }
    if (state === "success") { lx = at(1); ly = at(1); }
    if (state === "error") { lx = 0; ly = 0; }
    const X = m.x.to(lx).value + shake, Y = m.y.to(ly).value;

    scene.box(0, 0, 0, 124, 124, 4, "base");
    for (const { n, i, j } of CARDS) {
      const x = at(i), y = at(j), under = Math.abs(X - x) < 18 && Math.abs(Y - y) < 18;
      const match = MATCHES.has(n);
      let lift = 0;
      if ((state === "idle" || state === "loading") && under) lift = 8;
      if (state === "success" && match) lift = 14;
      const L = m.lifts[n]!.to(lift).value;
      if (state === "empty") { scene.box(x, y, 4, 30, 30, 3, "ghost"); continue; }
      const tone = state === "success" && match ? "ok" : under && state !== "error" ? "hi" : state === "error" ? "muted" : "base";
      scene.box(x, y, 4 + L, 30, 30, 3, tone);
      person(scene, x, y, 7 + L, tone === "muted" ? "muted" : tone === "ok" ? "ok" : "base", undefined, 0.62);
    }

    const lens = state === "loading" ? "hi" : state === "idle" || state === "empty" ? "base" : ctx.verdict();
    scene.disc(X, Y, 56, 21, lens, { plate: true, opacity: 0.9 });
    scene.disc(X, Y, 56, 17, "faint");
    scene.line([X + 21, Y, 56], [X + 42, Y, 56], lens, { bold: true });
    if (state === "success") scene.check(X, Y, 56, "ok", ctx.fade());
    if (state === "error") scene.cross(X, Y, 56, "err", ctx.fade());
  },
});
