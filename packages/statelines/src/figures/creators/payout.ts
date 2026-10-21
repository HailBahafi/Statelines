import { defineFigure } from "../../core/define";
import { bump, lerp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { badge, coins, frontArc, person } from "../shapes";

const VAULT: [number, number] = [-34, -34];
const VAULT_S = 40;
const VAULT_H = 30;
const CREATORS: [number, number][] = [[-38, 56], [12, 12], [52, -38]];
const EARNED = [3, 4, 2];
const PAD = 12;
/** Each creator's stack stands just to the right of their pad. */
const stackAt = ([x, y]: [number, number]): [number, number] => [x + 15, y - 15];

/** Coins flowing from a treasury to each creator. Use for creator payouts, commissions and payment runs. */
export const payout = defineFigure({
  name: "Payout",
  label: "Coins flowing from a treasury to creators",
  offset: 2,
  setup: ({ spring }) => ({ paid: CREATORS.map(() => spring(0, 150, 20)), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const [vx, vy] = VAULT, top = 4 + VAULT_H, face = vy + VAULT_S / 2 + 0.05;
    const q = state === "loading" ? ctx.progress(2.4) * 3 : 0;
    const L = m.lift.to(state === "idle" ? ctx.hover * 10 : 0).value;

    scene.box(4, 4, 0, 144, 144, 4, "base");

    // The vault: a block with a round door and a coin waiting on top.
    scene.box(vx, vy, 4, VAULT_S, VAULT_S, VAULT_H, empty ? "ghost" : state === "loading" ? "hi" : "base");
    if (!empty) {
      scene.polyline(frontArc(vx, face, 4 + VAULT_H / 2, 9, 0, Math.PI * 2, 20), "muted");
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        scene.line([vx + 3 * Math.cos(a), face, 19 + 3 * Math.sin(a)], [vx + 7 * Math.cos(a), face, 19 + 7 * Math.sin(a)], "muted");
      }
      if (state === "idle") scene.cylinder(vx, vy, top + L, 8, 3, "base");
    }

    const items: { depth: number; draw: () => void }[] = [];
    CREATORS.forEach(([x, y], k) => {
      const failed = state === "error" && k === 1;
      const done = state === "success" || (state === "error" && !failed) || q > k + 1;
      const P = m.paid[k]!.to(done ? 1 : 0).value;
      const [sx, sy] = stackAt([x, y]);
      // The route runs along the floor from the vault's foot to the creator's pad.
      const dx = x - vx, dy = y - vy, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const from: Vec3 = [vx + ux * 30, vy + uy * 30, 4.05], to: Vec3 = [x - ux * (PAD + 3), y - uy * (PAD + 3), 4.05];
      if (failed) {
        const mid = (30 + len - PAD - 3) / 2;
        scene.line(from, [vx + ux * (mid - 14), vy + uy * (mid - 14), 4.05], "err");
        scene.line([vx + ux * (mid + 14), vy + uy * (mid + 14), 4.05], to, "err");
        items.push({ depth: 999, draw: () => badge(scene, vx + ux * mid + shake, vy + uy * mid, 4, state, ctx.fade(), 11) });
      } else if (!empty) {
        scene.line(from, to, P > 0.5 ? (state === "success" ? "ok" : "muted") : "faint");
      }
      const tone: Tone = empty ? "ghost" : failed ? "err" : done && state === "success" ? "ok" : "base";
      items.push({ depth: x + y, draw: () => {
        scene.cylinder(x, y, 4, PAD, 3, empty ? "ghost" : "base");
        person(scene, x + (failed ? shake : 0), y, 7, tone);
      } });
      const stack = Math.round(EARNED[k]! * P);
      if (stack) items.push({ depth: sx + sy, draw: () => coins(scene, sx, sy, 4, stack, "base", state === "success" ? "ok" : "base", 8) });
      if (state === "loading" && q > k && q < k + 1) {
        const f = q - k, z = lerp(top, 4 + EARNED[k]! * 5, f) + 34 * bump(f);
        items.push({ depth: 998, draw: () => scene.cylinder(lerp(vx, sx, f), lerp(vy, sy, f), z, 8, 3, "hi") });
      }
    });
    items.sort((a, b) => a.depth - b.depth).forEach(i => i.draw());

    if (state === "success") badge(scene, vx, vy, top, state, ctx.fade());
  },
});
