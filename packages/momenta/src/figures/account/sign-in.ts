import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";

const HINGE = -30;
const WIDTH = 60;
const BOTTOM = 4;
const TOP = 84;

/** A door that opens. Use for sign in, sign up, joining and access granted. */
export const signIn = defineFigure({
  name: "SignIn",
  label: "A door opening",
  offset: 10,
  setup: ({ spring }) => ({ angle: spring(0, 120, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const target = state === "success" ? 1.25 : state === "idle" ? 0.4 * clamp(ctx.hover) : 0;
    const a = m.angle.to(target).value;
    const frame = state === "empty" ? "muted" : ctx.verdict();

    scene.box(0, 6, 0, 110, 64, 4, "base");
    scene.box(33, 0, 4, 6, 6, 82, frame);
    scene.box(-33, 0, 4, 6, 6, 82, frame);
    if (state === "loading") {
      const on = Math.floor(ctx.time * 3) % 2 === 0;
      scene.box(33, 4, 46, 4, 2, 6, on ? "hi" : "muted");
    }

    const reach = (f: number): [number, number] => [HINGE + WIDTH * f * Math.cos(a) + shake, WIDTH * f * Math.sin(a)];
    const [fx, fy] = reach(1);
    const door: Vec3[] = [[HINGE + shake, 0, BOTTOM], [fx, fy, BOTTOM], [fx, fy, TOP], [HINGE + shake, 0, TOP]];
    if (state === "empty") scene.panel(door, "ghost");
    else {
      scene.panel(door, state === "loading" ? "base" : ctx.verdict());
      const [hx, hy] = reach(0.85);
      scene.line([hx, hy, 40], [hx, hy, 50], state === "loading" ? "hi" : "base", { bold: true });
    }
    scene.box(0, 0, 86, 72, 6, 6, frame);

    if (state === "success") scene.check(0, 26, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 26, 4, "err", ctx.fade());
  },
});
