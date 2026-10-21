import { defineFigure } from "../../core/define";
import { bump, lerp, smoothstep } from "../../engine/math";

const STAGES: [number, number][] = [[-54, 20], [0, 0], [54, -20]];
const POST_W = 26;
const POST_H = 34;

/** A post moving from draft to review to approved. Use for content approvals, reviews and publishing workflows. */
export const approval = defineFigure({
  name: "Approval",
  label: "A post moving through draft, review and approved",
  offset: 10,
  setup: ({ spring }) => ({ stage: spring(0, 90, 16), lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let stage = 0, hop = 0;
    if (state === "loading") {
      const q = ctx.progress(3);
      stage = ctx.determinate ? q * 2 : smoothstep(q / 0.4);
      hop = ctx.determinate ? 0 : bump(Math.min(1, q / 0.4));
      if (!ctx.determinate) m.stage.set(stage);
    }
    if (state === "success") stage = 2;
    if (state === "error") stage = 0;
    const S = m.stage.to(stage).value, L = m.lift.to(state === "idle" ? ctx.hover * 10 : 0).value;

    scene.box(0, 0, 0, 160, 76, 4, "base");
    scene.polyline(STAGES.map(([x, y]) => [x, y, 4.05]), state === "empty" ? "ghost" : "faint", { bold: true });
    STAGES.forEach(([x, y], k) => {
      const here = Math.round(S) === k && state !== "empty";
      const tone = state === "empty" ? "ghost"
        : k === 2 && state === "success" ? "ok"
        : k === 0 && state === "error" ? "err"
        : here && state === "loading" ? "hi" : "base";
      scene.cylinder(x, y, 4, 17, 5, tone);
      if (k === 0) [-4, 0, 4].forEach(dy => scene.line([x - 7, y + dy, 9.05], [x + 7, y + dy, 9.05], "muted"));
      if (k === 1) { scene.disc(x, y, 9.05, 7, "muted"); scene.disc(x, y, 9.05, 2.5, "muted", { fill: true }); }
      if (k === 2) { scene.disc(x, y, 9.05, 9, "muted"); scene.disc(x, y, 9.05, 5, "muted"); }
    });
    if (state === "empty") return;

    const i = Math.min(1, Math.floor(S)), f = S - i;
    const [ax, ay] = STAGES[i]!, [bx, by] = STAGES[Math.min(2, i + 1)]!;
    const x = lerp(ax, bx, f) + shake, y = lerp(ay, by, f), z = 9 + L + 18 * hop + 14 * bump(f);
    const tone = state === "loading" ? "hi" : ctx.verdict();
    scene.box(x, y, z, POST_W, 3, POST_H, tone);
    scene.polyline([[x - 9, y + 1.6, z + 14], [x - 2, y + 1.6, z + 24], [x + 3, y + 1.6, z + 19], [x + 9, y + 1.6, z + 27]], "muted");
    scene.line([x - 9, y + 1.6, z + 7], [x + 4, y + 1.6, z + 7], "muted");

    if (state === "success") scene.check(x, y + 18, 9, "ok", ctx.fade());
    if (state === "error") scene.cross(x, y + 18, 9, "err", ctx.fade());
  },
});
