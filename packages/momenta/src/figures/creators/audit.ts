import { defineFigure } from "../../core/define";
import { clamp, wrap } from "../../engine/math";
import { person } from "../shapes";

const N = 7;
const SPAN = 140;
const FAKES = new Set([2, 5]);
const GATE = 0;

/** Followers pass a scanner and the fake ones drop away. Use for audience audits, fake follower checks and fraud. */
export const audit = defineFigure({
  name: "Audit",
  label: "Followers passing a scanner that drops the fake ones",
  offset: 14,
  setup: ({ spring }) => ({ beam: spring(28) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const flow = state === "loading" ? ctx.loop(SPAN / 26) * SPAN : state === "idle" ? ctx.pointer.x * 0.15 * ctx.hover : 0;
    const settled = state === "success" || state === "error";
    const beam = m.beam.to(28 + (state === "idle" ? ctx.hover * 8 : 0)).value;
    const gate = state === "empty" ? "ghost" : state === "loading" ? "hi" : ctx.verdict();

    scene.box(0, 0, 0, 160, 44, 4, "base");
    scene.line([-74, 0, 4.05], [74, 0, 4.05], "faint");
    scene.box(GATE + shake, -20, 4, 6, 6, beam + 6, gate);

    if (state !== "empty") {
      const people = Array.from({ length: N }, (_, k) => {
        const base = settled ? -60 + k * 20 : wrap(-70 + k * (SPAN / N) + flow, SPAN) - 70;
        return { k, x: base };
      }).sort((a, b) => a.x - b.x);
      for (const { k, x } of people) {
        const fake = FAKES.has(k), past = x > GATE;
        if (settled && fake && state === "success") continue;
        const drop = fake && past && !settled ? clamp((x - GATE) / 16) : 0;
        const tone = state === "error" && fake ? "err"
          : fake && past ? "ghost"
          : past && state === "loading" ? "hi"
          : state === "success" ? "ok" : "base";
        person(scene, x, 0, 4 - drop * 18, tone, 1 - drop * 0.8, 0.8);
      }
    }

    const beamTone = state === "loading" ? "hi" : state === "empty" ? "ghost" : "muted";
    scene.line([GATE + shake, -20, beam + 4], [GATE + shake, 20, beam + 4], beamTone, { bold: true });
    scene.box(GATE + shake, 20, 4, 6, 6, beam + 6, gate);

    if (state === "success") scene.check(GATE, 0, beam + 14, "ok", ctx.fade());
    if (state === "error") scene.cross(GATE + shake, 0, beam + 14, "err", ctx.fade());
  },
});
