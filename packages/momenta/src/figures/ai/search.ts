import { clamp } from "../../engine/math";
import { defineFigure } from "../../core/define";

const ROWS = 4;
const rowY = (r: number) => -36 + r * 24;
const WORDS = [50, 36, 44, 28];
const LENS_Z = 40;

/** A lens over a list of results. Use for search, filters and "no results". */
export const search = defineFigure({
  name: "Search",
  label: "A lens moving over a list of results",
  offset: -6,
  setup: ({ spring }) => ({
    x: spring(24, 90, 19), y: spring(-10, 90, 19), rows: Array.from({ length: ROWS }, () => spring(0)),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(LENS_Z);
    let x = 24, y = -10;
    if (state === "idle" && ctx.pointer.over > 0.05) { x = clamp(g.x, -50, 50); y = clamp(g.y, -50, 50); }
    if (state === "loading") { x = 40 * Math.sin(ctx.time * 2.1); y = 30 * Math.sin(ctx.time * 1.3); }
    if (state === "success") { x = 6; y = -14; }
    if (state === "error") { x = 0; y = 0; }
    if (state === "empty") { x = 30; y = -6; }
    const X = m.x.to(x).value + shake, Y = m.y.to(y).value;

    scene.box(0, 0, 0, 128, 112, 4, "base");
    m.rows.forEach((row, r) => {
      const ry = rowY(r), near = Math.abs(Y - ry) < 12;
      let lift = 0;
      if (state === "idle" && near) lift = 7;
      if (state === "success" && r === 1) lift = 10;
      if (state === "loading" && Math.floor(ctx.time * 4) % ROWS === r) lift = 3;
      const L = row.to(lift).value;
      if (state === "empty" || state === "error") { scene.box(0, ry, 4, 104, 18, 3, "ghost"); return; }
      const tone = state === "success" && r === 1 ? "ok" : lift > 0 ? "hi" : "base";
      const top = 7.05 + L;
      scene.box(0, ry, 4 + L, 104, 18, 3, tone);
      scene.line([-44, ry, top], [-44 + WORDS[r]!, ry, top], "muted");
      scene.rect(30, ry - 4, 42, ry + 4, top, "faint");
    });

    const tone = state === "loading" ? "hi" : state === "idle" || state === "empty" ? "base" : ctx.verdict();
    scene.disc(X, Y, LENS_Z, 22, tone, { plate: true, opacity: 0.92 });
    scene.disc(X, Y, LENS_Z, 18, "faint");
    scene.line([X + 22, Y, LENS_Z], [X + 44, Y, LENS_Z], tone, { bold: true });
    if (state === "error") scene.cross(X, Y, LENS_Z, "err", ctx.fade());
  },
});
