import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";

/** The post lies on the desk; the stamp waits on its ink pad behind it. */
const POST = { x: -22, y: 10, w: 64, d: 96 };
const PAD = { x: 54, y: -36, w: 46, d: 40, h: 5 };
const Z = 6;
const REST: Vec3 = [PAD.x, PAD.y, 4 + PAD.h];
/** Where the stamp strikes: the blank corner under the caption. */
const MARK: [number, number] = [11, 32];
const HIT: Vec3 = [POST.x + MARK[0], POST.y + MARK[1], Z];
const HOVER = 40;

type Part = "whole" | "left" | "right";

/** The post as a flat sheet: a profile row, a picture and a caption. A torn half keeps its side. */
function post(scene: Scene, x: number, y: number, tone: Tone, part: Part, turn = 0) {
  const w = POST.w / 2, d = POST.d / 2;
  const tear = Array.from({ length: 10 }, (_, i): [number, number] => [i % 2 ? 3 : -3, -d + (2 * d * i) / 9]);
  const outline: [number, number][] = part === "whole" ? [[-w, -d], [w, -d], [w, d], [-w, d]]
    : part === "left" ? [[-w, -d], ...tear, [-w, d]]
    : [...tear, [w, d], [w, -d]];
  const c = Math.cos(turn), s = Math.sin(turn);
  const at = (u: number, v: number, h = Z): Vec3 => [x + u * c - v * s, y + u * s + v * c, h];
  scene.panel(outline.map(([u, v]) => at(u, v, Z - 2)), tone);
  scene.panel(outline.map(([u, v]) => at(u, v)), tone);
  if (tone === "ghost") return;
  const ink: Tone = tone === "base" ? "muted" : tone, t = Z + 0.05;
  const lo = part === "right" ? 5 : -w, hi = part === "left" ? -5 : w;
  const seg = (u0: number, u1: number, v: number) => {
    const a = Math.max(u0, lo), b = Math.min(u1, hi);
    if (b > a) scene.line(at(a, v, t), at(b, v, t), ink);
  };
  if (part === "whole") {
    // Profile row: an avatar and a name. Picture: a frame with hills inside.
    scene.polyline(Array.from({ length: 13 }, (_, i) => at(-21 + 5 * Math.cos((i / 12) * Math.PI * 2), -37 + 5 * Math.sin((i / 12) * Math.PI * 2), t)), ink);
    seg(-12, 10, -37);
    scene.polyline([[-24, 4], [-11, -14], [-2, -4], [9, -20], [24, 4]].map(([u, v]) => at(u!, v!, t)), ink);
  }
  scene.polyline([[lo === -w ? -24 : lo, -28], [hi === w ? 24 : hi, -28], [hi === w ? 24 : hi, 4], [lo === -w ? -24 : lo, 4]]
    .map(([u, v]) => at(u!, v!, t)), ink, { closed: part === "whole" });
  seg(-24, 24, 13);
  seg(-24, -6, 20);
}

/** A rubber stamp: rubber, wooden mount, neck and round knob. */
function stamp(scene: Scene, x: number, y: number, z: number, tone: Tone) {
  scene.box(x, y, z, 30, 30, 2, tone === "ghost" ? "ghost" : "muted");
  scene.box(x, y, z + 2, 36, 36, 10, tone);
  scene.cylinder(x, y, z + 12, 6, 18, tone);
  scene.cylinder(x, y, z + 30, 14, 9, tone);
}

/** A post on the desk and a rubber stamp that lands on it. Use for content approvals, reviews and publishing workflows. */
export const approval = /*#__PURE__*/ defineFigure({
  name: "Approval",
  label: "A rubber stamp landing on a post to approve it",
  offset: 2,
  setup: ({ spring }) => ({
    go: spring(0, 120, 17), press: spring(0, 220, 20), tear: spring(0, 120, 14),
    mark: spring(0, 160, 20), aside: spring(0),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const done = state === "success" || state === "error";
    // go: 0 on the pad, 1 above the post. press: 0 hovering, 1 struck.
    let go = 0, press = 0;
    if (state === "loading") {
      const q = ctx.progress(2.4);
      go = smoothstep(q / 0.45);
      press = ctx.determinate ? smoothstep((q - 0.6) / 0.4) : bump(clamp((q - 0.5) / 0.4));
      m.go.set(go); m.press.set(press);
    }
    if (done) go = 1;
    const G = clamp(m.go.to(go).value, -0.1, 1.1), P = clamp(m.press.to(press).value);
    const T = m.tear.to(state === "error" ? 1 : 0).value;
    const M = m.mark.to(state === "success" ? 1 : 0).value;
    const A = m.aside.to(done ? 1 : 0).value;

    scene.box(8, 0, 0, 156, 128, 4, "base");

    // The ink pad: a shallow tin with the inked felt inside.
    scene.box(PAD.x, PAD.y, 4, PAD.w, PAD.d, PAD.h, empty ? "ghost" : "base");
    if (!empty) scene.rect(PAD.x - 17, PAD.y - 14, PAD.x + 17, PAD.y + 14, 4 + PAD.h + 0.05, "muted");

    // The post: whole, or torn in two and pushed apart when rejected.
    const tone: Tone = empty ? "ghost" : ctx.verdict();
    if (T > 0.02) {
      post(scene, POST.x - 10 * T + shake, POST.y + 4 * T, tone, "left", -0.14 * T);
      post(scene, POST.x + 10 * T + shake, POST.y - 4 * T, tone, "right", 0.18 * T);
    } else post(scene, POST.x, POST.y, tone, "whole");

    // The stamp's mark: its square edge with a seal inside.
    if (M > 0.02) {
      const [hx, hy] = HIT, z = Z + 0.1;
      scene.rect(hx - 14, hy - 14, hx + 14, hy + 14, z, "ok", M);
      scene.disc(hx, hy, z, 8, "ok", { opacity: M });
      scene.disc(hx, hy, z, 4, "ok", { fill: true, opacity: M });
    }

    // The stamp: on the pad, carried over the post, struck, then lifted clear and set back.
    const lift = state === "idle" ? ctx.hover * 10 : 0;
    const sx = lerp(REST[0], HIT[0], G) + 16 * A, sy = lerp(REST[1], HIT[1], G) - 26 * A;
    const sz = lerp(REST[2], HIT[2], G) + G * (HOVER + 6 * A) * (1 - P) + 30 * bump(clamp(G)) + lift;
    stamp(scene, sx, sy, sz, empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict());
  },
});
