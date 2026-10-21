import { defineFigure } from "../../core/define";
import type { Tone, Vec3 } from "../../engine/scene";
import { badge, frontArc } from "../shapes";

const PHONE = { w: 68, d: 10, h: 120 };
const FACE = PHONE.d / 2;
/** Bubbles, top to bottom: which side they sit on, how wide, and how high. The last is the new one. */
const BUBBLES = [
  { u: -12, w: 34, z: 92 },
  { u: 11, w: 30, z: 72 },
  { u: -9, w: 40, z: 52 },
  { u: 12, w: 30, z: 32 },
];
const TYPING = { u: -16, w: 24, z: 32 };

/** A conversation on a phone. Use for chat, comments, support and assistant replies. */
export const chat = defineFigure({
  name: "Chat",
  label: "Message bubbles on a phone",
  offset: 30,
  setup: ({ spring }) => ({
    bubbles: BUBBLES.map((_, k) => ({ out: spring(k < 3 ? 1 : 0, 150, 18) })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";

    scene.box(0, 0, 0, 120, 84, 4, "base");
    scene.box(0, 0, 4, PHONE.w, PHONE.d, PHONE.h, "base");
    // The screen's edge and the speaker.
    const on = (u: number, z: number): Vec3 => [u, FACE + 0.05, z];
    scene.polyline([on(-28, 14), on(28, 14), on(28, 112), on(-28, 112)], "faint", { closed: true });
    scene.line(on(-6, 117), on(6, 117), "muted");

    if (empty) {
      scene.box(BUBBLES[1]!.u, FACE + 1.5, BUBBLES[1]!.z, 30, 3, 12, "ghost");
      return;
    }

    BUBBLES.forEach((b, k) => {
      const last = k === 3;
      const typing = last && state === "loading";
      const slot = typing ? TYPING : b;
      const present = k < 3 || state !== "idle";
      // Each bubble stands proud of the screen; the newest one rises out of it when the pointer is near.
      const out = m.bubbles[k]!.out.to(present ? 1 + (last ? 0 : k === 2 ? ctx.hover * 1.5 : 0) : 0).value;
      if (out < 0.05) return;
      const tone: Tone = last ? (typing ? "hi" : ctx.verdict()) : "base";
      const u = slot.u + (last && state === "error" ? shake : 0), depth = 3 * out;
      scene.box(u, FACE + depth / 2, slot.z, slot.w, depth, 12, tone);
      const front = FACE + depth + 0.05;
      if (typing) {
        const active = Math.floor(ctx.time * 5) % 3;
        for (let i = 0; i < 3; i++) {
          scene.polyline(frontArc(u - 6 + i * 6, front, slot.z + 6, 1.6, 0, Math.PI * 2, 8), i === active ? "hi" : "muted");
        }
      } else {
        scene.line([u - slot.w / 2 + 5, front, slot.z + 6], [u + slot.w / 2 - 9, front, slot.z + 6], "muted");
      }
    });

    badge(scene, 0, 26, 4, state, ctx.fade());
  },
});
