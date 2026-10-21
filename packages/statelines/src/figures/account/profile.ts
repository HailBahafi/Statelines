import { defineFigure } from "../../core/define";
import { TAU, clamp } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge, person } from "../shapes";

const AVATAR = [-12, -26] as const;
const CARD = { w: 96, d: 120 };
const TOP = 4 + 3;

/** A profile card with an avatar. Use for onboarding, account setup and profile photos. */
export const profile = defineFigure({
  name: "Profile",
  label: "A profile card with an avatar",
  offset: 10,
  setup: ({ spring }) => ({ lift: spring(0), slide: spring(0, 120, 14), ring: spring(0, 90, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const L = m.lift.to(state === "idle" ? ctx.hover * 8 : state === "success" ? 4 : 0).value;
    // On error the photo slides off its pad toward the card's edge.
    const S = clamp(m.slide.to(state === "error" ? 1 : 0).value, 0, 1.2);
    const R = m.ring.to(state === "success" ? 1 : state === "error" ? 0.62 : 0).value;
    const [ax, ay] = AVATAR;

    scene.box(0, 0, 0, CARD.w + 20, CARD.d + 20, 4, "base");
    scene.box(0, 0, 4, CARD.w, CARD.d, 3, "base");
    // The header band across the card's top edge.
    scene.line([-CARD.w / 2 + 6, -CARD.d / 2 + 10, TOP + 0.05], [CARD.w / 2 - 6, -CARD.d / 2 + 10, TOP + 0.05], "faint");

    // The avatar pad and the ring that fills as the photo uploads.
    scene.cylinder(ax, ay, TOP, 22, 2, empty ? "ghost" : "base");
    const rz = TOP + 0.05;
    if (!empty) scene.disc(ax, ay, rz, 28, "faint");
    if (state === "loading") {
      const t = ctx.time * 4;
      scene.arc(ax, ay, rz, 28, t, t + 1.9, "hi", { bold: true });
    }
    if (R > 0.01 && (state === "success" || state === "error")) {
      scene.arc(ax, ay, rz, 28, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(R), ctx.verdict(), { bold: true });
    }

    // The fields: a bold name and two detail lines, each with a short label.
    const line: Tone = empty ? "ghost" : "muted";
    const fx = -CARD.w / 2 + 12;
    for (const [i, len] of [[0, 54], [1, 40], [2, 48]] as const) {
      const y = 16 + i * 13;
      if (state === "loading" && i === 2) {
        const p = ctx.loop(1.4);
        scene.line([fx, y, TOP + 0.05], [fx + len * p, y, TOP + 0.05], "hi", { bold: true });
        continue;
      }
      scene.line([fx, y, TOP + 0.05], [fx + len, y, TOP + 0.05], i === 0 && !empty ? "base" : line, { bold: i === 0 });
    }

    const who: Tone = empty ? "ghost" : state === "loading" ? "muted" : ctx.verdict();
    const px = ax + S * 26 + shake, py = ay + S * 26;
    person(scene, px, py, TOP + 2 * (1 - clamp(S)) + L, who, undefined, 1.2);

    badge(scene, 34, -44, TOP, state, ctx.fade(), 12);
  },
});
