import { defineFigure } from "../../core/define";
import type { Scene, Tone, Vec3 } from "../../engine/scene";


type At = (u: number, v: number, z: number) => Vec3;

/** A rounded rectangle lying flat, centred on the origin: points with the angle of their outward normal. */
function outline(w: number, d: number, r: number, steps = 3): { u: number; v: number; n: number }[] {
  const a = w / 2 - r, b = d / 2 - r, out: { u: number; v: number; n: number }[] = [];
  for (const [x, y, n0] of [[a, -b, -Math.PI / 2], [a, b, 0], [-a, b, Math.PI / 2], [-a, -b, Math.PI]] as const) {
    for (let i = 0; i <= steps; i++) {
      const n = n0 + (Math.PI / 2) * (i / steps);
      out.push({ u: x + r * Math.cos(n), v: y + r * Math.sin(n), n });
    }
  }
  return out;
}

/**
 * A slab with rounded corners lying flat, turned by `rot` about its centre. Draws its near edge and
 * its top, and returns a mapping from local (u, v, z) to world points for the detail drawn on it.
 */
function flat(scene: Scene, cx: number, cy: number, z: number, w: number, d: number, h: number, r: number,
              tone: Tone, rot = 0, opacity?: number): At {
  const c = Math.cos(rot), s = Math.sin(rot);
  const at: At = (u, v, zz) => [cx + u * c - v * s, cy + u * s + v * c, zz];
  const pts = outline(w, d, r);
  const top = pts.map(p => at(p.u, p.v, z + h));
  if (tone === "ghost") {
    scene.panel(top, "ghost", opacity);
    return at;
  }
  // The edge that faces the viewer: the run of points whose normal points toward x+ and y+.
  const N = pts.length, near = pts.map(p => Math.cos(p.n + rot) + Math.sin(p.n + rot) > 0);
  const start = Math.max(0, near.findIndex((v, i) => v && !near[(i - 1 + N) % N]));
  const run: number[] = [];
  for (let i = start - 1; run.length < N; i++) {
    const j = (i + N) % N;
    run.push(j);
    if (!near[j] && run.length > 1) break;
  }
  const edge = (zz: number) => run.map(j => at(pts[j]!.u, pts[j]!.v, zz));
  scene.panel([...edge(z), ...edge(z + h).reverse()], tone, opacity);
  scene.panel(top, tone, opacity);
  return at;
}

const MAX = 10;
const PITCH = 5;
const R = 14;
/** The closed bifold lies on the plate, its long side running across the view: centre, size, turn and the thickness of each half. */
const W = { x: -12, y: 8, w: 104, d: 62, h: 6, r: 8, rot: -0.7 };
const STACK = [64, -24] as const;
/** Where a coin that slips off the stack rolls to. */
const SLIPPED = [34, 38] as const;
/** The cards fanned out of the slots along the open edge: where each sits, its turn, and how far it sticks out. */
const FAN = [[-30, 0.26, 18], [-20, 0.1, 24], [-9, -0.08, 27]] as const;
const CARD = { w: 46, d: 30 };

/** A wallet stuffed with cards and cash, coins stacking beside it. Use for balances, credits, payouts and rewards. `count`: coins, 1–10. */
export const wallet = /*#__PURE__*/ defineFigure({
  name: "Wallet",
  label: "A leather wallet with cards and banknotes sticking out, coins stacking into a balance",
  offset: 6,
  setup: ({ spring }) => ({
    coins: Array.from({ length: MAX }, (_, k) => ({
      z: spring(k < 6 ? 4 + k * PITCH : 4 + k * PITCH + 40, 160, 20),
      x: spring(0), y: spring(0), opacity: spring(k < 6 ? 1 : 0, 150, 22),
    })),
    card: spring(0),
    bills: spring(0, 140, 16),
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
    const leather: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    const ink: Tone = leather === "base" ? "muted" : leather;

    scene.box(0, 0, 0, 176, 128, 4, "base");

    // The lower half of the closed wallet.
    const low = flat(scene, W.x, W.y, 4, W.w, W.d, W.h, W.r, leather, W.rot);
    if (empty) {
      scene.cylinder(sx, sy, 4, R, 4, "ghost");
    } else {
      const mid = 4 + W.h;
      // Banknotes poke out of the open edge: further on success, pulled back in on error.
      const B = m.bills.to(state === "success" ? 1 : state === "error" ? -0.9 : 0).value;
      for (const [k, du, turn] of [[0, 18, 0.08], [1, 25, -0.05]] as const) {
        const out = 21 + 16 * B - k * 4;
        if (out < 0.5) continue;
        const [bx, by] = low(du, -W.d / 2 + 18 - out, 0);
        const bill = flat(scene, bx, by, mid + 0.1 + k * 0.6, 50, 36, 0.6, 1, leather === "ok" ? "ok" : "base", W.rot + turn);
        const t = mid + 0.75 + k * 0.6;
        scene.polyline([bill(-21, -4, t), bill(-21, -14, t), bill(21, -14, t), bill(21, -4, t)], "faint");
        if (k === 1) scene.disc(...(bill(0, -8, t).slice(0, 2) as [number, number]), t, 4, ink);
      }
      // Cards fan out of the slots; on hover the front one slides a little further.
      const slide = m.card.to(state === "idle" ? ctx.hover * 6 : 0).value;
      FAN.forEach(([du, a, out0], i) => {
        const out = out0 + (i === FAN.length - 1 ? slide : 0);
        const [cx, cy] = low(du, -W.d / 2 + CARD.d / 2 - out, 0);
        const z = mid + 0.2 + i * 1.1, card = flat(scene, cx, cy, z, CARD.w, CARD.d, 1, 3, "base", W.rot + a);
        const t = z + 1.05;
        if (i === FAN.length - 1) scene.polyline([card(-17, -10, t), card(-9, -10, t), card(-9, -4, t), card(-17, -4, t)], "muted", { closed: true });
        else scene.line(card(-19, -9, t), card(19, -9, t), "faint", { bold: true });
      });
      // The upper half, a little narrower at the open edge, with stitching round it.
      const top = flat(scene, ...(low(0, 1.2, 0).slice(0, 2) as [number, number]), mid, W.w - 2, W.d - 2.4, W.h, W.r, leather, W.rot);
      const t = mid + W.h + 0.05;
      scene.polyline(outline(W.w - 10, W.d - 10, W.r - 3, 2).map(p => top(p.u, p.v, t)), "ghost", { closed: true });
      // The strap that wraps round the end and closes with a snap.
      const strap = flat(scene, ...(top(W.w / 2 - 9, 0, 0).slice(0, 2) as [number, number]), t, 26, 18, 1.4, 6, leather, W.rot);
      const [px, py] = strap(5, 0, 0);
      scene.cylinder(px, py, t + 1.4, 3.6, 1.6, leather);
    }

    m.coins.forEach((coin, k) => {
      const present = k < count;
      let z = present ? 4 + k * PITCH : 4 + k * PITCH + 40, dx = 0, dy = 0;
      if (k === slipped) { z = 4; dx = SLIPPED[0] - sx; dy = SLIPPED[1] - sy; }
      const Z = coin.z.to(z).value, X = coin.x.to(dx).value, Y = coin.y.to(dy).value, O = coin.opacity.to(present ? 1 : 0).value;
      if (k === slipped) return;
      const isTop = k === (slipped >= 0 ? slipped - 1 : count - 1);
      const tone: Tone = isTop ? (state === "loading" ? "hi" : ctx.verdict()) : "base";
      scene.cylinder(sx + X, sy + Y, Z, R, 4, tone, O);
      if (isTop) scene.disc(sx + X, sy + Y, Z + 4.05, R - 4, tone === "base" ? "faint" : tone, { opacity: O });
    });
    // The coin that slipped off the stack lies on the plate.
    if (slipped >= 0) {
      const c = m.coins[slipped]!;
      const cx = sx + c.x.value + shake, cy = sy + c.y.value;
      scene.cylinder(cx, cy, c.z.value, R, 4, "err");
      scene.disc(cx, cy, c.z.value + 4.05, R - 4, "err");
    }
  },
});
