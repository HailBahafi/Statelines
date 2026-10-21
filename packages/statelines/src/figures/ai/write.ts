import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";

const LINES = [70, 60, 68, 38, 70, 56, 64, 30];
const TOTAL = LINES.reduce((a, b) => a + b, 0);
const LEFT = -36;
const lineY = (k: number) => -46 + k * 13;
const WRITTEN = { idle: 198, loading: 0, success: TOTAL, error: 264, empty: 0 } as const;

/** A page writes itself line by line. Use for AI replies, generated drafts and summaries. */
export const write = defineFigure({
  name: "Write",
  label: "A page writing itself line by line",
  setup: ({ spring }) => ({ lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const lift = m.lift.to(state === "idle" ? ctx.hover * 8 : 0).value;
    const top = lift + 3.05;
    const q = state === "loading" ? ctx.progress(4.2) : 0;
    const written = state !== "loading" ? WRITTEN[state] : ctx.determinate ? q * TOTAL : Math.min(TOTAL, ((q * 4.2) / 3.4) * TOTAL);

    scene.box(0, 0, lift, 96, 124, 3, state === "success" ? "ok" : "base");

    let caret = { x: LEFT, y: lineY(0) }, used = 0;
    for (let k = 0; k < LINES.length; k++) {
      const length = clamp(written - used, 0, LINES[k]!);
      used += LINES[k]!;
      if (length <= 0) { caret = { x: LEFT, y: lineY(k) }; break; }
      const last = written <= used;
      scene.line([LEFT, lineY(k), top], [LEFT + length, lineY(k), top], state === "error" && last ? "err" : "base");
      caret = { x: LEFT + length, y: lineY(k) };
      if (last) break;
    }

    if (state === "success") scene.check(26, 44, top, "ok", ctx.fade());
    else if (state === "error") scene.cross(caret.x + 12 + shake, caret.y, top, "err", ctx.fade());
    else {
      const blink = 1;
      scene.box(caret.x + 5, caret.y, top, 5, 8, 9, "hi", blink);
    }

    if (state !== "error") {
      const pulse = state === "loading" ? 1 + 0.25 * Math.sin(ctx.time * 6) : 1;
      const tone = state === "loading" ? "hi" : state === "success" ? "ok" : "muted";
      scene.sparkle(44, -70, 40 + lift, 9 * pulse, tone);
      scene.sparkle(58, -48, 22 + lift, 5 * (2 - pulse), tone, 0.8);
    }
  },
});
