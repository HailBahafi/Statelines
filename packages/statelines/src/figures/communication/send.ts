import { defineFigure } from "../../core/define";
import { clamp, lerp, smoothstep } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { envelope } from "../shapes";

const FROM = [-52, 34] as const;
const TO = [50, -34] as const;
const POST = 34;
const BOX = { w: 34, d: 48, h: 28 };
const TOP = 4 + POST + BOX.h;
const START = 4 + 6;
const at = (p: number): Vec3 => [
  lerp(FROM[0], TO[0], p), lerp(FROM[1], TO[1], p),
  lerp(START, TOP + 4, p) + Math.sin(Math.PI * clamp(p)) * 44,
];

/** An envelope flies to the other side. Use for sent messages, emails and invitations. */
export const send = /*#__PURE__*/ defineFigure({
  name: "Send",
  label: "An envelope flying from a tray into a mailbox",
  offset: 14,
  setup: ({ spring }) => ({ p: spring(0, 110, 20), flag: spring(0, 160, 16), drop: spring(0, 150, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(12);
    let p = 0, opacity = 1;
    if (state === "loading") {
      const q = ctx.progress(1.9);
      if (ctx.determinate) p = q;
      else {
        p = smoothstep(q / 0.8);
        opacity = 1 - smoothstep((q - 0.84) / 0.1);
        m.p.set(p);
      }
    } else if (state === "success") p = 1;
    else if (state === "error") p = 0.5;

    const P = m.p.to(p).value, F = m.flag.to(state === "success" ? 1 : 0).value;
    const D = m.drop.to(state === "error" ? 1 : 0).value;
    const empty = state === "empty";
    const idle = state === "idle";
    const [tx, ty] = TO;

    scene.box(0, 0, 0, 156, 112, 4, "base");
    // The outbox: a shallow tray on the plate.
    scene.box(FROM[0], FROM[1], 4, 58, 44, 6, "base");
    scene.rect(FROM[0] - 24, FROM[1] - 17, FROM[0] + 24, FROM[1] + 17, START + 0.05, "faint");

    // The mailbox: a box on a post, a slot on top and a flag on its side that rises on delivery.
    const mail: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    scene.box(tx, ty, 4, 7, 7, POST, empty ? "ghost" : "base");
    scene.box(tx, ty, 4 + POST, BOX.w, BOX.d, BOX.h, mail);
    if (!empty) scene.rect(tx - 3, ty - 14, tx + 3, ty + 14, TOP + 0.05, "muted");
    const fz = 4 + POST + 2 + F * 14, fx = tx + BOX.w / 2 + 1.5, fy = ty + 10;
    scene.box(fx, fy, fz, 2, 2, 16, empty ? "ghost" : state === "success" ? "ok" : "muted");
    scene.box(fx, fy - 5, fz + 9, 2, 10, 7, empty ? "ghost" : state === "success" ? "ok" : "muted");

    if (empty) { envelope(scene, FROM[0], FROM[1], START, "ghost"); return; }
    if (state === "success" && P > 0.97) {
      // Delivered: the envelope stands half out of the slot.
      scene.box(tx, ty, TOP - 6, 3, 26, 18, "ok");
      return;
    }
    const [ax, ay, az] = at(P);
    const x = ax + (idle ? lean.x : 0), y = ay + (idle ? lean.y : 0), z = lerp(az, 4, D) + (idle ? ctx.hover * 12 : 0);
    // On error it falls short and lies on the plate between the two.
    envelope(scene, x + shake, y, z, state === "loading" ? "hi" : ctx.verdict(), opacity);
  },
});
