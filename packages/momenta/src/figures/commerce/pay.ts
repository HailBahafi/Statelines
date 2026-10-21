import { defineFigure } from "../../core/define";

/** A card taps a terminal. Use for checkout, payments and subscriptions. */
export const pay = defineFigure({
  name: "Pay",
  label: "A card tapping a payment terminal",
  setup: ({ spring }) => ({ z: spring(54), x: spring(0), y: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(18);
    let z = 54 - ctx.hover * 14, x = lean.x, y = lean.y;
    if (state === "loading") { z = 30; x = y = 0; }
    if (state === "success") { z = 60; x = y = 0; }
    if (state === "error") { z = 36; x = y = 0; }
    const Z = m.z.to(z).value, X = m.x.to(x).value + shake, Y = m.y.to(y).value;
    const terminal = ctx.verdict();

    scene.box(0, 8, 0, 72, 96, 16, terminal);
    scene.rect(-26, -34, 26, -6, 16, terminal === "base" ? "muted" : terminal);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) scene.disc(-16 + c * 16, 8 + r * 12, 16, 2.6, "muted");

    if (state === "loading") {
      const t = ctx.time, active = Math.floor(t * 4) % 3;
      for (let k = 0; k < 3; k++) scene.disc(-12 + k * 12, -20, 16, 2.6, k === active ? "hi" : "muted", { fill: true });
      for (let k = 0; k < 3; k++) {
        const q = (ctx.loop(1 / 0.9) + k / 3) % 1;
        scene.disc(X, Y, Z, 22 + 46 * q, "base", { opacity: 1 - q });
      }
    }
    if (state === "success") scene.check(0, -20, 16, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -20, 16, "err", ctx.fade());

    if (state === "empty") {
      scene.box(X, Y, Z, 78, 50, 2, "ghost");
      return;
    }
    scene.box(X, Y, Z, 78, 50, 2, state === "error" ? "err" : state === "loading" ? "hi" : "base");
    scene.rect(X - 30, Y - 14, X - 18, Y - 4, Z + 2, "base");
    scene.line([X - 30, Y + 12, Z + 2], [X + 12, Y + 12, Z + 2], "muted");
  },
});
