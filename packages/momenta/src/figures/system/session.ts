import { defineFigure } from "../../core/define";
import { TAU, nearestAngle } from "../../engine/math";

const FACE = 6;
const TWELVE = (-3 * Math.PI) / 4;
const hand = (angle: number, length: number): [number, number, number] =>
  [length * Math.cos(TWELVE + angle), length * Math.sin(TWELVE + angle), FACE + 0.1];

/** A clock face. Use for sessions, timeouts, scheduling and anything that waits on time. */
export const session = defineFigure({
  name: "Session",
  label: "A clock face counting time",
  offset: -14,
  setup: ({ spring }) => ({
    minute: spring(TAU * (10 / 60), 90, 16), hour: spring(TAU * (10 + 10 / 60) / 12, 90, 16), ring: spring(0, 120, 20),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let minute = TAU * (10 / 60), hour = TAU * (10 + 10 / 60) / 12, ring = 0;

    if (state === "idle" && ctx.pointer.over > 0.3) {
      const g = ctx.ground(FACE);
      minute = Math.atan2(g.y, g.x) - TWELVE;
    } else if (state === "loading") {
      minute = ctx.time * 2.4; hour = ctx.time * 0.2; ring = ctx.progress(4);
      m.minute.set(minute); m.hour.set(hour);
      if (!ctx.determinate) m.ring.set(ring);
    } else if (state === "success") {
      minute = 0; hour = 0; ring = 1;
    } else if (state === "error") {
      minute = m.minute.value; hour = m.hour.value; ring = 1;
    }
    const M = m.minute.to(nearestAngle(minute, m.minute.value)).value;
    const H = m.hour.to(nearestAngle(hour, m.hour.value)).value;
    const R = m.ring.to(ring).value;

    if (state === "empty") {
      scene.cylinder(0, 0, 0, 52, FACE, "ghost");
      return;
    }
    scene.cylinder(shake, 0, 0, 52, FACE, "base");
    scene.disc(shake, 0, FACE, 44, "faint");
    for (let k = 0; k < 12; k++) {
      const a = TWELVE + (k * TAU) / 12, r0 = k % 3 ? 40 : 36;
      scene.line([shake + r0 * Math.cos(a), r0 * Math.sin(a), FACE], [shake + 44 * Math.cos(a), 44 * Math.sin(a), FACE], k % 3 ? "faint" : "muted");
    }
    if (R > 0.005) scene.arc(shake, 0, FACE, 48, TWELVE, TWELVE + TAU * Math.min(1, R), state === "loading" ? "hi" : ctx.verdict(), { bold: true });

    const tone = state === "loading" ? "hi" : "base";
    const [hx, hy, hz] = hand(H, 22), [mx, my, mz] = hand(M, 34);
    scene.line([shake, 0, FACE + 0.1], [hx + shake, hy, hz], tone, { bold: true });
    scene.line([shake, 0, FACE + 0.1], [mx + shake, my, mz], tone, { bold: true });
    scene.disc(shake, 0, FACE + 0.1, 3, tone === "hi" ? "hi" : "base", { fill: true });

    if (state === "success") scene.check(14, 14, FACE, "ok", ctx.fade());
    if (state === "error") scene.cross(14 + shake, 14, FACE, "err", ctx.fade());
  },
});
