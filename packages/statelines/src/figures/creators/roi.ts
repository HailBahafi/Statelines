import { defineFigure } from "../../core/define";
import { lerp, smoothstep } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";
import { coins, facing } from "../shapes";

const SPEND: [number, number] = [-52, 22];
const ENGINE: [number, number] = [0, 0];
const RETURN: [number, number] = [52, -22];
const IN = 3;
const OUT_MAX = 9;

/** A little spend goes into a campaign and more comes out. Use for ROI, campaign results and attribution. */
export const roi = defineFigure({
  name: "Roi",
  label: "Spend entering a campaign and a larger return leaving it",
  offset: 14,
  setup: ({ spring }) => ({ out: spring(OUT_MAX, 120, 18), arrow: spring(1, 120, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let out = OUT_MAX;
    if (state === "loading") { out = Math.round(ctx.progress(3) * OUT_MAX); }
    if (state === "error") out = 2;
    if (state === "empty") out = 0;
    const O = Math.round(m.out.to(out).value);
    const A = m.arrow.to(state === "success" ? 1 : state === "idle" ? 0.5 + ctx.hover * 0.5 : state === "error" ? -0.4 : 0).value;

    scene.box(0, 0, 0, 160, 76, 4, "base");
    scene.line([SPEND[0], SPEND[1], 4.05], [RETURN[0], RETURN[1], 4.05], "faint");
    if (state === "empty") {
      scene.cylinder(SPEND[0], SPEND[1], 4, 13, 4, "ghost");
      scene.box(ENGINE[0], ENGINE[1], 4, 34, 34, 30, "ghost");
      scene.cylinder(RETURN[0], RETURN[1], 4, 13, 4, "ghost");
      return;
    }
    coins(scene, SPEND[0], SPEND[1], 4, IN, "muted", "muted", 13);
    scene.box(ENGINE[0] + shake, ENGINE[1], 4, 34, 34, 30, state === "loading" ? "hi" : ctx.verdict());
    scene.sparkle(ENGINE[0], ENGINE[1], 46, 7, state === "loading" ? "hi" : "muted");
    if (state === "loading") {
      const f = smoothstep(ctx.loop(1.1));
      scene.cylinder(lerp(SPEND[0], ENGINE[0] - 10, f), lerp(SPEND[1], ENGINE[1] + 4, f), 4 + IN * 5 + 6 * f, 13, 4, "hi", 1 - f);
    }
    const top = coins(scene, RETURN[0], RETURN[1], 4, Math.max(1, O), "base", state === "loading" ? "hi" : ctx.verdict(), 13);

    if (Math.abs(A) > 0.05) {
      const [bx, by, bz] = [RETURN[0] + 24, RETURN[1] + 8, top - 10];
      const tip: Vec3 = facing(bx, by, bz, 18, 26 * A);
      const tone = state === "error" ? "err" : state === "success" ? "ok" : "muted";
      scene.polyline([facing(bx, by, bz, -12, -4 * A), facing(bx, by, bz, 2, 10 * A), facing(bx, by, bz, 8, 4 * A), tip], tone, { bold: true });
      scene.polyline([facing(bx, by, bz, 8, 26 * A), tip, facing(bx, by, bz, 18, 14 * A)], tone, { bold: true });
    }
    if (state === "success") scene.check(RETURN[0], RETURN[1], top, "ok", ctx.fade());
    if (state === "error") scene.cross(RETURN[0], RETURN[1], top, "err", ctx.fade());
  },
});
