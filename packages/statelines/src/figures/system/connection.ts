import { defineFigure } from "../../core/define";

const HEIGHTS = [14, 26, 38, 50];
const barX = (i: number) => -33 + i * 22;

/** Signal bars. Use for connectivity, offline, reconnecting and network status. */
export const connection = defineFigure({
  name: "Connection",
  label: "Signal bars",
  offset: 14,
  setup: ({ spring }) => ({ bars: HEIGHTS.map(h => spring(h, 160, 18)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const lit = state === "loading" ? Math.floor(ctx.time * 4) % (HEIGHTS.length + 1) : HEIGHTS.length;

    scene.box(0, 0, 0, 110, 44, 4, "base");
    m.bars.forEach((bar, i) => {
      let h = state === "error" ? 4 : HEIGHTS[i]!;
      if (state === "idle") h += 8 * ctx.hover * Math.exp(-((g.x - barX(i)) ** 2) / 200);
      const H = bar.to(h).value;
      const tone = state === "empty" ? "ghost"
        : state === "loading" ? (i < lit ? "hi" : "muted")
        : state === "error" ? "muted" : ctx.verdict();
      scene.box(barX(i) + (state === "error" ? shake : 0), 0, 4, 13, 13, Math.max(0.5, H), tone);
    });

    if (state === "success") scene.check(barX(3), 0, 4 + HEIGHTS[3]!, "ok", ctx.fade());
    if (state === "error") scene.cross(shake, 0, 30, "err", ctx.fade());
  },
});
