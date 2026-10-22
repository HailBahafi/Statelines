import { defineFigure } from "../../core/define";
import type { Vec3, Tone } from "../../engine/scene";
import { frontArc } from "../shapes";

type UZ = [number, number];

/** A rounded rectangle on the vertical plane y, centred on (cx, cz): clockwise from the top-right corner. */
function rounded(cx: number, y: number, cz: number, a: number, b: number, r: number, steps = 4): Vec3[] {
  const out: Vec3[] = [];
  const corners: UZ[] = [[cx + a - r, cz + b - r], [cx + a - r, cz - b + r], [cx - a + r, cz - b + r], [cx - a + r, cz + b - r]];
  corners.forEach(([x, z], k) => {
    for (let i = 0; i <= steps; i++) {
      const t = Math.PI / 2 - (Math.PI / 2) * (k + i / steps);
      out.push([x + r * Math.cos(t), y, z + r * Math.sin(t)]);
    }
  });
  return out;
}

/** The plans, left to right: centre, half-width, half-height, how far forward, and how many features. */
const CARDS = [
  { x: -60, a: 23, b: 40, y: 0, rows: 3 },
  { x: 0, a: 26, b: 47, y: 10, rows: 4 },
  { x: 60, a: 23, b: 40, y: 0, rows: 3 },
];
const POPULAR = 1;
const D = 5;
const R = 6;

/** Three plans, one chosen. Use for pricing, plan pickers, upgrades and tiers. */
export const plans = /*#__PURE__*/ defineFigure({
  name: "Plans",
  label: "A pricing page with three plan cards, one chosen",
  offset: 15,
  setup: ({ spring }) => ({
    lifts: CARDS.map(() => spring(0)),
    press: spring(0, 200, 18),
    tip: spring(0, 120, 12),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const empty = state === "empty";
    let chosen = POPULAR;
    if (state === "idle" && ctx.pointer.over > 0.3) {
      chosen = CARDS.reduce((best, c, i) => (Math.abs(g.x - c.x) < Math.abs(g.x - CARDS[best]!.x) ? i : best), 0);
    }
    if (state === "loading") chosen = Math.floor(ctx.time * 2.5) % 3;
    if (empty) chosen = -1;
    const lift = state === "success" ? 18 : state === "loading" ? 10 : state === "idle" ? 8 * ctx.hover : 0;
    const press = m.press.to(state === "success" ? 1 : 0).value;
    const tip = m.tip.to(state === "error" ? 1 : 0).value;

    scene.box(0, 0, 0, 194, 76, 4, "base");

    CARDS.forEach((c, i) => {
      const on = i === chosen;
      const L = Math.max(0, m.lifts[i]!.to(on ? lift : 0).value);
      const tone: Tone = empty ? "ghost" : !on ? "base" : state === "loading" ? "hi" : ctx.verdict();
      const ink: Tone = tone === "base" ? "muted" : tone;
      const zb = 4 + L, zt = zb + c.b * 2, face = c.y + D / 2;
      // On error the chosen card keels over sideways onto its corner.
      const turn = on && state === "error" ? -0.2 * tip : 0, cs = Math.cos(turn), sn = Math.sin(turn);
      const T = (u: number, z: number, d = 0.05): Vec3 => {
        const pu = u - c.a, pz = z - zb;
        return [c.x + (on ? shake : 0) + c.a + pu * cs - pz * sn, face + d, zb + pu * sn + pz * cs];
      };
      const shape = (u0: number, u1: number, z0: number, z1: number, r: number, d: number) =>
        rounded((u0 + u1) / 2, 0, (z0 + z1) / 2, (u1 - u0) / 2, (z1 - z0) / 2, r, 3).map(([u, , z]) => T(u, z, d));

      // The card: its back edge, then its face.
      const front = shape(-c.a, c.a, zb, zt, R, 0), back = shape(-c.a, c.a, zb, zt, R, -D);
      if (empty) { scene.panel(front, "ghost"); return; }
      const band = [12, 13, 14, 15, 0, 1, 2, 3, 4, 5, 6, 7];
      scene.panel([...band.map(k => back[k]!), ...band.slice().reverse().map(k => front[k]!)], tone);
      scene.panel(front, tone);

      // The popular plan wears a ribbon over its top corner.
      if (i === POPULAR) {
        scene.panel([T(9, zt + 4, 0.6), T(18, zt + 4, 0.6), T(18, zt - 13, 0.6), T(13.5, zt - 9, 0.6), T(9, zt - 13, 0.6)], tone);
        scene.line(T(11, zt + 1, 0.7), T(16, zt + 1, 0.7), ink);
      }
      // Name, price, divider and the feature list.
      const left = -c.a + 7;
      scene.line(T(left, zt - 9), T(left + 14, zt - 9), "faint");
      scene.line(T(left, zt - 18), T(left + 18, zt - 18), ink, { bold: true });
      scene.line(T(left, zt - 15.5), T(left + 18, zt - 15.5), ink, { bold: true });
      scene.line(T(left + 21, zt - 18), T(left + 27, zt - 18), "faint");
      scene.line(T(-c.a + 4, zt - 25), T(c.a - 4, zt - 25), "faint");
      for (let r = 0; r < c.rows; r++) {
        const z = zt - 32 - r * 7;
        scene.panel(frontArc(T(left + 1, z)[0], face + 0.1, T(left + 1, z)[2], 1.3, 0, Math.PI * 2, 6), ink);
        scene.line(T(left + 5, z), T(c.a - 7 - ((r * 7) % 12), z), "faint");
      }
      // The button stands proud of the card; choosing a plan presses it flush.
      const depth = on ? 2.5 - 2 * press : 2.5;
      const btn = shape(-c.a + 5, c.a - 5, zb + 6, zb + 15, 4.5, 0.1);
      scene.panel(btn, tone);
      scene.panel(shape(-c.a + 5, c.a - 5, zb + 6, zb + 15, 4.5, depth), tone);
      scene.line(T(-7, zb + 10.5, depth + 0.05), T(7, zb + 10.5, depth + 0.05), ink, { bold: i === POPULAR || on });
    });
  },
});
