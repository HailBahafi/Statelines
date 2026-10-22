import { defineFigure } from "../../core/define";
import { TAU, clamp, nearestAngle } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { hull, rotY, tube } from "./solid";

/** Radius of the clock body, its centre height, and the planes of its back and face. */
const RC = 32;
const CZ = 4 + RC + 9;
const BACK = -10;
const FRONT = 6;
const FACE = FRONT + 1.5;
const BELL = 0.72;

/** An alarm clock counting time. Use for sessions, timeouts, scheduling and anything that waits on time. */
export const session = /*#__PURE__*/ defineFigure({
  name: "Session",
  label: "An alarm clock with bells counting time",
  offset: 4,
  setup: ({ spring }) => ({
    minute: spring(TAU * (10 / 60), 90, 16), hour: spring(TAU * (10 + 10 / 60) / 12, 90, 16), ring: spring(0, 120, 20),
    roll: spring(0, 90, 11), hammer: spring(0, 200, 10),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let minute = TAU * (10 / 60), hour = TAU * (10 + 10 / 60) / 12, ring = 0, roll = -0.07 * clamp(ctx.hover), hammer = 0;

    if (state === "loading") {
      minute = ctx.time * 2.4; hour = ctx.time * 0.2; ring = ctx.progress(4);
      m.minute.set(minute); m.hour.set(hour);
      if (!ctx.determinate) m.ring.set(ring);
    } else if (state === "success") {
      minute = 0; hour = 0; ring = 1; hammer = 1;
    } else if (state === "error") {
      // Knocked over onto its side: the hands stop where they were.
      minute = m.minute.value; hour = m.hour.value; ring = 1; roll = -1.22;
    }
    const M = m.minute.to(nearestAngle(minute, m.minute.value)).value;
    const H = m.hour.to(nearestAngle(hour, m.hour.value)).value;
    const R = m.ring.to(ring).value;
    const ROLL = m.roll.to(roll).value;
    const HAM = m.hammer.to(hammer).value;

    // Lying on its side it rests on one bell, so the centre sinks a little.
    const C: Vec3 = [shake, 0, CZ - 4 * clamp(-ROLL / 1.22)];
    const P = (u: number, y: number, v: number): Vec3 => rotY([C[0] + u, y, C[2] + v], C, ROLL);
    /** A point on the clock at angle `a` (0 at twelve, clockwise) and radius `r`, on plane y. */
    const polar = (a: number, r: number, y: number): Vec3 => P(r * Math.sin(a), y, r * Math.cos(a));
    const circle = (r: number, y: number, n = 32): Vec3[] => Array.from({ length: n }, (_, i) => polar((i / n) * TAU, r, y));

    const body: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    scene.box(0, 0, 0, 124, 92, 4, "base");

    // Two legs, the twin bells with their knobs, and the hammer between them: all behind the body.
    for (const s of [-1, 1]) tube(scene, polar(Math.PI + s * 0.62, RC - 6, -2), polar(Math.PI + s * 0.78, RC + 9, -2), 2.6, 2.2, body);
    for (const s of [-1, 1]) {
      const a = s * BELL, dome: Vec3[] = [];
      for (const y of [-7, 1]) for (let i = 0; i <= 10; i++) {
        const phi = -Math.PI / 2 + (Math.PI * i) / 10;
        dome.push(polar(a, RC + 1, y), polar(a + 0.38 * Math.sin(phi), RC + 2 + 14 * Math.cos(phi), y));
      }
      scene.panel(hull(dome), body);
      tube(scene, polar(a, RC + 15, -3), polar(a, RC + 19, -3), 2, 2, body);
    }
    const hamA = 0.42 * HAM;
    tube(scene, polar(0, RC - 2, -3), polar(hamA, RC + 9, -3), 1.3, 1.3, body);
    tube(scene, polar(hamA - 0.08, RC + 10, -3), polar(hamA + 0.08, RC + 10, -3), 2.6, 2.6, body);

    // The drum of the body, then the bezel and the face on its front.
    scene.panel(hull([...circle(RC, BACK, 28), ...circle(RC, FRONT, 28)]), body);
    scene.panel(circle(RC - 0.5, FRONT), body);
    if (empty) return;
    scene.polyline(circle(RC - 5, FACE), "muted", { closed: true });
    for (let k = 0; k < 12; k++) {
      const a = (k * TAU) / 12, r0 = k % 3 ? RC - 9 : RC - 12;
      scene.line(polar(a, r0, FACE), polar(a, RC - 7, FACE), k % 3 ? "faint" : "muted");
    }
    if (R > 0.005) {
      const n = Math.max(2, Math.ceil(40 * Math.min(1, R)));
      const arc = Array.from({ length: n + 1 }, (_, i) => polar((TAU * Math.min(1, R) * i) / n, RC - 3, FACE));
      scene.polyline(arc, state === "loading" ? "hi" : ctx.verdict(), { bold: true });
    }

    const tone: Tone = state === "loading" ? "hi" : "base";
    scene.line(polar(0, 0, FACE + 0.1), polar(H, 14, FACE + 0.1), tone, { bold: true });
    scene.line(polar(0, 0, FACE + 0.1), polar(M, 22, FACE + 0.1), tone, { bold: true });
    scene.panel(circle(2.6, FACE + 0.2, 10), tone);
  },
});
