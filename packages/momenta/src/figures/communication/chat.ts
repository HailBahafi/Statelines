import { defineFigure } from "../../core/define";
import { wrap } from "../../engine/math";

interface Slot { x: number; y: number; w: number }
const SLOTS: Slot[] = [
  { x: -14, y: -40, w: 56 },
  { x: 14, y: -14, w: 56 },
  { x: -14, y: 12, w: 56 },
  { x: 14, y: 38, w: 56 },
];
const TYPING: Slot = { x: -26, y: 38, w: 30 };

/** A conversation on a phone. Use for chat, comments, support and assistant replies. */
export const chat = defineFigure({
  name: "Chat",
  label: "Message bubbles on a phone",
  setup: ({ spring }) => ({
    bubbles: SLOTS.map((_, k) => ({ z: spring(4), opacity: spring(k < 3 ? 1 : 0, 150, 22) })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    scene.box(0, 0, 0, 96, 128, 4, "base");
    scene.rect(-12, -58, 12, -54, 4, "faint");

    if (state === "empty") {
      scene.box(SLOTS[1]!.x, SLOTS[1]!.y, 4, 56, 18, 4, "ghost");
      return;
    }

    m.bubbles.forEach((bubble, k) => {
      const last = k === 3;
      const typing = last && state === "loading";
      const slot = typing ? TYPING : SLOTS[k]!;
      const present = k < 3 || state !== "idle";
      const lift = state === "idle" && k === 2 ? ctx.hover * 8 : 0;
      const Z = bubble.z.to(4 + lift).value, O = bubble.opacity.to(present ? 1 : 0).value;
      const tone = last ? (typing ? "hi" : ctx.verdict()) : "base";
      const x = slot.x + (last && state === "error" ? shake : 0);

      scene.box(x, slot.y, Z, slot.w, 18, 4, tone, O);
      if (typing) {
        const active = Math.floor(ctx.time * 5) % 3;
        for (let i = 0; i < 3; i++) scene.disc(x - 8 + i * 8, slot.y, Z + 4.05, 2.4, i === active ? "hi" : "muted", { fill: true, opacity: O });
      } else {
        scene.line([x - slot.w / 2 + 8, slot.y, Z + 4.05], [x + slot.w / 2 - 16, slot.y, Z + 4.05], "muted", { opacity: O });
      }
      if (last && state === "success") scene.check(x + 18, slot.y, Z + 4, "ok", ctx.fade());
      if (last && state === "error") scene.cross(x + 18, slot.y, Z + 4, "err", ctx.fade());
    });
  },
});
