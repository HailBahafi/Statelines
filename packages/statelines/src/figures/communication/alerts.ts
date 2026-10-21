import { defineFigure } from "../../core/define";
import { bump, smoothstep } from "../../engine/math";

const MAX = 4;
const cardY = (k: number) => 18 - k * 14;

/** A stack of notifications with a badge. Use for alerts, activity feeds and unread counts. `count`: cards at rest, 0–4. */
export const alerts = defineFigure({
  name: "Alerts",
  label: "A stack of notifications with a badge",
  offset: 8,
  setup: ({ spring }) => ({
    cards: Array.from({ length: MAX + 1 }, (_, k) => ({ z: spring(k * 9), opacity: spring(k < 2 ? 1 : 0, 150, 22) })),
    badge: spring(0, 200, 14),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const resting = ctx.count(2, MAX);
    const spread = 9 + ctx.hover * 7;
    const count = state === "idle" ? resting : state === "empty" ? 0 : resting + 1;
    const q = state === "loading" ? ctx.loop(2) : 0;
    let topZ = 0, topY = cardY(0);

    m.cards.forEach((card, k) => {
      let z = k * spread, opacity = k < count ? 1 : 0;
      if (state === "loading" && k === resting) {
        z = k * spread + 50 * (1 - smoothstep(q / 0.35));
        opacity = 1 - smoothstep((q - 0.86) / 0.1);
        card.z.set(z); card.opacity.set(opacity);
      }
      const Z = card.z.to(z).value, O = card.opacity.to(opacity).value;
      if (O < 0.01) return;
      const top = k === count - 1;
      const tone = top ? (state === "loading" ? "hi" : ctx.verdict()) : "base";
      const x = top && state === "error" ? shake : 0, y = cardY(k);
      scene.box(x, y, Z, 100, 38, 3, tone, O);
      scene.line([x - 40, y - 6, Z + 3.05], [x + 12, y - 6, Z + 3.05], "muted", { opacity: O });
      scene.line([x - 40, y + 6, Z + 3.05], [x - 8, y + 6, Z + 3.05], "faint", { opacity: O });
      if (top) { topZ = Z + 3; topY = y; }
    });

    if (count === 0) {
      scene.box(0, cardY(0), 0, 100, 38, 3, "ghost");
      scene.cylinder(44, cardY(0) - 14, 3, 9, 6, "ghost");
      return;
    }
    const pulse = state === "loading" ? bump(q / 0.5) : 0;
    const B = m.badge.to(pulse * 8).value;
    const badge = state === "loading" ? "hi" : ctx.verdict("hi");
    scene.cylinder(44 + (state === "error" ? shake : 0), topY - 14, topZ + B, 9, 6, badge);

    if (state === "success") scene.check(-6, topY, topZ, "ok", ctx.fade());
    if (state === "error") scene.cross(-6 + shake, topY, topZ, "err", ctx.fade());
  },
});
