import { defineFigure } from "../../core/define";
import { bump, lerp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { envelope, person } from "../shapes";

const SENDER: [number, number] = [-56, 20];
const MAX = 6;
const RADIUS = 66;
const PAD = 12;
const targets = (n: number) => Array.from({ length: n }, (_, k) => {
  const a = -1.9 + (k / Math.max(1, n - 1)) * 1.9;
  return [SENDER[0] + 42 + RADIUS * Math.cos(a), SENDER[1] - 20 + RADIUS * Math.sin(a)] as [number, number];
});

/** One brand messaging many creators at once. Use for outreach, campaigns invites and bulk messaging. `count`: creators, 2–6. */
export const outreach = defineFigure({
  name: "Outreach",
  label: "Envelopes flying from a brand to several creators",
  offset: 10,
  setup: ({ spring }) => ({ reached: Array.from({ length: MAX }, () => spring(0, 150, 20)), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const n = ctx.count(4, MAX, 2);
    const spots = targets(n);
    const bad = n - 2;
    const lift = m.lift.to(state === "idle" ? ctx.hover * 10 : 0).value;
    const [sx, sy] = SENDER;

    // The brand: a block on its own plate, with the next envelope waiting on top.
    scene.box(sx, sy, 0, 46, 46, 4, "base");
    scene.box(sx, sy, 4, 32, 32, 28, empty ? "ghost" : state === "loading" ? "hi" : "base");
    if (!empty) scene.line([sx - 10, sy + 16.05, 24], [sx + 10, sy + 16.05, 24], "muted");
    if (state === "idle") envelope(scene, sx, sy, 32 + lift, "base", undefined, 0.5);

    const q = state === "loading" ? ctx.progress(n * 0.5 + 0.4) * (n + 0.8) : 0;
    const items: { depth: number; draw: () => void }[] = [];
    spots.forEach(([tx, ty], k) => {
      const failed = state === "error" && k === bad;
      const reached = state === "success" || (state === "error" && !failed) || (state === "loading" && q > k + 1);
      const R = m.reached[k]!.to(reached ? 1 : 0).value;
      // The route runs along the floor from the brand's plate to the creator's pad.
      const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const from: Vec3 = [sx + ux * 30, sy + uy * 30, 0], to: Vec3 = [tx - ux * (PAD + 3), ty - uy * (PAD + 3), 0];
      if (!empty) {
        if (failed) {
          const mid = (len - 30 - PAD - 3) / 2 + 30;
          scene.line(from, [sx + ux * (mid - 13), sy + uy * (mid - 13), 0], "err");
          scene.line([sx + ux * (mid + 13), sy + uy * (mid + 13), 0], to, "err");
        } else {
          scene.line(from, to, R > 0.5 ? (state === "success" ? "ok" : "muted") : "faint");
        }
      }
      const tone: Tone = empty ? "ghost" : failed ? "err" : R > 0.5 && state === "success" ? "ok" : "base";
      items.push({ depth: tx + ty, draw: () => {
        scene.cylinder(tx, ty, 0, PAD, 3, empty ? "ghost" : "base");
        person(scene, tx + (failed ? shake : 0), ty, 3, tone, undefined, 0.85);
        if (R > 0.05 && !failed) envelope(scene, tx + 14, ty + 14, 0, state === "success" ? "ok" : "base", R, 0.34);
      } });
      if (state === "loading" && q > k && q < k + 1) {
        const p = q - k;
        items.push({ depth: 998, draw: () => envelope(scene, lerp(sx, tx, p), lerp(sy, ty, p), 34 * (1 - p) + 30 * bump(p) + 6 * p, "hi", undefined, 0.5) });
      }
    });
    items.sort((a, b) => a.depth - b.depth).forEach(p => p.draw());

  },
});
