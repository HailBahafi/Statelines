import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { badge, frontArc, person } from "../shapes";

const BRAND: [number, number] = [-58, 4];
const CREATOR: [number, number] = [58, -4];
/** The meter: a console standing between them, its dial on the face toward the viewer. */
const METER = { w: 48, d: 14, h: 42 };
const FACE = METER.d / 2 + 0.05;
const DIAL_Z = 4 + 14;
const R = 18;
const onDial = (a: number, r: number): Vec3 => [r * Math.cos(a), FACE, DIAL_Z + r * Math.sin(a)];

/** A brand and a creator with a match score between them. Use for creator matching and fit scores. */
export const match = defineFigure({
  name: "Match",
  label: "A match gauge between a brand and a creator",
  offset: 4,
  setup: ({ spring }) => ({ score: spring(0.62, 90, 14), pull: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let score = 0.62;
    if (state === "idle" && ctx.pointer.over > 0.2) score = clamp(0.5 + ctx.pointer.x / 160);
    if (state === "loading") { score = 0.5 + 0.42 * Math.sin(ctx.time * 2.6); m.score.set(score); }
    if (state === "success") score = 0.94;
    if (state === "error") score = 0.1;
    if (state === "empty") score = 0;
    // On a match the two step in toward the meter; on a miss they step apart.
    const S = m.score.to(score).value, P = m.pull.to(state === "success" ? 8 : state === "error" ? -6 : 0).value;
    const empty = state === "empty";
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict("base");
    const [bx, by] = BRAND, [cx, cy] = CREATOR;

    scene.box(0, 0, 0, 176, 72, 4, "base");
    const link: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "faint";
    scene.line([bx + 16 + P, by, 4.05], [-METER.w / 2 - 3, 0, 4.05], link, { bold: state === "success" });
    scene.line([METER.w / 2 + 3, 0, 4.05], [cx - 15 - P, cy, 4.05], link, { bold: state === "success" });

    // The brand: a block with its mark on the face.
    const brand: Tone = empty ? "ghost" : "base";
    const bX = bx + P;
    scene.box(bX, by, 4, 28, 28, 28, brand);
    if (!empty) scene.polyline([[bX - 6, by + 14.05, 18], [bX, by + 14.05, 24], [bX + 6, by + 14.05, 18], [bX, by + 14.05, 12]], "muted", { closed: true });

    // The meter, with a dial that reads the score.
    scene.box(0, 0, 4, METER.w, METER.d, METER.h, empty ? "ghost" : "base");
    if (!empty) {
      scene.polyline(frontArc(0, FACE, DIAL_Z, R, Math.PI, 0, 24), "faint", { bold: true });
      for (const a of [Math.PI, Math.PI / 2, 0]) scene.line(onDial(a, R + 2), onDial(a, R + 5), "muted");
      if (S > 0.01) scene.polyline(frontArc(0, FACE, DIAL_Z, R, Math.PI, Math.PI * (1 - S), 24), tone, { bold: true });
      const a = Math.PI * (1 - S);
      scene.line(onDial(a, 0), onDial(a, R - 3), tone, { bold: true });
      scene.polyline(frontArc(0, FACE, DIAL_Z, 2, 0, Math.PI * 2, 10), tone);
    }

    // The creator on a small stand.
    const cX = cx - P + (state === "error" ? shake : 0);
    scene.cylinder(cX, cy, 4, 14, 4, empty ? "ghost" : "base");
    person(scene, cX, cy, 8, empty ? "ghost" : state === "error" ? "err" : state === "success" ? "ok" : "base", undefined, 1.05);

    badge(scene, 0, 22, 4, state, ctx.fade());
  },
});
