import { defineFigure } from "../../core/define";
import { lerp } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { frontArc } from "../shapes";

/** The wire basket: its rim, and its floor, which is shorter at the back where the wall slopes. */
const RIM = { x0: -44, x1: 40, y: 26, z: 66 };
const FLOOR = { x0: -30, x1: 36, y: 21, z: 36 };
const RAIL = 15;
const WHEELS = [[-32, -20], [38, -20], [-32, 20], [38, 20]] as const;
const HANDLE = { x: -54, z: 74 };
const SLOTS = [[-16, -9], [6, -10], [24, -6], [-10, 9], [14, 10]] as const;
/** Where an item that misses lands: on the plate, in front of the cart. */
const DROPPED = [52, 42] as const;

/** One product: a tall box, a bottle or a carton. */
function item(scene: Scene, k: number, x: number, y: number, z: number, tone: Tone, opacity?: number, fallen = false): void {
  if (k % 3 === 1) {
    if (fallen) { scene.box(x, y, z, 26, 10, 10, tone, opacity); return; }
    scene.cylinder(x, y, z, 5.5, 20, tone, opacity);
    scene.cylinder(x, y, z + 20, 2.6, 7, tone, opacity);
    return;
  }
  if (k % 3 === 0) { scene.box(x, y, z, fallen ? 24 : 16, 10, fallen ? 10 : 24, tone, opacity); return; }
  scene.box(x, y, z, 13, 13, 15, tone, opacity);
}

/** Items drop into a cart. Use for carts, baskets, saved items and orders. `count`: items, 1–5. */
export const cart = defineFigure({
  name: "Cart",
  label: "Items dropping into a wire shopping cart",
  offset: 12,
  setup: ({ spring }) => ({
    items: SLOTS.map((_, k) => ({ z: spring(k < 3 ? FLOOR.z : 110), x: spring(0), y: spring(0), opacity: spring(k < 3 ? 1 : 0, 150, 22) })),
    roll: spring(0),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const items = ctx.count(4, SLOTS.length, 1);
    let inside = items;
    if (empty) inside = 0;
    if (state === "error") inside = items - 1;
    if (state === "loading") {
      const q = ctx.progress(items * 0.55 + 0.6);
      inside = ctx.determinate ? Math.round(q * items) : Math.min(items, 1 + Math.floor(q * (items + 1)));
    }
    const shell: Tone = empty ? "ghost" : ctx.verdict();
    const wire: Tone = empty ? "ghost" : shell === "base" ? "muted" : shell;
    const frame: Tone = empty ? "ghost" : "base";
    // Checked out, the cart rolls on toward the till; idle, it nudges toward the pointer.
    const dx = m.roll.to(state === "idle" ? ctx.hover * 6 : state === "success" ? 12 : 0).value;
    const P = (x: number, y: number, z: number): Vec3 => [x + dx, y, z];

    scene.box(4, 0, 0, 150, 104, 4, "base");

    // Casters: a wheel on a short fork under each corner; the near pair is drawn last.
    const caster = (x: number, y: number) => {
      scene.line(P(x, y, RAIL), P(x, y, 9), frame, { bold: true });
      for (const d of [-1.5, 1.5]) scene.panel(frontArc(x + dx, y + d, 9, 4.6, 0, Math.PI * 2, 12), frame);
    };
    caster(WHEELS[0][0], WHEELS[0][1]);
    caster(WHEELS[1][0], WHEELS[1][1]);

    // The frame: side rails with a rack between them, the push handle and the struts up to the basket.
    const rails = () => {
      for (const y of [-20, 20]) {
        scene.line(P(-34, y, RAIL), P(40, y, RAIL), frame, { bold: true });
        scene.line(P(-34, y, RAIL), P(HANDLE.x + 2, y > 0 ? 24 : -24, HANDLE.z), frame, { bold: true });
        scene.line(P(38, y, RAIL), P(FLOOR.x1, y > 0 ? FLOOR.y - 1 : -FLOOR.y + 1, FLOOR.z), frame, { bold: true });
      }
      if (!empty) for (const x of [-20, 0, 20]) scene.line(P(x, -20, RAIL), P(x, 20, RAIL), "faint");
    };
    rails();
    scene.box(HANDLE.x + dx, 0, HANDLE.z - 2, 6, 58, 5, frame);

    // The basket's corners, and a wall of wire between two edges.
    const T = (sx: number, sy: number): Vec3 => P(sx < 0 ? RIM.x0 : RIM.x1, sy * RIM.y, RIM.z);
    const B = (sx: number, sy: number): Vec3 => P(sx < 0 ? FLOOR.x0 : FLOOR.x1, sy * FLOOR.y, FLOOR.z);
    const mix = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
    const wall = (t0: Vec3, t1: Vec3, b0: Vec3, b1: Vec3, n: number, solid: boolean) => {
      if (solid) scene.panel([t0, t1, b1, b0], shell);
      else scene.polyline([t0, t1, b1, b0], shell, { closed: true });
      if (empty) return;
      for (let i = 1; i < n; i++) scene.line(mix(t0, t1, i / n), mix(b0, b1, i / n), wire);
      for (const f of [0.38, 0.7]) scene.line(mix(t0, b0, f), mix(t1, b1, f), wire);
    };
    // Far walls first, filled; then the floor and what is in the basket; then the near walls, open wire.
    wall(T(-1, 1), T(-1, -1), B(-1, 1), B(-1, -1), 4, true);
    wall(T(-1, -1), T(1, -1), B(-1, -1), B(1, -1), 6, true);
    scene.panel([B(-1, -1), B(1, -1), B(1, 1), B(-1, 1)], shell);
    if (!empty) for (let i = 1; i < 4; i++) scene.line(mix(B(-1, -1), B(1, -1), i / 4), mix(B(-1, 1), B(1, 1), i / 4), wire);

    const after: (() => void)[] = [];
    m.items.forEach((it, k) => {
      const [sx, sy] = SLOTS[k]!;
      const bad = state === "error" && k === items - 1;
      const present = k < inside || bad;
      let z = present ? FLOOR.z : 110, x = 0, y = 0;
      // The last item missed the cart and lies on its side on the plate.
      if (bad) { z = 4; x = DROPPED[0] - sx; y = DROPPED[1] - sy; }
      const Z = it.z.to(z).value, X = it.x.to(x).value, Y = it.y.to(y).value, O = it.opacity.to(present ? 1 : 0).value;
      const arriving = state === "loading" && Z > FLOOR.z + 2;
      const draw = () => item(scene, k, sx + X + (bad ? shake : dx), sy + Y, Z, bad ? "err" : arriving ? "hi" : "base", O, bad && Z < 20);
      if (bad || Z > RIM.z) after.push(draw); else draw();
    });

    wall(T(-1, 1), T(1, 1), B(-1, 1), B(1, 1), 6, false);
    wall(T(1, -1), T(1, 1), B(1, -1), B(1, 1), 4, false);
    // The rim: a heavier wire round the top.
    scene.polyline([T(-1, -1), T(1, -1), T(1, 1), T(-1, 1)], shell, { closed: true, bold: true });

    caster(WHEELS[2][0], WHEELS[2][1]);
    caster(WHEELS[3][0], WHEELS[3][1]);
    after.forEach(draw => draw());
  },
});
