import { defineFigure } from "../../core/define";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
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

/** An upright slab with rounded corners whose face looks to the lower left. Returns the y of its face. */
function slab(scene: Scene, cx: number, cy: number, cz: number, a: number, b: number, r: number, d: number, tone: Tone): number {
  const face = cy + d / 2;
  const front = rounded(cx, face, cz, a, b, r), back = rounded(cx, cy - d / 2, cz, a, b, r);
  if (tone === "ghost") {
    scene.panel(front, "ghost");
    return face;
  }
  // The band above and to the right of the face: from the top-left corner round to the bottom-right one.
  const idx = [15, 16, 17, 18, 19, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  scene.panel([...idx.map(i => back[i]!), ...idx.slice().reverse().map(i => front[i]!)], tone);
  scene.panel(front, tone);
  return face;
}


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
/** The open wallet: the back half stands up from the fold, the front half lies on the plate. */
const W = { x: -16, fold: -16, w: 100, d: 44, h: 5, r: 6 };
const UP = { cz: 4 + W.d / 2 + 2, b: W.d / 2 + 2 };
const STACK = [68, -2] as const;
/** Where a coin that slips off the stack rolls to. */
const SLIPPED = [62, 46] as const;
/** The card pockets on the standing half, back to front: the height of each pocket's top edge. */
const POCKETS = [38, 30, 22];

/** An open wallet with coins stacking beside it. Use for balances, credits, payouts and rewards. `count`: coins, 1–10. */
export const wallet = /*#__PURE__*/ defineFigure({
  name: "Wallet",
  label: "An open wallet with coins stacking into a balance",
  offset: 10,
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

    scene.box(6, 0, 0, 176, 112, 4, "base");

    // Bills stand in the long pocket behind the cards and show over the top; on success they rise further.
    const B = m.bills.to(state === "success" ? 1 : 0).value;
    if (!empty) {
      for (const [k, du] of [[0, -6], [1, 5]] as const) {
        const y = W.fold - W.h / 2 - 1 + k * 1.5, top = UP.cz + UP.b + 9 - k * 3 + B * (12 - k * 4);
        scene.panel([[W.x + du - 40, y, top - 30], [W.x + du + 40, y, top - 30], [W.x + du + 40, y, top], [W.x + du - 40, y, top]], leather === "ok" ? "ok" : "base");
        scene.polyline([[W.x + du - 36, y + 0.05, top - 12], [W.x + du - 36, y + 0.05, top - 3], [W.x + du + 36, y + 0.05, top - 3], [W.x + du + 36, y + 0.05, top - 12]], "faint");
        if (k === 1) scene.panel(frontArc(W.x + du, y + 0.1, top - 8, 3.2, 0, Math.PI * 2, 12), ink);
      }
    }

    // The standing half, with its card pockets: each card's top edge shows above the pocket in front of it.
    const face = slab(scene, W.x, W.fold - W.h / 2, UP.cz, W.w / 2, UP.b, W.r, W.h, leather);
    const lift = m.card.to(state === "idle" ? ctx.hover * 6 : 0).value;
    if (!empty) {
      POCKETS.forEach((edge, k) => {
        const y = face + 0.6 + k * 0.9, top = edge + 7 + (k === POCKETS.length - 1 ? lift : 0);
        scene.panel(rounded(W.x, y, (top + 10) / 2, 36, (top - 10) / 2, 2.5, 2), "base");
        scene.line([W.x - 31, y + 0.05, top - 3], [W.x - 20, y + 0.05, top - 3], "muted");
        scene.panel([[W.x - 42, y + 0.4, 9], [W.x + 42, y + 0.4, 9], [W.x + 42, y + 0.4, edge], [W.x, y + 0.4, edge - 2.5], [W.x - 42, y + 0.4, edge]], leather);
      });
    }

    // The front half lies on the plate, an ID window with a photo on its face.
    const P = flat(scene, W.x, W.fold + W.d / 2, 4, W.w, W.d, W.h, W.r, leather);
    if (!empty) {
      const t = 4 + W.h + 0.05;
      scene.line(P(-W.w / 2 + 3, -W.d / 2 + 1, t), P(W.w / 2 - 3, -W.d / 2 + 1, t), ink);
      // Stitching round the leather.
      scene.polyline(outline(W.w - 6, W.d - 6, W.r - 2, 2).map(p => P(p.u, p.v, t)), "faint", { closed: true });
      scene.polyline([P(-40, -14, t), P(40, -14, t), P(40, 16, t), P(-40, 16, t)], "muted", { closed: true });
      scene.polyline([P(-36, -10, t), P(-14, -10, t), P(-14, 12, t), P(-36, 12, t)], "faint", { closed: true });
      const head = P(-25, -1, t);
      scene.disc(head[0], head[1], t, 4, "muted");
      scene.arc(head[0] + 3, head[1] + 3, t, 8, Math.PI * 0.75, Math.PI * 1.25, "muted");
      scene.line(P(-6, -6, t), P(30, -6, t), "muted", { bold: true });
      scene.line(P(-6, 1, t), P(22, 1, t), "faint");
      scene.line(P(-6, 8, t), P(26, 8, t), "faint");
    }

    if (empty) scene.cylinder(sx, sy, 4, R, 4, "ghost");
    m.coins.forEach((coin, k) => {
      const present = k < count;
      let z = present ? 4 + k * PITCH : 4 + k * PITCH + 40, dx = 0, dy = 0;
      if (k === slipped) { z = 4; dx = SLIPPED[0] - sx; dy = SLIPPED[1] - sy; }
      if (state === "idle" && k === count - 1) z += ctx.hover * 6;
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
