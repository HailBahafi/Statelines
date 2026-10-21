import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";
import { faceArc, facing, person } from "../shapes";

const BRAND: [number, number] = [-52, 14];
const CREATOR: [number, number] = [52, -14];
const GAUGE: Vec3 = [0, 0, 30];
const R = 30;
/** Needle angle for a score in 0…1: 0 points left, 1 points right. */
const needle = (score: number): Vec3 => {
  const a = Math.PI * (1 - score);
  return facing(GAUGE[0], GAUGE[1], GAUGE[2], R * 0.82 * Math.cos(a), R * 0.82 * Math.sin(a));
};

/** A brand and a creator with a match score between them. Use for creator matching and fit scores. */
export const match = defineFigure({
  name: "Match",
  label: "A match gauge between a brand and a creator",
  offset: 10,
  setup: ({ spring }) => ({ score: spring(0.62, 90, 14), pull: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let score = 0.62;
    if (state === "idle" && ctx.pointer.over > 0.2) score = clamp(0.5 + ctx.pointer.x / 160);
    if (state === "loading") { score = 0.5 + 0.45 * Math.sin(ctx.time * 2.6); m.score.set(score); }
    if (state === "success") score = 0.92;
    if (state === "error") score = 0.12;
    if (state === "empty") score = 0;
    const S = m.score.to(score).value, P = m.pull.to(state === "success" ? 10 : 0).value;
    const [bx, by] = BRAND, [cx, cy] = CREATOR;

    scene.box(0, 0, 0, 150, 70, 4, "base");
    scene.box(bx + P, by - P * 0.3, 4, 30, 30, 30, state === "empty" ? "muted" : "base");
    scene.rect(bx + P - 7, by - P * 0.3 - 7, bx + P + 7, by - P * 0.3 + 7, 34.05, "muted");

    const link = state === "success" ? "ok" : state === "error" ? "err" : "ghost";
    scene.line([bx + 15 + P, by, 12], [cx - 12 - P, cy, 12], link, { bold: state === "success" });

    const [gx, gy, gz] = GAUGE;
    scene.polyline(faceArc(gx, gy, gz, R, Math.PI, 0, 24), "faint", { bold: true });
    if (S > 0.01 && state !== "empty") {
      const tone = state === "loading" ? "hi" : ctx.verdict("hi");
      scene.polyline(faceArc(gx, gy, gz, R, Math.PI, Math.PI * (1 - S), 24), tone, { bold: true });
      const [nx, ny, nz] = needle(S);
      scene.line([gx + shake, gy, gz], [nx + shake, ny, nz], tone, { bold: true });
    }
    scene.cylinder(gx, gy, 0, 5, gz - 3, "muted");

    scene.cylinder(cx - P, cy + P * 0.3, 4, 16, 6, state === "empty" ? "ghost" : "base");
    person(scene, cx - P + (state === "error" ? shake : 0), cy + P * 0.3, 10, state === "empty" ? "ghost" : ctx.verdict(), undefined, 1.1);

    if (state === "success") scene.check(gx, gy + 18, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(gx, gy + 18, 4, "err", ctx.fade());
  },
});
