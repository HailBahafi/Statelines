import { defineFigure } from "../../core/define";
import type { Scene, Tone } from "../../engine/scene";
import { tray } from "../shapes";

const BASE = 8;
const FLOOR = BASE + 3;
const SLOTS = [[-28, -12], [0, -14], [28, -12], [-14, 14], [14, 14]] as const;
const OUTSIDE = 64;

const item = (scene: Scene, k: number, x: number, y: number, z: number, tone: Tone, opacity?: number) =>
  k % 2 ? scene.cylinder(x, y, z, 9, 16, tone, opacity) : scene.box(x, y, z, 18, 18, 16, tone, opacity);

/** Items drop into a cart. Use for carts, baskets, saved items and orders. `count`: items, 1–5. */
export const cart = defineFigure({
  name: "Cart",
  label: "Items dropping into a shopping cart",
  offset: -10,
  setup: ({ spring }) => ({
    items: SLOTS.map((_, k) => ({ z: spring(k < 3 ? FLOOR : 60), x: spring(0), opacity: spring(k < 3 ? 1 : 0, 150, 22) })),
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
    const fallen: (() => void)[] = [];

    for (const [cx, cy] of [[-40, -26], [40, -26], [-40, 26], [40, 26]] as const) scene.cylinder(cx, cy, 0, 5, 4, "muted");
    scene.polyline([[-52, -36, BASE + 19], [-64, -48, BASE + 44], [-40, -72, BASE + 44]], "base", { bold: true });

    tray(scene, 104, 72, 16, BASE, ctx.verdict(), () => {
      m.items.forEach((it, k) => {
        const [sx, sy] = SLOTS[k]!;
        const bad = state === "error" && k === items - 1;
        const present = k < inside || bad;
        let z = present ? FLOOR : 60, x = 0;
        if (bad) { z = 0; x = OUTSIDE; }
        if (state === "idle" && present) z += ctx.hover * 4;
        const Z = it.z.to(z).value, X = it.x.to(x).value, O = it.opacity.to(present ? 1 : 0).value;
        const draw = () => item(scene, k, sx + X + lean.x + (bad ? shake : 0), sy + lean.y, Z, bad ? "err" : "base", O);
        if (bad || Z > FLOOR + 10) fallen.push(draw); else draw();
        if (bad) fallen.push(() => scene.cross(sx + OUTSIDE + shake, sy, 18, "err", ctx.fade()));
      });
    });
    fallen.forEach(draw => draw());

    if (state === "empty") scene.box(lean.x, lean.y, 52, 18, 18, 16, "ghost");
    if (state === "success") scene.check(0, 0, BASE + 40, "ok", ctx.fade());
  },
});
