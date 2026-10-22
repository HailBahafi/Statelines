import { defineFigure } from "../../core/define";
import { bump, clamp, falloff, lerp } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { coins, person } from "../shapes";

/** The bank stands at the back, its portico toward the lower left; creators wait in front of it. */
const BANK = { x: -34, y: -38, w: 72, d: 50 };
const FRONT = BANK.y + BANK.d / 2;
const DOOR: Vec3 = [BANK.x, FRONT + 2, 14];
const CREATORS: [number, number][] = [[-52, 46], [2, 40], [46, -4]];
const EARNED = [3, 4, 3];
/** Each creator's coins stand at their right hand. */
const stackAt = ([x, y]: [number, number]): [number, number] => [x + 13, y - 13];

/** A bank: steps, a floor, four columns before the wall and door, a beam and a pediment. */
function bank(scene: Scene, tone: Tone) {
  const { x, y, w, d } = BANK, wall: Tone = tone === "ghost" ? "ghost" : "base";
  scene.box(x, y, 4, w + 10, d + 12, 4, wall);
  scene.box(x, y - 2, 8, w + 4, d + 4, 4, wall);
  scene.box(x, y - 8, 12, w - 8, d - 18, 30, wall);
  const face = y - 8 + (d - 18) / 2 + 0.05;
  if (tone !== "ghost") scene.polyline([[x - 7, face, 12], [x - 7, face, 30], [x + 7, face, 30], [x + 7, face, 12]], "muted");
  for (const cx of [-27, -9, 9, 27]) scene.cylinder(x + cx, FRONT - 6, 12, 4, 30, tone);
  const top = 42;
  scene.box(x, y - 2, top, w + 4, d + 4, 6, tone);
  // The pediment: a low gable over the front, its ridge running back.
  const z = top + 6, peak = z + 15, l = x - w / 2 - 2, r = x + w / 2 + 2, b = y - 2 - d / 2 - 2, f = y - 2 + d / 2 + 2;
  scene.panel([[l, b, z], [x, b, peak], [x, f, peak], [l, f, z]], tone);
  scene.panel([[r, b, z], [x, b, peak], [x, f, peak], [r, f, z]], tone);
  scene.panel([[l, f, z], [r, f, z], [x, f, peak]], tone);
  if (tone !== "ghost") scene.polyline([[l + 12, f + 0.05, z + 2], [r - 12, f + 0.05, z + 2], [x, f + 0.05, peak - 5]], "faint", { closed: true });
}

/** Coins travelling from a bank to the creators. Use for creator payouts, commissions and payment runs. */
export const payout = /*#__PURE__*/ defineFigure({
  name: "Payout",
  label: "A bank paying coins out to creators",
  offset: 6,
  setup: ({ spring }) => ({
    paid: CREATORS.map(() => spring(0, 150, 20)),
    hop: CREATORS.map(() => spring(0, 180, 14)),
    drop: spring(0, 110, 14),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const q = state === "loading" ? ctx.progress(2.4) * 3 : 0;
    const g = ctx.ground(4);
    const D = m.drop.to(state === "error" ? 1 : 0).value;

    scene.box(-2, -4, 0, 150, 140, 4, "base");
    bank(scene, empty ? "ghost" : state === "loading" ? "hi" : "base");

    const items: { depth: number; draw: () => void }[] = [];
    CREATORS.forEach(([x, y], k) => {
      const failed = state === "error" && k === 0;
      const done = state === "success" || (state === "error" && !failed) || q > k + 1;
      const P = m.paid[k]!.to(state === "idle" ? 1 / EARNED[k]! : done ? 1 : 0).value;
      const [sx, sy] = stackAt([x, y]);
      // Paid creators jump for joy; in idle the one under the pointer looks up.
      const jump = state === "success" ? 5 : state === "idle" ? 6 * ctx.hover * falloff(Math.hypot(x - g.x, y - g.y), 22) : 0;
      const H = m.hop[k]!.to(jump).value;
      const tone: Tone = empty ? "ghost" : failed ? "err" : state === "success" ? "ok" : "base";
      items.push({ depth: x + y, draw: () => person(scene, x + (failed ? shake : 0), y, 4 + H, tone, undefined, 1.2) });
      const stack = Math.round(EARNED[k]! * clamp(P));
      if (stack && !empty) items.push({ depth: sx + sy, draw: () => coins(scene, sx, sy, 4, stack, "base", state === "success" ? "ok" : "base", 8) });
      if (failed) {
        // The payment never arrived: the coin lies on the floor short of the creator.
        const f = 0.55, cx = lerp(DOOR[0], sx, f), cy = lerp(DOOR[1], sy, f);
        items.push({ depth: cx + cy, draw: () => scene.cylinder(cx, cy, lerp(DOOR[2], 4, clamp(D)), 7, 3, "err") });
      }
      if (state === "loading" && q > k && q < k + 1) {
        const f = q - k, z = lerp(DOOR[2], 4 + EARNED[k]! * 5, f) + 30 * bump(f);
        items.push({ depth: 998, draw: () => scene.cylinder(lerp(DOOR[0], sx, f), lerp(DOOR[1], sy, f), z, 7, 3, "hi") });
      }
    });
    items.sort((a, b) => a.depth - b.depth).forEach(i => i.draw());
  },
});
