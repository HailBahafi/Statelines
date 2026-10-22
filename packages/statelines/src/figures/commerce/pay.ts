import { defineFigure } from "../../core/define";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { frontArc } from "../shapes";

/** The terminal stands in its dock; its face looks to the lower left at y = FACE. */
const TX = -14;
const TY = -6;
const BODY = { w: 50, d: 14, z0: 14, z1: 92 };
const FACE = TY + BODY.d / 2;
const SCREEN = { u: 19, z0: 60, z1: 86 };
const WAVES = { u: -7, z: 73 };
/** Where the card rests: on the plate to the right, held up to the screen, or thrown out in front. */
const REST: Vec3 = [42, 26, 5];
const TAP: Vec3 = [TX + 22, FACE + 16, 70];
const OUT: Vec3 = [-34, 38, 5];

/**
 * A bank card at centre c, tipped up by `a` (0 lying flat, π/2 standing with its face to the lower left)
 * and turned by `yaw` about the vertical.
 */
function card(scene: Scene, [cx, cy, cz]: Vec3, a: number, yaw: number, tone: Tone): void {
  const ca = Math.cos(a), sa = Math.sin(a), cyw = Math.cos(yaw), syw = Math.sin(yaw);
  const P = (u: number, w: number, n = 0): Vec3 => {
    const ox = u, oy = w * ca + n * sa, oz = -w * sa + n * ca;
    return [cx + ox * cyw - oy * syw, cy + ox * syw + oy * cyw, cz + oz];
  };
  const W = 25, H = 16;
  const outline = (n: number) => [P(-W, -H, n), P(W, -H, n), P(W, H, n), P(-W, H, n)];
  if (tone === "ghost") { scene.panel(outline(0), "ghost"); return; }
  scene.panel(outline(0), tone);
  scene.panel(outline(1.6), tone);
  const ink: Tone = tone === "base" ? "muted" : tone, n = 1.65;
  scene.polyline([P(-19, -9, n), P(-10, -9, n), P(-10, -2, n), P(-19, -2, n)], ink, { closed: true });
  scene.line(P(-19, 6, n), P(12, 6, n), ink, { bold: true });
  scene.line(P(-19, 11, n), P(-4, 11, n), ink);
}

/** A bank card taps a card terminal and a receipt prints. Use for checkout, payments and subscriptions. */
export const pay = defineFigure({
  name: "Pay",
  label: "A bank card tapping a card terminal",
  offset: 12,
  setup: ({ spring }) => ({
    x: spring(REST[0], 110, 16), y: spring(REST[1], 110, 16), z: spring(REST[2], 110, 16),
    a: spring(0, 110, 16), yaw: spring(0, 110, 14), paper: spring(0, 80, 18),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let [x, y, z] = REST, a = 0, yaw = 0, paper = 0;
    if (state === "idle") z += ctx.hover * 8;
    if (state === "loading") {
      [x, y, z] = TAP; a = Math.PI / 2;
      // The card dips toward the screen and back.
      y += 4 * Math.sin(ctx.time * 5);
    }
    // Approved: the card goes back down and the receipt prints. Declined: the card is thrown out.
    if (state === "success") paper = 26;
    if (state === "error") { [x, y, z] = OUT; yaw = 0.45; }
    const C: Vec3 = [m.x.to(x).value + shake, m.y.to(y).value, m.z.to(z).value];
    const A = m.a.to(a).value, Y = m.yaw.to(yaw).value, R = m.paper.to(paper).value;
    const shell: Tone = empty ? "ghost" : "base";
    const screen: Tone = state === "loading" ? "hi" : state === "idle" ? "muted" : ctx.verdict();

    scene.box(3, 15, 0, 134, 92, 4, "base");
    // The dock and the terminal standing in it.
    scene.box(TX, TY + 2, 4, 60, 34, 10, shell);
    scene.box(TX, TY, BODY.z0, BODY.w, BODY.d, BODY.z1 - BODY.z0, shell);
    if (empty) { card(scene, REST, 0, 0, "ghost"); return; }
    const on = (u: number, zz: number): Vec3 => [TX + u, FACE + 0.05, zz];

    // The paper slot on top, and the receipt feeding out of it.
    scene.rect(TX - 16, TY - 1.5, TX + 16, TY + 1.5, BODY.z1 + 0.05, "muted");
    if (R > 0.5) {
      const top = BODY.z1 + R, zig: Vec3[] = [];
      for (let k = 0; k <= 6; k++) zig.push([TX + 15 - k * 5, TY, top + (k % 2 ? 2.5 : 0)]);
      scene.panel([[TX - 15, TY, BODY.z1], [TX + 15, TY, BODY.z1], ...zig], "ok");
      for (let k = 0; k < 3; k++) {
        const lz = BODY.z1 + 6 + k * 6;
        if (lz < top - 3) scene.line([TX - 10, TY + 0.05, lz], [TX + (k === 1 ? 2 : 10), TY + 0.05, lz], "ok");
      }
    }

    // The screen with the contactless sign, and the keypad below it.
    scene.polyline([on(-SCREEN.u, SCREEN.z0), on(SCREEN.u, SCREEN.z0), on(SCREEN.u, SCREEN.z1), on(-SCREEN.u, SCREEN.z1)], screen === "muted" ? "muted" : screen, { closed: true, bold: state !== "idle" });
    const pulse = state === "loading" ? Math.floor(ctx.time * 4) % 3 : -1;
    for (let k = 0; k < 3; k++) {
      const tone: Tone = state === "loading" ? (k === pulse ? "hi" : "faint") : screen;
      scene.polyline(frontArc(TX + WAVES.u, FACE + 0.05, WAVES.z, 4 + k * 4, -0.85, 0.85, 8), tone, { bold: k === pulse });
    }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
      const key: Tone = r === 3 && c === 2 && state === "success" ? "ok" : r === 3 && c === 0 && state === "error" ? "err" : "base";
      scene.box(TX - 13 + c * 13, FACE + 1, 18 + (3 - r) * 9, 9, 2, 6, key);
    }

    card(scene, C, A, Y, state === "loading" ? "hi" : state === "error" ? "err" : "base");
  },
});
