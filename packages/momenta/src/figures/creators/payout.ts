import { defineFigure } from "../../core/define";
import { bump, lerp } from "../../engine/math";
import { coins, person } from "../shapes";

const TREASURY: [number, number] = [-6, -44];
const CREATORS: [number, number][] = [[-56, 26], [4, 40], [58, 14]];
const EARNED = [3, 4, 2];

/** Coins flowing from a treasury to each creator. Use for creator payouts, commissions and payment runs. */
export const payout = defineFigure({
  name: "Payout",
  label: "Coins flowing from a treasury to creators",
  offset: 6,
  setup: ({ spring }) => ({ paid: CREATORS.map(() => spring(0, 150, 20)), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const [tx, ty] = TREASURY;
    const q = state === "loading" ? ctx.progress(2.4) * 3 : 0;
    const L = m.lift.to(state === "idle" ? ctx.hover * 10 : 0).value;

    scene.box(0, 0, 0, 150, 120, 4, "base");
    if (state === "empty") {
      scene.cylinder(tx, ty, 4, 16, 5, "ghost");
      CREATORS.forEach(([x, y]) => person(scene, x, y, 4, "ghost"));
      return;
    }
    const top = coins(scene, tx, ty, 4, 6, "base", state === "loading" ? "hi" : "base", 16);
    if (state === "idle") scene.cylinder(tx, ty, top + L, 16, 4, "hi");

    CREATORS.forEach(([x, y], k) => {
      const failed = state === "error" && k === 1;
      const done = state === "success" || (state === "error" && !failed) || q > k + 1;
      const P = m.paid[k]!.to(done ? 1 : 0).value;
      scene.line([tx, ty, 4.05], [x, y, 4.05], failed ? "err" : P > 0.5 ? ctx.verdict("muted") : "ghost");
      const stack = Math.round(EARNED[k]! * P);
      if (stack) coins(scene, x + 18, y - 4, 4, stack, "base", state === "success" ? "ok" : "base", 9);
      person(scene, x + (failed ? shake : 0), y, 4, failed ? "err" : done ? ctx.verdict() : "base");
      if (failed) scene.cross(x + shake, y, 30, "err", ctx.fade());
      if (state === "loading" && q > k && q < k + 1) {
        const f = q - k;
        scene.cylinder(lerp(tx, x + 18, f), lerp(ty, y - 4, f), top + 30 * bump(f) - (top - 4) * f, 9, 4, "hi");
      }
    });

    if (state === "success") scene.check(tx, ty, top, "ok", ctx.fade());
  },
});
