import { defineFigure } from "../../core/define";
import { smoothstep } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge, envelope, tray } from "../shapes";

const MAX = 6;
const PITCH = 5;
const WALL_TOP = 19;
const SCALE = 1.5;

/** Letters drop into a tray. Use for inboxes, queues and received items. `count`: letters at rest, 0–6. */
export const inbox = defineFigure({
  name: "Inbox",
  label: "Letters dropping into a tray",
  offset: -6,
  setup: ({ spring }) => ({
    cards: Array.from({ length: MAX + 1 }, (_, k) => ({
      z: spring(6 + k * PITCH), x: spring(0), y: spring(0), opacity: spring(k < 3 ? 1 : 0, 140, 22),
    })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(14);
    const resting = ctx.count(3, MAX);
    const arriving = resting;
    const above: (() => void)[] = [];

    const drawCards = () => {
      m.cards.forEach((card, k) => {
        let z = 6 + k * PITCH, x = 0, y = 0, opacity = k < resting ? 1 : 0;
        if (state === "idle" && k === resting - 1) { z += ctx.hover * 18; x = lean.x; y = lean.y; }
        if ((state === "success" || state === "error") && k === arriving) opacity = 1;
        // Rejected: the newest letter bounces off and hangs above the tray's edge.
        if (state === "error" && k === arriving) { x = 40; y = -14; z = 46; }
        if (state === "empty") opacity = 0;
        if (state === "loading") {
          const total = arriving + 1, q = ctx.progress(1.2 + total * 0.35);
          if (ctx.determinate) {
            opacity = k < Math.round(q * total) ? 1 : 0;
            if (!opacity) z += 60;
          } else {
            const start = (k / total) * 0.68;
            opacity = k < total && q > start ? 1 : 0;
            z += 90 * (1 - smoothstep((q - start) / 0.14));
            if (q > 0.84) {
              const out = smoothstep((q - 0.84) / 0.16);
              x = out * 120; y = -out * 20; opacity *= 1 - out;
            }
            card.z.set(z); card.x.set(x); card.y.set(y); card.opacity.set(opacity);
          }
        }
        const Z = card.z.to(z).value, X = card.x.to(x).value, Y = card.y.to(y).value, O = card.opacity.to(opacity).value;
        const newest = k === arriving;
        const bad = state === "error" && newest;
        const falling = state === "loading" && Z > 6 + k * PITCH + 2;
        const tone: Tone = bad ? "err" : state === "success" && newest ? "ok" : falling ? "hi" : "base";
        const draw = () => {
          envelope(scene, X + (bad ? shake : 0), Y, Z, tone, O, SCALE);
          if (newest) badge(scene, X + (bad ? shake : 0), Y - 2, Z + 3, state, ctx.fade(), 11);
        };
        if (Z + 3 > WALL_TOP) above.push(draw); else draw();
      });
      if (state === "empty") envelope(scene, 0, 0, 6, "ghost", undefined, SCALE);
    };

    tray(scene, 120, 84, 16, 0, "base", drawCards);
    above.forEach(draw => draw());
  },
});
