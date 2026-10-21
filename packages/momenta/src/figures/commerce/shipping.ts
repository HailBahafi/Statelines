import { defineFigure } from "../../core/define";
import { pointAlong, sliceAlong, vertexFraction, type Point2 } from "../../engine/path";
import type { Vec3 } from "../../engine/scene";
import { parcel } from "../shapes";

const ROUTE: Point2[] = [[-62, 30], [-14, 30], [-14, -22], [52, -22]];
const STOP = vertexFraction(ROUTE, 2);
const lifted = (points: Point2[], z: number): Vec3[] => points.map(([x, y]) => [x, y, z]);

/** A parcel travels a route between stops. Use for shipping, tracking and deliveries. */
export const shipping = defineFigure({
  name: "Shipping",
  label: "A parcel travelling a route between stops",
  setup: ({ spring }) => ({ t: spring(0, 90, 18), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let t = 0;
    if (state === "loading") {
      t = ctx.determinate ? ctx.progress(1) : Math.min(1, (ctx.loop(3.2) * 3.2) / 3);
      if (!ctx.determinate) m.t.set(t);
    }
    else if (state === "success") t = 1;
    else if (state === "error") t = STOP;
    const T = m.t.to(Math.min(1, t)).value, L = m.lift.to(state === "idle" ? ctx.hover * 10 : 0).value;

    scene.box(0, 0, 0, 150, 96, 4, "base");
    scene.polyline(lifted(ROUTE, 4), "ghost");
    if (T > 0.005 && state !== "empty") {
      scene.polyline(lifted(sliceAlong(ROUTE, T), 4), state === "loading" ? "hi" : ctx.verdict(), { bold: true });
    }
    ROUTE.forEach((p, i) => {
      const passed = state !== "empty" && vertexFraction(ROUTE, i) <= T + 1e-3;
      const tone = !passed ? "muted" : state === "loading" ? "hi" : ctx.verdict();
      scene.cylinder(p[0], p[1], 4, 7, 4, tone);
    });
    if (state === "empty") return;

    const [x, y] = pointAlong(ROUTE, T);
    parcel(scene, x + shake, y, 8 + L, state === "loading" ? "hi" : ctx.verdict());
    if (state === "success") scene.check(x, y, 40, "ok", ctx.fade());
    if (state === "error") scene.cross(x + shake, y, 40, "err", ctx.fade());
  },
});
