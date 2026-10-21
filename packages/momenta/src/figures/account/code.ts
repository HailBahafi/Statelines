import { defineFigure } from "../../core/define";
import { falloff } from "../../engine/math";

const MAX = 8;
const PITCH = 27;
const TYPE_EVERY = 0.38;

/** Keys of a one-time code. Use for two-factor, phone and email verification. `count`: digits, 4–8. */
export const code = defineFigure({
  name: "Code",
  label: "Keys of a verification code",
  offset: -16,
  setup: ({ spring }) => ({ press: Array.from({ length: MAX }, () => spring(0, 260, 22)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(18);
    const digits = ctx.count(6, MAX, 4);
    const keyX = (k: number) => (k - (digits - 1) / 2) * PITCH;
    scene.box(0, 0, 0, digits * PITCH + 10, 50, 6, ctx.verdict());

    const period = (digits + 3) * TYPE_EVERY;
    const elapsed = state === "loading" ? ctx.progress(period) * period : 0;
    const typed = state !== "loading" ? 0
      : ctx.determinate ? Math.round((elapsed / period) * digits)
      : Math.min(digits, Math.floor(elapsed / TYPE_EVERY));

    for (let k = 0; k < digits; k++) {
      const press = m.press[k]!, x = keyX(k);
      let depth = 0;
      if (state === "idle") depth = 6 * ctx.hover * falloff(x - g.x, 13);
      if (state === "loading" && !ctx.determinate) {
        const since = elapsed - (k + 1) * TYPE_EVERY;
        depth = since > 0 && since < 0.2 ? 7 * Math.sin((Math.PI * since) / 0.2) : 0;
        press.set(depth);
      }
      const D = press.to(depth).value;
      const dx = state === "error" ? shake * (k % 2 ? -1 : 1) : 0;
      const filled = state === "success" || state === "error" || k < typed;
      const tone = state === "empty" ? "muted" : state === "loading" ? (k === typed - 1 ? "hi" : "base") : ctx.verdict();
      const top = 18 - D;
      scene.box(x + dx, 0, 6 - D, 22, 22, 12, tone);
      if (filled) scene.disc(x + dx, 0, top, 3.4, tone === "base" ? "hi" : tone, { fill: true });
      if (state === "empty" && k === 0) scene.line([x, -7, top], [x, 7, top], "hi", { bold: true });
    }
  },
});
