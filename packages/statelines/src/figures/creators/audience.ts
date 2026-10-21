import { defineFigure } from "../../core/define";
import { TAU, falloff } from "../../engine/math";
import { person } from "../shapes";

const RINGS = [{ r: 36, n: 9 }, { r: 54, n: 13 }, { r: 72, n: 17 }];
const SECTOR = [-2.5, -1.1];
const CROWD = RINGS.flatMap(({ r, n }, ring) =>
  Array.from({ length: n }, (_, k) => {
    const a = (k / n) * TAU + ring * 0.21;
    return { ring, a, x: r * Math.cos(a), y: r * Math.sin(a), order: ring + k / n };
  })).sort((p, q) => p.x + p.y - (q.x + q.y));
const inSector = (a: number) => {
  const w = ((a % TAU) + TAU) % TAU - Math.PI;
  return w > SECTOR[0]! && w < SECTOR[1]!;
};

/** A creator inside rings of followers, with the core audience lit. Use for audience insights and demographics. */
export const audience = defineFigure({
  name: "Audience",
  label: "A creator surrounded by rings of followers",
  offset: -6,
  setup: ({ spring }) => ({ lifts: CROWD.map(() => spring(0, 160, 18)), opacity: CROWD.map(() => spring(1, 150, 22)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const fill = state === "loading" ? ctx.progress(2.6) * 3.1 : state === "empty" ? 0 : 3.1;

    if (state === "empty") RINGS.forEach(({ r }) => scene.arc(0, 0, 0, r, 0, TAU, "ghost"));
    const items: { depth: number; draw: () => void }[] = [];
    CROWD.forEach((p, i) => {
      const shown = p.order < fill;
      let lift = 0;
      if (state === "idle") lift = 9 * ctx.hover * falloff(Math.hypot(p.x - g.x, p.y - g.y), 18);
      if (state === "success" && inSector(p.a)) lift = 6;
      const L = m.lifts[i]!.to(lift).value, O = m.opacity[i]!.to(shown ? 1 : 0).value;
      const tone = state === "success" && inSector(p.a) ? "ok"
        : state === "error" ? (i % 4 === 0 ? "err" : "muted")
        : state === "loading" && fill - p.order < 0.35 ? "hi"
        : p.ring === 0 ? "base" : "muted";
      items.push({ depth: p.x + p.y, draw: () => scene.cylinder(p.x + (state === "error" ? shake * 0.3 : 0), p.y, L, 3.2, 7, tone, O) });
    });
    items.push({ depth: 0, draw: () => {
      scene.cylinder(0, 0, 0, 16, 8, "base");
      person(scene, shake, 0, 8, state === "empty" ? "muted" : ctx.verdict(), undefined, 1.25);
    } });
    items.sort((a, b) => a.depth - b.depth).forEach(i => i.draw());

    if (state === "success") scene.check(0, 30, 0, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 30, 0, "err", ctx.fade());
  },
});
