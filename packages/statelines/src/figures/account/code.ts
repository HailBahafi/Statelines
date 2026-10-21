import { defineFigure } from "../../core/define";
import { clamp, falloff } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge, frontArc } from "../shapes";

const MAX = 8;
const TYPE_EVERY = 0.38;
const ROW_Y = 14;
const LOCK = { x: -6, y: -40, w: 36, d: 20, h: 28 };

/** Keys of a one-time code and the lock they open. Use for two-factor, phone and email verification. `count`: digits, 4–8. */
export const code = defineFigure({
  name: "Code",
  label: "Keys of a verification code and a lock",
  offset: -6,
  setup: ({ spring }) => ({
    press: Array.from({ length: MAX }, () => spring(0, 260, 22)),
    shackle: spring(0, 140, 14),
    pop: spring(0, 180, 14),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(18);
    const digits = ctx.count(6, MAX, 4);
    const pitch = Math.min(28, 168 / digits), key = pitch - 5;
    const half = (digits * pitch) / 2;
    const keyX = (k: number) => (k - (digits - 1) / 2) * pitch;
    const empty = state === "empty";

    const period = (digits + 3) * TYPE_EVERY;
    const elapsed = state === "loading" ? ctx.progress(period) * period : 0;
    const typed = state !== "loading" ? 0
      : ctx.determinate ? Math.round((elapsed / period) * digits)
      : Math.min(digits, Math.floor(elapsed / TYPE_EVERY));

    scene.box(0, -14, 0, 2 * half + 24, 96, 4, "base");

    // The lock behind the keys: its shackle lifts open when the code is accepted.
    const S = m.shackle.to(state === "success" ? 1 : 0).value;
    const lockTone: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    const lx = LOCK.x + (state === "error" ? shake * 0.5 : 0), ly = LOCK.y, top = 4 + LOCK.h;
    // Open, the shackle rises and its right leg leaves the body.
    const arcZ = top + 7 + S * 12;
    scene.box(lx, ly, 4, LOCK.w, LOCK.d, LOCK.h, lockTone);
    scene.box(lx - 10, ly, top, 3, 3, arcZ - top, lockTone);
    scene.polyline(frontArc(lx, ly, arcZ, 10, 0, Math.PI, 16), lockTone, { bold: true });
    scene.box(lx + 10, ly, top + S * 12, 3, 3, 7, lockTone);
    if (!empty) {
      const face = ly + LOCK.d / 2 + 0.05;
      scene.polyline(frontArc(lx, face, 4 + LOCK.h * 0.58, 3, 0, Math.PI * 2, 10), lockTone === "base" ? "muted" : lockTone);
      scene.line([lx, face, 4 + LOCK.h * 0.58 - 2.5], [lx, face, 4 + LOCK.h * 0.25], lockTone === "base" ? "muted" : lockTone, { bold: true });
    }

    // The key row: a strip with one key per digit.
    scene.box(0, ROW_Y, 4, 2 * half + 6, key + 8, 3, empty ? "ghost" : "base");
    const wrong = Math.min(digits - 1, 2);
    const P = m.pop.to(state === "error" ? 1 : 0).value;
    for (let k = 0; k < digits; k++) {
      const press = m.press[k]!, x = keyX(k);
      let depth = 0;
      if (state === "idle") depth = 4 * ctx.hover * falloff(x - g.x, 13);
      if (state === "loading" && !ctx.determinate) {
        const since = elapsed - (k + 1) * TYPE_EVERY;
        depth = since > 0 && since < 0.2 ? 6 * Math.sin((Math.PI * since) / 0.2) : 0;
        press.set(depth);
      }
      if (state === "success") depth = 4;
      const D = clamp(press.to(depth).value, -2, 8);
      const filled = state === "success" || state === "error" || k < typed;
      const bad = state === "error" && k === wrong;
      // On error the wrong key pops up out of the row and sits askew.
      const up = bad ? P * 10 : 0, dy = bad ? P * 4 : 0;
      const tone: Tone = empty ? "ghost"
        : state === "loading" ? (k === typed - 1 ? "hi" : "base")
        : state === "success" ? "ok" : bad ? "err" : "base";
      const z = 7 - D + up, h = 10;
      scene.box(x + (bad ? shake : 0), ROW_Y + dy, z, key, key, h, tone);
      const t = z + h + 0.05;
      if (filled) scene.disc(x + (bad ? shake : 0), ROW_Y + dy, t, 3.2, tone === "base" ? "muted" : tone, { fill: true });
      if (empty && k === 0) scene.line([x, ROW_Y - key * 0.3, 7 + h + 0.05], [x, ROW_Y + key * 0.3, 7 + h + 0.05], "muted", { bold: true });
    }

    badge(scene, half - 14, -44, 4, state, ctx.fade(), 12);
  },
});
