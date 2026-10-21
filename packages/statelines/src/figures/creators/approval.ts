import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, smoothstep } from "../../engine/math";
import type { Tone } from "../../engine/scene";

const STAGES = [-56, 0, 56];
const POST_W = 26;
const POST_H = 36;
const PAD = 18;

/** A post moving from draft to review to approved. Use for content approvals, reviews and publishing workflows. */
export const approval = defineFigure({
  name: "Approval",
  label: "A post moving through draft, review and approved",
  offset: 16,
  setup: ({ spring }) => ({ stage: spring(0, 90, 16), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let stage = 0, hop = 0;
    if (state === "loading") {
      const q = ctx.progress(3);
      stage = ctx.determinate ? q * 2 : smoothstep(q / 0.4);
      hop = ctx.determinate ? 0 : bump(Math.min(1, q / 0.4));
      if (!ctx.determinate) m.stage.set(stage);
    }
    if (state === "success") stage = 2;
    // Rejected in review: the post stops at the middle station.
    if (state === "error") stage = 1;
    const S = clamp(m.stage.to(stage).value, 0, 2), L = m.lift.to(state === "idle" ? ctx.hover * 10 : 0).value;

    scene.box(0, 0, 0, 176, 64, 4, "base");
    scene.line([STAGES[0]!, 0, 4.05], [STAGES[2]!, 0, 4.05], empty ? "ghost" : "faint", { bold: true });
    STAGES.forEach((x, k) => {
      const tone: Tone = empty ? "ghost"
        : k === 2 && state === "success" ? "ok"
        : k === 1 && state === "error" ? "err"
        : Math.round(S) === k && state === "loading" ? "hi" : "base";
      scene.cylinder(x, 0, 4, PAD, 5, tone);
      if (empty) return;
      const z = 9.05;
      // Draft: lines of text. Review: an eye. Approved: a seal.
      if (k === 0) [-6, 0, 6].forEach((dy, i) => scene.line([x - 8, dy, z], [x + (i === 2 ? 2 : 8), dy, z], "muted"));
      if (k === 1) {
        scene.arc(x, 0, z, 10, -2.4, -0.75, "muted");
        scene.arc(x, 0, z, 10, 0.75, 2.4, "muted");
        scene.disc(x, 0, z, 3, "muted", { fill: true });
      }
      if (k === 2) { scene.disc(x, 0, z, 10, "muted"); scene.disc(x, 0, z, 5, "muted"); }
    });
    if (empty) return;

    // The post: an upright card with a picture and a caption on its face.
    const i = Math.min(1, Math.floor(S)), f = S - i;
    const x = lerp(STAGES[i]!, STAGES[i + 1]!, f) + shake, z = 9 + L + 18 * hop + 14 * bump(f);
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
    const y = 3, face = y + 1.55;
    scene.box(x, y, z, POST_W, 3, POST_H, tone);
    scene.polyline([[x - 9, face, z + 14], [x - 3, face, z + 24], [x + 2, face, z + 19], [x + 9, face, z + 28]], "muted");
    scene.line([x - 9, face, z + 8], [x + 5, face, z + 8], "muted");

  },
});
