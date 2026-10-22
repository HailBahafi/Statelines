import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { person } from "../shapes";

const PIVOT: Vec3 = [-46, 0, 34];
const LENGTH = 96;
const THICK = 3.5;
const LANE_X = 2;

/** A barrier arm at a gate. Use for permissions, access denied, paywalls and approvals. */
export const denied = /*#__PURE__*/ defineFigure({
  name: "Denied",
  label: "A barrier arm at a gate",
  offset: 12,
  setup: ({ spring }) => ({ angle: spring(0, 120, 16), walk: spring(32, 70, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let target = state === "success" ? 1.08 : state === "idle" ? 0.3 * clamp(ctx.hover) : 0;
    // Loading: the arm twitches on its pivot while the light blinks.
    if (state === "loading") { target = 0.06 + 0.05 * Math.sin(ctx.time * 7); m.angle.set(target); }
    const a = clamp(m.angle.to(target).value, -0.1, 1.2) + Math.abs(shake) * 0.012;
    // The visitor waits in front, walks through on success and is turned back on error.
    const W = m.walk.to(state === "success" ? -26 : state === "error" ? 40 : 32).value;
    const arm: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    const post: Tone = empty ? "muted" : "base";

    scene.box(0, 2, 0, 150, 92, 4, "base");
    // Lane markings on the plate either side of the arm.
    if (!empty) for (const y of [-30, 30]) scene.line([LANE_X - 18, y, 4.05], [LANE_X + 18, y, 4.05], "faint", { bold: true });

    const visitor = (): void => {
      if (empty) return;
      const tone: Tone = state === "error" ? "err" : state === "success" ? "ok" : "base";
      person(scene, LANE_X + (state === "error" ? shake : 0), W, 4, tone, undefined, 1.3);
    };
    if (W < 0) visitor();

    // The booth that holds the arm, its light on top, and the rest post across the lane.
    scene.box(-54, 0, 4, 16, 16, 38, post);
    const light: Tone = state === "loading" ? (Math.floor(ctx.time * 3) % 2 ? "hi" : "muted") : empty ? "ghost" : ctx.verdict("muted");
    scene.cylinder(-54, 0, 42, 5, 5, light);
    scene.box(54, 0, 4, 7, 7, 28, post);
    scene.box(54, 0, 32, 9, 9, 2, post);

    const dir = [Math.cos(a), 0, Math.sin(a)] as const, n = [-Math.sin(a), 0, Math.cos(a)] as const;
    const at = (d: number, s: number): Vec3 => [PIVOT[0] + dir[0] * d + n[0] * s, 0, PIVOT[2] + dir[2] * d + n[2] * s];
    scene.panel([at(0, THICK), at(LENGTH, THICK), at(LENGTH, -THICK), at(0, -THICK)], arm);
    if (!empty) {
      const stripe: Tone = arm === "base" ? "muted" : arm;
      for (let i = 1; i <= 4; i++) scene.line(at(i * 19 - 3, -THICK), at(i * 19 + 3, THICK), stripe, { bold: true });
    }

    if (W >= 0) visitor();
    if (empty) person(scene, LANE_X, 32, 4, "ghost", undefined, 1.3);

  },
});
