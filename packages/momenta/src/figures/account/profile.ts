import { defineFigure } from "../../core/define";
import { TAU } from "../../engine/math";
import { person } from "../shapes";

const AVATAR = [0, -24] as const;

/** A profile card with an avatar. Use for onboarding, account setup and profile photos. */
export const profile = defineFigure({
  name: "Profile",
  label: "A profile card with an avatar",
  offset: 8,
  setup: ({ spring }) => ({ lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const L = m.lift.to(state === "idle" ? ctx.hover * 8 : 0).value;
    const [ax, ay] = AVATAR;

    scene.box(0, 0, 0, 100, 124, 4, "base");
    const top = 4.05;
    scene.disc(ax, ay, top, 26, state === "empty" ? "ghost" : "muted");

    if (state === "loading") {
      const a = ctx.time * 4;
      scene.arc(ax, ay, top, 30, a, a + 1.8, "hi", { bold: true });
    }
    if (state === "success" || state === "error") {
      scene.arc(ax, ay, top, 30, 0, TAU * ctx.fade(0.5), ctx.verdict(), { bold: true });
    }

    const who = state === "empty" ? "ghost" : state === "loading" ? "muted" : ctx.verdict();
    person(scene, ax + shake, ay, 4 + L, who, undefined, 1.25);

    const line = state === "empty" ? "ghost" : "muted";
    scene.line([-30, 18, top], [26, 18, top], state === "empty" ? "ghost" : "base", { bold: true });
    scene.line([-30, 30, top], [10, 30, top], line);
    scene.line([-30, 42, top], [18, 42, top], line);

    if (state === "success") scene.check(24, -2, top, "ok", ctx.fade());
    if (state === "error") scene.cross(24 + shake, -2, top, "err", ctx.fade());
  },
});
