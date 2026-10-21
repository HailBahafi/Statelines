import { defineFigure } from "../../core/define";

const MAX = 10;
const PITCH = 6;
const MAIN = [-14, 10] as const;
const SIDE = [28, -16] as const;
const SLIDE = 40;

/** Coins stack up. Use for balances, credits, payouts and rewards. `count`: coins, 1–10. */
export const wallet = defineFigure({
  name: "Wallet",
  label: "Coins stacking into a balance",
  offset: 10,
  setup: ({ spring }) => ({
    coins: Array.from({ length: MAX }, (_, k) => ({
      z: spring(k < 6 ? k * PITCH : k * PITCH + 40, 160, 20), x: spring(0), opacity: spring(k < 6 ? 1 : 0, 150, 22),
    })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const coins = ctx.count(6, MAX, 1);
    let count = coins;
    if (state === "empty") count = 0;
    if (state === "loading") {
      const q = ctx.progress(coins * 0.5 + 0.6);
      count = ctx.determinate ? Math.round(q * coins) : Math.min(coins, 1 + Math.floor(q * (coins + 1)));
    }
    const falling = state === "error" ? coins - 1 : -1;
    let top = { x: MAIN[0], z: 0 };
    let fallen: (() => void) | undefined;

    if (state === "empty") scene.cylinder(MAIN[0], MAIN[1], 0, 20, 5, "ghost");
    m.coins.forEach((coin, k) => {
      const present = k < count;
      let z = present ? k * PITCH : k * PITCH + 40, x = 0;
      if (k === falling) { z = 0; x = SLIDE; }
      if (state === "idle" && k === count - 1) z += ctx.hover * 10;
      const Z = coin.z.to(z).value, X = coin.x.to(x).value, O = coin.opacity.to(present ? 1 : 0).value;
      if (k === falling) {
        fallen = () => {
          scene.cylinder(MAIN[0] + X + shake, MAIN[1], Z, 20, 5, "err");
          scene.cross(MAIN[0] + SLIDE + shake, MAIN[1], 5, "err", ctx.fade());
        };
        return;
      }
      const isTop = k === (falling >= 0 ? falling - 1 : count - 1);
      const tone = isTop ? (state === "loading" ? "hi" : ctx.verdict()) : "base";
      scene.cylinder(MAIN[0], MAIN[1], Z, 20, 5, tone, O);
      if (isTop) top = { x: MAIN[0], z: Z + 5 };
    });

    for (let k = 0; k < 3; k++) scene.cylinder(SIDE[0], SIDE[1], k * PITCH, 20, 5, state === "empty" ? "ghost" : "base");
    fallen?.();

    if (state === "success") scene.check(top.x, MAIN[1], top.z, "ok", ctx.fade());
  },
});
