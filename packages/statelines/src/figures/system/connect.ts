import { defineFigure } from "../../core/define";
import { lerp, smoothstep } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { frontArc } from "../shapes";
import { add, obox, rotX, tube } from "./solid";

/** Size of the plug and its socket. */
const S = 1.4;
/** The wall's face and the outlet plate standing proud of it. */
const WALL = -50;
const FACE = WALL + 3;
/** Height of the plug's centre when its blades line up with the slots. */
const SOCKET_Z = 46;
/** Where the plug rests on the floor, and where it sits once plugged in. */
const REST = { x: -4, y: 8, z: 4 + 9 * S };
const IN = { x: 0, y: FACE, z: SOCKET_Z };
const OUT_OF_PLATE: Vec3 = [-40, 62, 4.3];
const R = (v: Vec3, a: number): Vec3 => rotX(v, [0, 0, 0], a);

/** A plug goes into a wall socket. Use for integrations, linked accounts and pairing. */
export const connect = defineFigure({
  name: "Connect",
  label: "A plug going into a wall socket",
  offset: 18,
  setup: ({ spring }) => ({
    x: spring(REST.x, 120, 18), y: spring(REST.y, 120, 18), z: spring(REST.z, 120, 18), tilt: spring(0, 120, 14),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let x = REST.x, y = REST.y - 8 * ctx.hover, z = REST.z, tilt = 0;
    if (state === "loading") {
      // Lift to the socket's height, then push the blades up to the slots and draw back.
      const p = 0.5 - 0.5 * Math.cos(ctx.loop(1.8) * Math.PI * 2);
      x = IN.x;
      y = lerp(REST.y - 14, IN.y + 8 * S, p);
      z = lerp(REST.z + 16, IN.z, smoothstep(p / 0.5));
      m.x.set(x); m.y.set(y); m.z.set(z);
    } else if (state === "success") { x = IN.x; y = IN.y; z = IN.z; }
    else if (state === "error") { x = 14; y = FACE + 26; z = 22; tilt = -0.55; }
    const O: Vec3 = [m.x.to(x).value + shake, m.y.to(y).value, m.z.to(z).value];
    const T = m.tilt.to(tilt).value;
    const at = (u: number, v: number, w: number): Vec3 => rotX(add(O, [u * S, v * S, w * S]), O, T);

    scene.box(0, 0, 0, 124, 128, 4, "base");
    // The wall, and the outlet plate with two slots and a round earth hole.
    scene.box(0, WALL - 4, 4, 108, 8, 80, empty ? "ghost" : "base");
    const plate: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    scene.box(0, WALL + 1.5, SOCKET_Z - 30, 40, 3, 60, plate);
    if (!empty) {
      const on = (u: number, w: number): Vec3 => [u, FACE + 0.05, w];
      scene.polyline([on(-14, SOCKET_Z - 20), on(14, SOCKET_Z - 20), on(14, SOCKET_Z + 20), on(-14, SOCKET_Z + 20)], "faint", { closed: true });
      const s0 = SOCKET_Z + 4 * S - 3.5 * S, s1 = SOCKET_Z + 4 * S + 3.5 * S;
      for (const u of [-6 * S, 6 * S]) scene.polyline([on(u - 1, s0), on(u + 1, s0), on(u + 1, s1), on(u - 1, s1)], "muted", { closed: true });
      scene.polyline(frontArc(0, FACE + 0.05, SOCKET_Z - 4 * S, 2.6, 0, Math.PI * 2, 10), "muted");
      scene.polyline(frontArc(0, FACE + 0.05, SOCKET_Z + 25, 1.6, 0, Math.PI * 2, 8), "faint");
      scene.polyline(frontArc(0, FACE + 0.05, SOCKET_Z - 25, 1.6, 0, Math.PI * 2, 8), "faint");
    }

    if (empty) {
      obox(scene, [REST.x, REST.y + 10 * S, REST.z], [12 * S, 0, 0], [0, 10 * S, 0], [0, 0, 9 * S], "ghost");
      return;
    }

    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
    // Two flat blades and the round earth pin, farther than the body, then the body and its strain relief.
    if (state !== "success" || m.y.value > FACE + 9 * S) {
      for (const u of [-6, 6]) obox(scene, at(u, -5, 4), [0.9, 0, 0], R([0, 5 * S, 0], T), R([0, 0, 2.6 * S], T), tone);
      tube(scene, at(0, 0, -4), at(0, -8, -4), 1.6, 1.6, tone);
    }
    obox(scene, at(0, 10, 0), [12 * S, 0, 0], R([0, 10 * S, 0], T), R([0, 0, 9 * S], T), tone);
    // Grip ridges across the top.
    for (const v of [7, 10, 13]) scene.line(at(-9, v, 9.05), at(9, v, 9.05), "muted");
    tube(scene, at(0, 20, 0), at(0, 27, 0), 5 * S, 3.4 * S, tone);

    // The cable droops from the plug to the floor and runs off the plate.
    const tail = at(0, 27, 0);
    const land: Vec3 = [tail[0] - 6, tail[1] + 16, 4.4];
    const pts: Vec3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      pts.push([lerp(tail[0], land[0], t), lerp(tail[1], land[1], t), lerp(tail[2], land[2], t * t)]);
    }
    // Along the floor: a soft curve from where it lands to the plate's edge.
    const c: Vec3 = [land[0] + (land[1] - tail[1]) * 0.4, OUT_OF_PLATE[1] - 6, 4.4];
    for (let i = 1; i <= 6; i++) {
      const t = i / 6, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), d = t * t;
      pts.push([a * land[0] + b * c[0] + d * OUT_OF_PLATE[0], a * land[1] + b * c[1] + d * OUT_OF_PLATE[1], 4.4]);
    }
    scene.polyline(pts, "base", { bold: true });
  },
});
