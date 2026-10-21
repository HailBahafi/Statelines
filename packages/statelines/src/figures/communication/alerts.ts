import { defineFigure } from "../../core/define";
import { bump, smoothstep } from "../../engine/math";
import type { Tone } from "../../engine/scene";

const MAX = 4;
const cardY = (k: number) => 18 - k * 14;
const W = 100;
const D = 38;

/** A stack of notifications with a badge. Use for alerts, activity feeds and unread counts. `count`: cards at rest, 0–4. */
export const alerts = defineFigure({
  name: "Alerts",
  label: "A stack of notifications with a badge",
  offset: 14,
  setup: ({ spring }) => ({
    cards: Array.from({ length: MAX + 1 }, (_, k) => ({ z: spring(4 + k * 9), opacity: spring(k < 2 ? 1 : 0, 150, 22) })),
    badge: spring(0, 200, 14),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const resting = ctx.count(2, MAX);
    const spread = 9 + ctx.hover * 7;
    const count = state === "idle" ? resting : state === "empty" ? 0 : resting + 1;
    const q = state === "loading" ? ctx.loop(2) : 0;
    let topZ = 4, topY = cardY(0);

    scene.box(0, -4, 0, 136, 112, 4, "base");
    m.cards.forEach((card, k) => {
      let z = 4 + k * spread, opacity = k < count ? 1 : 0;
      if (state === "loading" && k === resting) {
        z = 4 + k * spread + 50 * (1 - smoothstep(q / 0.35));
        opacity = 1 - smoothstep((q - 0.86) / 0.1);
        card.z.set(z); card.opacity.set(opacity);
      }
      const Z = card.z.to(z).value, O = card.opacity.to(opacity).value;
      if (O < 0.01) return;
      const top = k === count - 1;
      const tone: Tone = top ? (state === "loading" ? "hi" : ctx.verdict()) : "base";
      const x = top && state === "error" ? shake : 0, y = cardY(k), t = Z + 3.05;
      scene.box(x, y, Z, W, D, 3, tone, O);
      // Each notification: an app icon, a title and a line of detail.
      scene.rect(x - 44, y - 8, x - 30, y + 6, t, top ? (tone === "base" ? "muted" : tone) : "muted", O);
      scene.line([x - 24, y - 5, t], [x + 18, y - 5, t], "muted", { opacity: O, bold: top });
      scene.line([x - 24, y + 4, t], [x + 2, y + 4, t], "faint", { opacity: O });
      if (top) { topZ = Z + 3; topY = y; }
    });

    const bx = W / 2 - 6, by = (y: number) => y - D / 2 + 4;
    if (count === 0) {
      scene.box(0, cardY(0), 4, W, D, 3, "ghost");
      scene.cylinder(bx, by(cardY(0)), 7, 9, 6, "ghost");
      return;
    }
    // The unread badge sits on the top card's far corner and takes the verdict's colour.
    const pulse = state === "loading" ? bump(q / 0.5) : 0;
    const B = m.badge.to(pulse * 8).value;
    scene.cylinder(bx + (state === "error" ? shake : 0), by(topY), topZ + B, 9, 6, state === "loading" ? "hi" : ctx.verdict());
    scene.disc(bx, by(topY), topZ + B + 6.05, 3, "muted", { fill: true });
  },
});
