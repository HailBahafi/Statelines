import { defineFigure } from "../../core/define";
import { lerp } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { frontArc } from "../shapes";

/** The road runs along x in front of the depot and the house. */
const RY = 22;
const ROAD = 5;
const DEPOT = [-58, -26] as const;
const HOME = [50, -30] as const;
const FROM = -52;
const TO = 6;
const STALL = 0.45;

/**
 * A delivery truck on the road, its cargo box centred on x: chassis, box, cab with windscreen,
 * side window and headlight, and wheels on the near side. It faces x+.
 */
function truck(scene: Scene, x: number, cargo: Tone, body: Tone, spin: number | null): void {
  const side = RY + 11, f = side + 0.05;
  scene.box(x + 6, RY, 12, 62, 18, 3, body);
  scene.box(x - 8, RY, 15, 40, 22, 26, cargo);
  scene.box(x + 23, RY, 15, 18, 22, 19, body);
  if (body === "ghost") return;
  const ink: Tone = body === "base" ? "muted" : body;
  // The windscreen on the cab's front and the window on its side.
  const front = x + 32.05;
  scene.polyline([[front, RY - 8, 24], [front, RY + 8, 24], [front, RY + 8, 32], [front, RY - 8, 32]], ink, { closed: true });
  scene.polyline([[x + 17, f, 23], [x + 28, f, 23], [x + 28, f, 31], [x + 17, f, 31]], ink, { closed: true });
  scene.line([front, RY + 6, 18], [front, RY + 9, 18], ink, { bold: true });
  // A stripe along the box and its rear door seam.
  scene.line([x - 26, f, 22], [x + 10, f, 22], cargo === "base" ? "muted" : cargo, { bold: true });
  for (const wx of [x - 18, x + 23]) {
    scene.panel(frontArc(wx, side + 0.5, ROAD + 6, 6, 0, Math.PI * 2, 18), body);
    scene.polyline(frontArc(wx, side + 0.6, ROAD + 6, 2.4, 0, Math.PI * 2, 10), ink);
    if (spin !== null) scene.line([wx + 4.5 * Math.cos(spin), side + 0.6, ROAD + 6 + 4.5 * Math.sin(spin)], [wx - 4.5 * Math.cos(spin), side + 0.6, ROAD + 6 - 4.5 * Math.sin(spin)], ink);
  }
}

/** The depot: a shed with a roller door on its face. */
function depot(scene: Scene, tone: Tone): void {
  const [dx, dy] = DEPOT, face = dy + 15.05;
  scene.box(dx, dy, 4, 40, 30, 26, tone);
  scene.box(dx, dy, 30, 42, 32, 3, tone);
  if (tone === "ghost") return;
  scene.polyline([[dx - 12, face, 4], [dx - 12, face, 21], [dx + 12, face, 21], [dx + 12, face, 4]], "muted");
  for (let k = 1; k < 4; k++) scene.line([dx - 12, face, 4 + k * 4.2], [dx + 12, face, 4 + k * 4.2], "faint");
}

/** The house: walls, a pitched roof, a door and a window. */
function house(scene: Scene, tone: Tone): void {
  const [hx, hy] = HOME, s = 15, eave = 4 + 20, ridge = eave + 14, face = hy + s + 0.05;
  scene.box(hx, hy, 4, s * 2, s * 2, 20, tone);
  scene.panel([[hx - s - 2, hy - s - 2, eave], [hx + s + 2, hy - s - 2, eave], [hx + s + 2, hy, ridge], [hx - s - 2, hy, ridge]], tone);
  scene.panel([[hx + s, hy - s, eave], [hx + s, hy + s, eave], [hx + s, hy, ridge]], tone);
  scene.panel([[hx - s - 2, hy + s + 2, eave], [hx + s + 2, hy + s + 2, eave], [hx + s + 2, hy, ridge], [hx - s - 2, hy, ridge]], tone);
  if (tone === "ghost") return;
  const ink: Tone = tone === "base" ? "muted" : tone;
  scene.polyline([[hx - 9, face, 4], [hx - 9, face, 17], [hx - 2, face, 17], [hx - 2, face, 4]], ink);
  scene.polyline([[hx + 3, face, 11], [hx + 11, face, 11], [hx + 11, face, 18], [hx + 3, face, 18]], ink, { closed: true });
}

/** A delivery truck drives the road from a depot to a home. Use for shipping, tracking and deliveries. */
export const shipping = defineFigure({
  name: "Shipping",
  label: "A delivery truck driving from a depot to a home",
  offset: -10,
  setup: ({ spring }) => ({ t: spring(0, 90, 18), drop: spring(0, 140, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let t = state === "idle" ? ctx.hover * 0.08 : 0;
    if (state === "loading") {
      t = ctx.determinate ? ctx.progress(1) : Math.min(1, (ctx.loop(3.2) * 3.2) / 3);
      if (!ctx.determinate) m.t.set(t);
    }
    else if (state === "success") t = 1;
    else if (state === "error") t = STALL;
    const T = m.t.to(Math.min(1, t)).value;
    const D = m.drop.to(state === "success" ? 1 : 0).value;
    const x = lerp(FROM, TO, T) + shake;
    const live: Tone = state === "loading" ? "hi" : ctx.verdict();

    scene.box(0, -6, 0, 168, 112, 4, "base");
    depot(scene, empty ? "ghost" : "base");
    house(scene, empty ? "ghost" : state === "success" ? "ok" : "base");
    // Delivered: the parcel waits on the doorstep.
    if (D > 0.02) {
      const [px, py, o] = [HOME[0] - 5, HOME[1] + 23, Math.min(1, D * 1.5)];
      scene.box(px, py, 4, 13, 13, 10, "ok", o);
      scene.line([px, py - 6.5, 14.05], [px, py + 6.5, 14.05], "ok", { opacity: o });
    }

    // The road with its centre line, and the stretch already driven.
    scene.box(0, RY, 4, 168, 26, 1, empty ? "ghost" : "base");
    if (empty) { truck(scene, lerp(FROM, TO, 0.6), "ghost", "ghost", null); return; }
    scene.line([-84, RY, ROAD + 0.05], [84, RY, ROAD + 0.05], "ghost");
    if (state !== "idle" && x - 28 > FROM - 28 + 1) scene.line([FROM - 28, RY, ROAD + 0.1], [x - 28, RY, ROAD + 0.1], live, { bold: true });

    const spin = state === "loading" ? -ctx.time * 9 : null;
    truck(scene, x, state === "loading" ? "hi" : state === "error" ? "err" : "base", "base", spin);

    // Blocked: a barrier across the road just ahead of the cab.
    if (state === "error") {
      const bx = lerp(FROM, TO, STALL) + 44, k = ctx.fade(0.4);
      scene.box(bx, RY - 10, ROAD, 3, 3, 16 * k, "err");
      scene.box(bx, RY, ROAD + 12 * k, 4, 26, 5, "err");
      scene.box(bx, RY + 10, ROAD, 3, 3, 16 * k, "err");
    }
  },
});
