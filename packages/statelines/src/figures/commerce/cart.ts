import { defineFigure } from "../../core/define";
import type { Scene, Tone } from "../../engine/scene";
import { badge, tray } from "../shapes";

const BASE = 12;
const FLOOR = BASE + 3;
const SLOTS = [[-28, -12], [0, -14], [28, -12], [-14, 14], [14, 14]] as const;
/** Where a dropped item lands: on the plate, in front of the cart. */
const DROPPED = [60, 42] as const;
const MARK = [22, 46] as const;

const item = (scene: Scene, k: number, x: number, y: number, z: number, tone: Tone, opacity?: number) =>
  k % 2 ? scene.cylinder(x, y, z, 9, 16, tone, opacity) : scene.box(x, y, z, 18, 18, 16, tone, opacity);

/** Items drop into a cart. Use for carts, baskets, saved items and orders. `count`: items, 1–5. */
export const cart = defineFigure({
  name: "Cart",
  label: "Items dropping into a shopping cart",
  offset: -2,
  setup: ({ spring }) => ({
    items: SLOTS.map((_, k) => ({ z: spring(k < 3 ? FLOOR : 60), x: spring(0), y: spring(0), opacity: spring(k < 3 ? 1 : 0, 150, 22) })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(6);
    const items = ctx.count(4, SLOTS.length, 1);
    let inside = items;
    if (state === "empty") inside = 0;
    if (state === "error") inside = items - 1;
    if (state === "loading") {
      const q = ctx.progress(items * 0.55 + 0.6);
      inside = ctx.determinate ? Math.round(q * items) : Math.min(items, 1 + Math.floor(q * (items + 1)));
    }
    const shell: Tone = ctx.verdict();
    const after: (() => void)[] = [];

    scene.box(6, 0, 0, 156, 120, 4, "base");
    // The handle: two posts and a grip, behind the basket.
    for (const y of [-22, 22]) scene.box(-56, y, BASE + 6, 4, 4, 34, shell);
    scene.box(-56, 0, BASE + 40, 6, 52, 4, shell);
    // Wheels under the corners; the near ones are drawn after the basket.
    const wheel = (x: number, y: number) => scene.cylinder(x, y, 4, 5, BASE - 4, "muted");
    wheel(-40, -26);

    tray(scene, 104, 72, 16, BASE, shell, () => {
      m.items.forEach((it, k) => {
        const [sx, sy] = SLOTS[k]!;
        const bad = state === "error" && k === items - 1;
        const present = k < inside || bad;
        let z = present ? FLOOR : 60, x = 0, y = 0;
        // The last item missed the cart and lies on the plate.
        if (bad) { z = 4; x = DROPPED[0] - sx; y = DROPPED[1] - sy; }
        if (state === "idle" && present) z += ctx.hover * 4;
        const Z = it.z.to(z).value, X = it.x.to(x).value, Y = it.y.to(y).value, O = it.opacity.to(present ? 1 : 0).value;
        const arriving = state === "loading" && Z > FLOOR + 2;
        const draw = () => item(scene, k, sx + X + lean.x + (bad ? shake : 0), sy + Y + lean.y, Z, bad ? "err" : arriving ? "hi" : "base", O);
        if (bad || Z > FLOOR + 10) after.push(draw); else draw();
      });
      if (state === "empty") item(scene, 0, 0, 0, FLOOR, "ghost");
    });
    wheel(40, -26); wheel(-40, 26); wheel(40, 26);
    after.forEach(draw => draw());
    badge(scene, MARK[0], MARK[1], 4, state, ctx.fade());
  },
});
