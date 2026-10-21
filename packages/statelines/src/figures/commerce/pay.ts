import { defineFigure } from "../../core/define";
import type { Tone } from "../../engine/scene";
import { badge } from "../shapes";

const BODY_Z = 4;
const TOP = BODY_Z + 18;
const SCREEN = [0, -22] as const;

/** A card taps a terminal. Use for checkout, payments and subscriptions. */
export const pay = defineFigure({
  name: "Pay",
  label: "A card tapping a payment terminal",
  offset: 2,
  setup: ({ spring }) => ({ z: spring(60), x: spring(0), y: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(18);
    let z = 60 - ctx.hover * 14, x = lean.x, y = lean.y;
    if (state === "loading") { z = TOP + 12; x = y = 0; }
    // Approved: the card lifts away. Declined: it drops onto the keypad, clear of the screen.
    if (state === "success") { z = 72; x = y = 0; }
    if (state === "error") { z = TOP + 2; x = 8; y = 36; }
    const Z = m.z.to(z).value, X = m.x.to(x).value + shake, Y = m.y.to(y).value;
    const terminal: Tone = ctx.verdict();
    const [sx, sy] = SCREEN;

    scene.box(0, 6, 0, 112, 132, BODY_Z, "base");
    scene.box(0, 6, BODY_Z, 76, 100, 18, terminal);
    // The screen, set into the top, and a keypad below it.
    scene.rect(sx - 26, sy - 15, sx + 26, sy + 15, TOP + 0.05, terminal === "base" ? "muted" : terminal);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) scene.disc(-16 + c * 16, 8 + r * 13, TOP + 0.05, 3, "muted");
    scene.line([-18, 46, TOP + 0.05], [18, 46, TOP + 0.05], "muted", { bold: true });

    if (state === "loading") {
      const active = Math.floor(ctx.time * 4) % 3;
      for (let k = 0; k < 3; k++) scene.disc(sx - 12 + k * 12, sy, TOP + 0.05, 2.6, k === active ? "hi" : "muted", { fill: true });
      for (let k = 0; k < 3; k++) {
        const q = (ctx.loop(1 / 0.9) + k / 3) % 1;
        scene.disc(X, Y, Z - 2, 24 + 40 * q, "muted", { opacity: 1 - q });
      }
    }
    if (state !== "loading") badge(scene, sx, sy, TOP, state, ctx.fade());

    if (state === "empty") { scene.box(X, Y, Z, 78, 50, 2, "ghost"); return; }
    const card: Tone = state === "error" ? "err" : state === "loading" ? "hi" : "base";
    scene.box(X, Y, Z, 78, 50, 2, card);
    scene.rect(X - 30, Y - 14, X - 18, Y - 4, Z + 2.05, card === "base" ? "muted" : card);
    scene.line([X - 30, Y + 12, Z + 2.05], [X + 12, Y + 12, Z + 2.05], "muted");
    scene.line([X - 30, Y + 18, Z + 2.05], [X - 6, Y + 18, Z + 2.05], "faint");
  },
});
