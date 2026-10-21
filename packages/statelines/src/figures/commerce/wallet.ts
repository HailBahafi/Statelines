import { defineFigure } from "../../core/define";
import type { Tone } from "../../engine/scene";
import { badge } from "../shapes";

const MAX = 10;
const PITCH = 6;
const WALLET = { x: -30, y: 14, w: 70, d: 50, h: 16 };
const STACK = [34, -16] as const;
const R = 18;
/** Where a coin that slips off lands. */
const SLIPPED = [60, 22] as const;

/** Coins stack up beside a wallet. Use for balances, credits, payouts and rewards. `count`: coins, 1–10. */
export const wallet = defineFigure({
  name: "Wallet",
  label: "Coins stacking into a balance",
  offset: 12,
  setup: ({ spring }) => ({
    coins: Array.from({ length: MAX }, (_, k) => ({
      z: spring(k < 6 ? 4 + k * PITCH : 4 + k * PITCH + 40, 160, 20),
      x: spring(0), y: spring(0), opacity: spring(k < 6 ? 1 : 0, 150, 22),
    })),
    flap: spring(0),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const coins = ctx.count(6, MAX, 1);
    let count = coins;
    if (empty) count = 0;
    if (state === "loading") {
      const q = ctx.progress(coins * 0.5 + 0.6);
      count = ctx.determinate ? Math.round(q * coins) : Math.min(coins, 1 + Math.floor(q * (coins + 1)));
    }
    const slipped = state === "error" ? coins - 1 : -1;
    const [sx, sy] = STACK;
    let topZ = 4;

    scene.box(4, 0, 0, 160, 104, 4, "base");

    // The wallet: a folded body with its flap and clasp; the flap lifts toward the pointer.
    const { x, y, w, d, h } = WALLET;
    const F = m.flap.to(state === "idle" ? ctx.hover * 6 : state === "loading" ? 4 : 0).value;
    const body: Tone = empty ? "ghost" : "base";
    scene.box(x, y, 4, w, d, h, body);
    scene.box(x + 8, y, 4 + h + F, w - 16, d + 2, 4, body);
    if (!empty) scene.box(x + 8, y + d / 2 + 2, 4 + h - 6 + F, 10, 3, 8, "muted");

    if (empty) scene.cylinder(sx, sy, 4, R, 5, "ghost");
    m.coins.forEach((coin, k) => {
      const present = k < count;
      let z = present ? 4 + k * PITCH : 4 + k * PITCH + 40, dx = 0, dy = 0;
      if (k === slipped) { z = 4; dx = SLIPPED[0] - sx; dy = SLIPPED[1] - sy; }
      if (state === "idle" && k === count - 1) z += ctx.hover * 10;
      const Z = coin.z.to(z).value, X = coin.x.to(dx).value, Y = coin.y.to(dy).value, O = coin.opacity.to(present ? 1 : 0).value;
      if (k === slipped) return;
      const isTop = k === (slipped >= 0 ? slipped - 1 : count - 1);
      const tone: Tone = isTop ? (state === "loading" ? "hi" : ctx.verdict()) : "base";
      scene.cylinder(sx + X, sy + Y, Z, R, 5, tone, O);
      if (isTop) topZ = Z + 5;
    });

    if (slipped >= 0) {
      const c = m.coins[slipped]!;
      const cx = sx + c.x.value + shake, cy = sy + c.y.value;
      scene.cylinder(cx, cy, c.z.value, R, 5, "err");
      badge(scene, cx, cy, c.z.value + 5, state, ctx.fade(), 12);
    } else {
      badge(scene, sx, sy, topZ, state, ctx.fade(), 14);
    }
  },
});
