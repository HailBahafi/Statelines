import { defineFigure } from "../../core/define";
import { lerp, smoothstep } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { coins } from "../shapes";

const SPEND: [number, number] = [-58, 20];
const ENGINE: [number, number] = [0, 0];
const RETURN: [number, number] = [58, -20];
const SIZE = 38;
const HEIGHT = 30;
const IN = 3;
const OUT_MAX = 9;
const R = 13;

/** A little spend goes into a campaign and more comes out. Use for ROI, campaign results and attribution. */
export const roi = defineFigure({
  name: "Roi",
  label: "Spend entering a campaign and a larger return leaving it",
  offset: 14,
  setup: ({ spring }) => ({ out: spring(OUT_MAX - 2, 120, 18), trend: spring(0.6, 120, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let out = OUT_MAX - 2, trend = 0.6 + ctx.hover * 0.3;
    if (state === "loading") { out = Math.round(ctx.progress(3) * OUT_MAX); trend = 0.5; }
    if (state === "success") { out = OUT_MAX; trend = 1; }
    // A loss: less comes back than went in.
    if (state === "error") { out = IN - 1; trend = -0.7; }
    if (state === "empty") { out = 0; trend = 0; }
    const O = Math.round(m.out.to(out).value), T = m.trend.to(trend).value;
    const [ex, ey] = ENGINE, face = ey + SIZE / 2 + 0.05;

    scene.box(0, 0, 0, 176, 84, 4, "base");
    scene.line([SPEND[0] + R + 4, SPEND[1], 4.05], [ex - SIZE / 2 - 4, ey + 6, 4.05], empty ? "ghost" : "faint");
    scene.line([ex + SIZE / 2 + 4, ey - 6, 4.05], [RETURN[0] - R - 4, RETURN[1], 4.05], empty ? "ghost" : "faint");
    if (empty) {
      scene.cylinder(SPEND[0], SPEND[1], 4, R, 4, "ghost");
      scene.box(ex, ey, 4, SIZE, SIZE, HEIGHT, "ghost");
      scene.cylinder(RETURN[0], RETURN[1], 4, R, 4, "ghost");
      return;
    }

    coins(scene, SPEND[0], SPEND[1], 4, IN, "muted", "base", R);

    // The campaign: a block with a slot on top and its trend drawn on the face.
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
    const X = ex + shake;
    scene.box(X, ey, 4, SIZE, SIZE, HEIGHT, tone);
    scene.rect(X - 10, ey - 2.5, X + 10, ey + 2.5, 4 + HEIGHT + 0.05, "muted");
    const at = (u: number, v: number): Vec3 => [X + u, face, 4 + HEIGHT / 2 + v];
    scene.polyline([at(-15, 13), at(-15, -13), at(15, -13)], "muted");
    const chart = state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    scene.polyline([-12, -4, 4, 13].map((u, i) => at(u, -1 + T * [-11, -4, 3, 13][i]!)), chart, { bold: true });

    if (state === "loading") {
      const f = smoothstep(ctx.loop(1.1));
      scene.cylinder(lerp(SPEND[0], X, f), lerp(SPEND[1], ey, f), 4 + IN * 5 + 26 * Math.sin(Math.PI * f) + (HEIGHT - IN * 5) * f, 9, 3, "hi", 1 - f * f);
    }

    const stack = Math.max(1, O);
    coins(scene, RETURN[0], RETURN[1], 4, stack, "base", state === "loading" ? "hi" : state === "idle" ? "base" : ctx.verdict(), R);
  },
});
