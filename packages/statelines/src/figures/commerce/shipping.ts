import { defineFigure } from "../../core/define";
import { pointAlong, sliceAlong, vertexFraction, type Point2 } from "../../engine/path";
import type { Tone, Vec3 } from "../../engine/scene";
import { badge, parcel } from "../shapes";

const ROUTE: Point2[] = [[-60, 26], [-14, 26], [-14, -18], [52, -18]];
const STOP = vertexFraction(ROUTE, 2);
const DEPOT = [-60, -4] as const;
const HOME = [52, -46] as const;
const MARK = [24, 14] as const;
const lifted = (points: Point2[], z: number): Vec3[] => points.map(([x, y]) => [x, y, z]);

/** A parcel travels a route from a depot to a home. Use for shipping, tracking and deliveries. */
export const shipping = defineFigure({
  name: "Shipping",
  label: "A parcel travelling a route between stops",
  offset: 10,
  setup: ({ spring }) => ({ t: spring(0, 90, 18), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let t = 0;
    if (state === "loading") {
      t = ctx.determinate ? ctx.progress(1) : Math.min(1, (ctx.loop(3.2) * 3.2) / 3);
      if (!ctx.determinate) m.t.set(t);
    }
    else if (state === "success") t = 1;
    else if (state === "error") t = STOP;
    const T = m.t.to(Math.min(1, t)).value, L = m.lift.to(state === "idle" ? ctx.hover * 10 : 0).value;
    const live: Tone = state === "loading" ? "hi" : ctx.verdict();

    scene.box(0, -8, 0, 160, 116, 4, "base");

    // The home at the end of the route: a block with a pitched roof.
    const [hx, hy] = HOME, s = 13, eave = 4 + 18, ridge = eave + 12;
    const home: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    scene.box(hx, hy, 4, s * 2, s * 2, 18, home);
    scene.panel([[hx - s, hy - s, eave], [hx + s, hy - s, eave], [hx + s, hy, ridge], [hx - s, hy, ridge]], home);
    scene.panel([[hx + s, hy - s, eave], [hx + s, hy + s, eave], [hx + s, hy, ridge]], home);
    scene.panel([[hx - s, hy + s, eave], [hx + s, hy + s, eave], [hx + s, hy, ridge], [hx - s, hy, ridge]], home);

    // The depot the parcel leaves from, with its loading door.
    const [dx, dy] = DEPOT;
    scene.box(dx, dy, 4, 30, 30, 22, empty ? "ghost" : "base");
    if (!empty) scene.polyline([[dx - 8, dy + 15.05, 4], [dx - 8, dy + 15.05, 18], [dx + 8, dy + 15.05, 18], [dx + 8, dy + 15.05, 4]], "muted");

    scene.polyline(lifted(ROUTE, 4.05), "ghost");
    if (T > 0.005 && !empty) scene.polyline(lifted(sliceAlong(ROUTE, T), 4.05), live, { bold: true });
    ROUTE.forEach((p, i) => {
      if (i === 0 || i === ROUTE.length - 1) return;
      const passed = !empty && vertexFraction(ROUTE, i) <= T + 1e-3;
      const stuck = state === "error" && i === 2;
      scene.cylinder(p[0], p[1], 4, 7, 4, stuck ? "err" : passed ? live : "muted");
    });
    if (empty) return;

    const [x, y] = pointAlong(ROUTE, T);
    parcel(scene, x + shake, y, 8 + L, live);
    badge(scene, MARK[0], MARK[1], 4, state, ctx.fade());
  },
});
