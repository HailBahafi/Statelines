import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";

const PIVOT: Vec3 = [-45, 0, 38];
const LENGTH = 100;
const THICK = 3.5;

/** A barrier arm at a gate. Use for permissions, access denied, paywalls and approvals. */
export const denied = defineFigure({
  name: "Denied",
  label: "A barrier arm at a gate",
  offset: 6,
  setup: ({ spring }) => ({ angle: spring(0, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const target = state === "success" ? 1.3 : state === "idle" ? 0.5 * clamp(ctx.hover) : 0;
    const a = m.angle.to(target).value + Math.abs(shake) * 0.015;
    const arm = state === "empty" ? "ghost" : ctx.verdict();

    scene.box(0, 0, 0, 140, 56, 4, "base");
    scene.box(58, 0, 4, 6, 6, 32, state === "empty" ? "muted" : "base");
    scene.box(-52, 0, 4, 14, 14, 40, state === "empty" ? "muted" : "base");
    const light = state === "loading" ? (Math.floor(ctx.time * 3) % 2 ? "hi" : "muted") : state === "empty" ? "ghost" : ctx.verdict("muted");
    scene.cylinder(-52, 0, 44, 5, 5, light);

    const dir = [Math.cos(a), 0, Math.sin(a)] as const, n = [-Math.sin(a), 0, Math.cos(a)] as const;
    const at = (d: number, s: number): Vec3 => [PIVOT[0] + dir[0] * d + n[0] * s, 0, PIVOT[2] + dir[2] * d + n[2] * s];
    scene.panel([at(0, THICK), at(LENGTH, THICK), at(LENGTH, -THICK), at(0, -THICK)], arm);
    if (state !== "empty") {
      for (let i = 1; i <= 4; i++) scene.line(at(i * 20 - 3, -THICK), at(i * 20 + 3, THICK), state === "error" ? "err" : "muted", { bold: true });
    }

    if (state === "success") scene.check(18, 18, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(18, 18, 4, "err", ctx.fade());
  },
});
