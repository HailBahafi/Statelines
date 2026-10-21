import { defineFigure } from "../../core/define";
import { bump, lerp } from "../../engine/math";
import { envelope, person } from "../shapes";

const SENDER: [number, number] = [-54, 22];
const MAX = 6;
const RADIUS = 66;
const targets = (n: number) => Array.from({ length: n }, (_, k) => {
  const a = -1.9 + (k / Math.max(1, n - 1)) * 1.9;
  return [SENDER[0] + 40 + RADIUS * Math.cos(a), SENDER[1] - 22 + RADIUS * Math.sin(a)] as [number, number];
});

/** One brand messaging many creators at once. Use for outreach, campaigns invites and bulk messaging. `count`: creators, 2–6. */
export const outreach = defineFigure({
  name: "Outreach",
  label: "Envelopes flying from a brand to several creators",
  offset: 8,
  setup: ({ spring }) => ({ reached: Array.from({ length: MAX }, () => spring(0, 150, 20)), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(4, MAX, 2);
    const spots = targets(n);
    const bad = n - 2;
    const lift = m.lift.to(state === "idle" ? ctx.hover * 10 : 0).value;
    const [sx, sy] = SENDER;

    scene.box(sx, sy, 0, 34, 34, 30, state === "empty" ? "muted" : "base");
    if (state === "idle") envelope(scene, sx, sy, 32 + lift, "base", undefined, 0.5);

    const q = state === "loading" ? ctx.progress(n * 0.5 + 0.4) * (n + 0.8) : 0;
    const people: { depth: number; draw: () => void }[] = [];
    spots.forEach(([tx, ty], k) => {
      const reached = state === "success" || (state === "error" && k !== bad) || (state === "loading" && q > k + 1);
      const R = m.reached[k]!.to(reached ? 1 : 0).value;
      const linkTone = state === "error" && k === bad ? "err" : R > 0.5 ? (state === "success" ? "ok" : "muted") : "ghost";
      if (state !== "empty") scene.line([sx, sy, 2], [tx, ty, 2], linkTone);
      const tone = state === "empty" ? "ghost" : state === "error" && k === bad ? "err" : R > 0.5 ? ctx.verdict("base") : "muted";
      people.push({ depth: tx + ty, draw: () => {
        person(scene, tx + (state === "error" && k === bad ? shake : 0), ty, 0, tone, undefined, 0.85);
        if (R > 0.5 && state !== "error") envelope(scene, tx + 10, ty + 10, 0, state === "success" ? "ok" : "base", R, 0.34);
      } });
      if (state === "loading" && q > k && q < k + 1) {
        const p = q - k;
        people.push({ depth: 999, draw: () => envelope(scene, lerp(sx, tx, p), lerp(sy, ty, p), 32 + 30 * bump(p), "hi", undefined, 0.5) });
      }
    });
    people.sort((a, b) => a.depth - b.depth).forEach(p => p.draw());

    if (state === "success") scene.check(sx, sy, 30, "ok", ctx.fade());
    if (state === "error") scene.cross(spots[bad]![0] + shake, spots[bad]![1], 26, "err", ctx.fade());
  },
});
