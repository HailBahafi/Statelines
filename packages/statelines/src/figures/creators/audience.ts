import { defineFigure } from "../../core/define";
import { TAU, falloff } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { person } from "../shapes";

const PLATE = 96;
const RINGS = [{ r: 34, n: 9 }, { r: 50, n: 13 }, { r: 66, n: 17 }];
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
  offset: -10,
  setup: ({ spring }) => ({
    lifts: CROWD.map(() => spring(0, 160, 18)),
    opacity: CROWD.map(() => spring(1, 150, 22)),
    stand: spring(0, 140, 18),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(4);
    const fill = state === "loading" ? ctx.progress(2.6) * 3.1 : state === "empty" ? 0 : 3.1;
    const empty = state === "empty";

    scene.cylinder(0, 0, 0, PLATE, 4, "base");
    RINGS.forEach(({ r }, k) => scene.arc(0, 0, 4.05, r, 0, TAU,
      empty ? "ghost" : state === "loading" && Math.floor(fill) === k ? "muted" : "faint"));

    const items: { depth: number; draw: () => void }[] = [];
    CROWD.forEach((p, i) => {
      const shown = p.order < fill;
      const core = inSector(p.a);
      // On error the outer rings drift away: they sink to the plate and fade.
      const lost = state === "error" && p.ring > 0;
      let lift = 0;
      if (state === "idle") lift = 9 * ctx.hover * falloff(Math.hypot(p.x - g.x, p.y - g.y), 18);
      if (state === "success" && core) lift = 7;
      const L = m.lifts[i]!.to(lift).value, O = m.opacity[i]!.to(shown ? (lost ? 0.35 : 1) : 0).value;
      const tone: Tone = state === "success" && core ? "ok"
        : lost ? "faint"
        : state === "error" ? "err"
        : state === "loading" && fill - p.order < 0.35 ? "hi"
        : p.ring === 0 ? "base" : "muted";
      items.push({ depth: p.x + p.y, draw: () => scene.cylinder(p.x, p.y, 4 + L, 3.4, 7, tone, O) });
    });
    const S = m.stand.to(state === "success" ? 6 : 0).value;
    items.push({ depth: 0, draw: () => {
      scene.cylinder(0, 0, 4, 15, 6 + S, empty ? "ghost" : "base");
      person(scene, shake, 0, 10 + S, empty ? "ghost" : ctx.verdict(), undefined, 1.2);
    } });
    items.sort((a, b) => a.depth - b.depth).forEach(i => i.draw());

  },
});
