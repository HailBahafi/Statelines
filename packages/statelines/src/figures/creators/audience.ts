import { defineFigure } from "../../core/define";
import { clamp, falloff } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { faceArc, person } from "../shapes";

/** The stage at the back; the crowd fans out in rows in front of it, facing it. */
const STAGE = { x: -40, y: -40, w: 60, d: 52, h: 10 };
const TOP = 4 + STAGE.h;
const CREATOR: [number, number] = [STAGE.x + 2, STAGE.y + 2];
const RING: [number, number] = [STAGE.x - 14, STAGE.y + 18];
const MIC: [number, number] = [STAGE.x + 18, STAGE.y - 6];
const ROWS = [{ r: 56, n: 3 }, { r: 76, n: 4 }, { r: 96, n: 5 }];
const CROWD = ROWS.flatMap(({ r, n }, row) => Array.from({ length: n }, (_, k) => {
  const a = Math.PI / 4 + (k - (n - 1) / 2) * (1.05 / Math.max(1, n - 1)) * (row ? 1 : 0.9);
  return { row, x: STAGE.x + r * Math.cos(a), y: STAGE.y + r * Math.sin(a), dx: Math.cos(a), dy: Math.sin(a) };
}));

/** A creator on a stage facing a crowd of followers. Use for audience insights and demographics. */
export const audience = defineFigure({
  name: "Audience",
  label: "A creator on a stage with a ring light, facing a crowd",
  offset: 4,
  setup: ({ spring }) => ({
    lifts: CROWD.map(() => spring(0, 160, 14)),
    shown: CROWD.map(() => spring(1, 150, 22)),
    away: CROWD.map(() => spring(0, 70, 14)),
    stand: spring(0, 140, 18),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(4);
    const empty = state === "empty";
    const fill = state === "loading" ? ctx.progress(2.6) * (CROWD.length + 1) : empty ? 0 : CROWD.length + 1;

    scene.box(-6, -6, 0, 150, 150, 4, "base");

    const items: { depth: number; draw: () => void }[] = [];
    CROWD.forEach((p, i) => {
      // People arrive front row first, in the order they are listed.
      const order = i;
      const here = order < fill;
      // On error the back rows turn away and drift off; on success everyone jumps.
      const leaving = state === "error" && p.row > 0;
      let lift = 0;
      if (state === "idle") lift = 8 * ctx.hover * falloff(Math.hypot(p.x - g.x, p.y - g.y), 20);
      if (state === "success") lift = 5 + 2 * p.row;
      const L = m.lifts[i]!.to(lift).value;
      const O = clamp(m.shown[i]!.to(here ? (leaving ? 0.45 : 1) : 0).value);
      const A = m.away[i]!.to(leaving ? 6 + 4 * p.row : 0).value;
      const x = p.x + p.dx * A, y = p.y + p.dy * A;
      const tone: Tone = state === "success" ? "ok"
        : leaving ? "faint"
        : state === "error" ? "err"
        : state === "loading" && fill - order < 1.2 ? "hi"
        : "base";
      if (empty) items.push({ depth: x + y, draw: () => scene.disc(x, y, 4.05, 6, "ghost") });
      else items.push({ depth: x + y, draw: () => person(scene, x, y, 4 + L, tone, O, 0.8) });
    });

    // The stage: a low platform with the creator, a ring light and a mic.
    const S = m.stand.to(state === "success" ? 4 : 0).value;
    const kit: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    const [sx, sy] = CREATOR, [rx, ry] = RING, [mx, my] = MIC;
    items.push({ depth: STAGE.x + STAGE.y - 30, draw: () => {
      scene.box(STAGE.x, STAGE.y, 4, STAGE.w, STAGE.d, STAGE.h, empty ? "ghost" : "base");
    } });
    items.push({ depth: mx + my - 6, draw: () => {
      // The mic: a stand and a round head.
      scene.cylinder(mx, my, TOP, 4, 1.5, empty ? "ghost" : "base");
      scene.cylinder(mx, my, TOP + 1.5, 1, 22, empty ? "ghost" : "base");
      scene.cylinder(mx, my, TOP + 23.5, 2.6, 5, kit);
    } });
    items.push({ depth: sx + sy - 4, draw: () => person(scene, sx + shake, sy, TOP + S, empty ? "ghost" : ctx.verdict(), undefined, 1.15) });
    items.push({ depth: rx + ry - 4, draw: () => {
      // The ring light: a tall stand and a ring facing the viewer.
      scene.cylinder(rx, ry, TOP, 5, 1.5, empty ? "ghost" : "base");
      scene.cylinder(rx, ry, TOP + 1.5, 1, 30, empty ? "ghost" : "base");
      scene.panel(faceArc(rx, ry, TOP + 44, 12, 0, Math.PI * 2, 24), kit);
      scene.panel(faceArc(rx, ry, TOP + 44, 7.5, 0, Math.PI * 2, 20), kit);
    } });
    items.sort((a, b) => a.depth - b.depth).forEach(i => i.draw());
  },
});
