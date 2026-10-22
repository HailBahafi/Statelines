import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";

const MAX = 7;
/** The laptop: the deck lies in front, the lid stands behind it with its face at y = FACE. */
const DECK = { y: 14, w: 120, d: 52, h: 5 };
const LID = { y: -10, d: 4, a: 60, b: 37, z: 46 };
const FACE = LID.y + LID.d / 2;
/** The dashboard: posts along the bottom of the screen, a view bar standing over each. */
const SPAN = 100;
const TILE_Z = 17;
const BAR_Z = 34;
const views = (i: number) => 9 + ((i * 37) % 5) * 4.5 + i * 1.2;

/** A rectangle with rounded corners on the plane y, centred on (cx, cz), half sizes a and b. */
function rounded(cx: number, y: number, cz: number, a: number, b: number, r: number, steps = 3): Vec3[] {
  const out: Vec3[] = [];
  const corners: [number, number, number][] = [
    [cx + a - r, cz + b - r, Math.PI / 2], [cx + a - r, cz - b + r, 0],
    [cx - a + r, cz - b + r, -Math.PI / 2], [cx - a + r, cz + b - r, Math.PI],
  ];
  for (const [x, z, a0] of corners) for (let i = 0; i <= steps; i++) {
    const t = a0 - (Math.PI / 2) * (i / steps);
    out.push([x + r * Math.cos(t), y, z + r * Math.sin(t)]);
  }
  return out;
}

/** An open laptop: keyboard and trackpad on the deck, the lid standing up behind. */
function laptop(scene: Scene, tone: Tone): void {
  const { y, w, d, h } = DECK, top = 4 + h;
  scene.box(0, y, 4, w, d, h, tone);
  scene.box(0, LID.y, top, w, LID.d, LID.b * 2, tone);
  if (tone === "ghost") return;
  scene.polyline(rounded(0, FACE + 0.05, LID.z, LID.a - 4, LID.b - 4, 2), "faint", { closed: true });
  const ky0 = y - d / 2 + 6, ky1 = ky0 + 22;
  scene.rect(-50, ky0, 50, ky1, top + 0.05, "faint");
  for (let k = 1; k < 4; k++) scene.line([-50, ky0 + k * 5.5, top + 0.05], [50, ky0 + k * 5.5, top + 0.05], "faint");
  scene.rect(-15, ky1 + 5, 15, ky1 + 17, top + 0.05, "faint");
}

/** An eye on the screen: an almond with a pupil. */
function eye(scene: Scene, u: number, z: number, tone: Tone): void {
  const pts: Vec3[] = [];
  for (let i = 0; i <= 8; i++) { const t = -1 + i / 4; pts.push([u + 8 * t, FACE + 0.05, z + 4.5 * (1 - t * t)]); }
  for (let i = 7; i > 0; i--) { const t = -1 + i / 4; pts.push([u + 8 * t, FACE + 0.05, z - 4.5 * (1 - t * t)]); }
  scene.polyline(pts, tone, { closed: true });
  const pupil: Vec3[] = Array.from({ length: 11 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [u + 2.4 * Math.cos(a), FACE + 0.05, z + 2.4 * Math.sin(a)];
  });
  scene.panel(pupil, tone);
}

/** A dashboard on a laptop: published posts with their view bars rising as a tracker passes. Use for campaign tracking and post monitoring. `count`: posts, 3–7. */
export const tracking = defineFigure({
  name: "Tracking",
  label: "View bars rising over posts on a laptop dashboard",
  offset: 16,
  setup: ({ spring }) => ({ cursor: spring(1, 90, 16), bars: Array.from({ length: MAX }, (_, i) => spring(views(i), 140, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const n = ctx.count(5, MAX, 3), pitch = SPAN / n, tile = Math.min(13, pitch - 3), bar = Math.min(8, pitch - 5);
    const postU = (i: number) => -SPAN / 2 + pitch * (i + 0.5);
    let cursor = 1;
    if (state === "loading") { cursor = ctx.progress(n * 0.45); if (!ctx.determinate) m.cursor.set(cursor); }
    // The tracker stalls on the third post.
    if (state === "error") cursor = 2.5 / n;
    if (state === "empty") cursor = 0;
    const C = m.cursor.to(cursor).value, cu = -SPAN / 2 + SPAN * C;
    const stuck = state === "error" ? 2 : -1;

    scene.box(0, 6, 0, 150, 86, 4, "base");
    laptop(scene, empty ? "ghost" : "base");

    // The dashboard's header: an eye for views and a title.
    if (!empty) {
      eye(scene, -44, 72, state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "muted" : "base");
      scene.line([-32, FACE + 0.05, 72], [-8, FACE + 0.05, 72], "muted", { bold: true });
      scene.line([-50, FACE + 0.05, BAR_Z - 1.5], [50, FACE + 0.05, BAR_Z - 1.5], "faint");
    }

    for (let i = 0; i < n; i++) {
      const u = postU(i), passed = u < cu && i !== stuck;
      if (empty) { scene.box(u, FACE + 1, TILE_Z, tile, 2, tile, "ghost"); continue; }
      let h = passed ? views(i) : 0;
      if (state === "success") h = views(i) + 3;
      if (state === "idle") h += 4 * ctx.hover;
      const H = m.bars[i]!.to(h).value;
      const tone: Tone = i === stuck ? "err"
        : state === "loading" && Math.abs(u - cu) < pitch * 0.6 ? "hi"
        : state === "success" ? "ok" : "base";
      if (H > 0.6) scene.box(u, FACE + 1.5, BAR_Z, bar, 3, H, passed || state === "success" ? tone : "faint");
      // The post: a thumbnail with a little picture on it.
      const x = u + (i === stuck ? shake : 0), f = FACE + 2.05, k = tile / 13;
      scene.box(x, FACE + 1, TILE_Z, tile, 2, tile, tone);
      scene.polyline([[x - 5 * k, f, TILE_Z + 2 * k], [x - 1.5 * k, f, TILE_Z + 7 * k], [x + 1 * k, f, TILE_Z + 4.5 * k], [x + 3.5 * k, f, TILE_Z + 8.5 * k], [x + 5 * k, f, TILE_Z + 6 * k]], tone === "base" ? "muted" : tone);
    }
    // The stalled post's bar lies broken at its foot.
    if (stuck >= 0 && !empty && stuck < n) scene.box(clamp(postU(stuck), -SPAN / 2, SPAN / 2) + shake, FACE + 1.5, BAR_Z, bar, 3, 2, "err");
  },
});
