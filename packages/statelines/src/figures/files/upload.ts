import { defineFigure } from "../../core/define";
import { clamp, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { facing } from "../shapes";

/** The laptop: deck in front, lid standing behind it with its face at y = FACE. */
const LX = -30;
const LY = 26;
const LID = { a: 36, z0: 8, z1: 58 };
const FACE = LY - 22 + 4;
/** The cloud, high to the right, and the file's place on the screen and under the cloud. */
const CLOUD_AT: Vec3 = [24, -40, 98];
const START: Vec3 = [LX, FACE + 3, 38];
const END: Vec3 = [CLOUD_AT[0], CLOUD_AT[1] + 2, CLOUD_AT[2] - 13];
const SCALE = 1.45;

/** Puffs of the cloud as (u, v, r) on the viewer-facing plane, cut flat along the bottom. */
const PUFFS: [number, number, number][] = [[-19, -1, 11], [-5, 8, 15], [12, 5, 12], [23, -2, 9]];
const BOTTOM = -10;
const CLOUD: [number, number][] = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
  let t = 0;
  for (const [cx, cy, r] of PUFFS) {
    const ox = cx - 3, oy = cy, p = ox * dx + oy * dy, q = ox * ox + oy * oy - p * p;
    if (q <= r * r) t = Math.max(t, p + Math.sqrt(r * r - q));
  }
  if (dy < 0) t = Math.min(t, BOTTOM / dy);
  return [3 + dx * t, dy * t];
});

/** A puffy cloud facing the viewer, with a little depth behind it. */
function cloud(scene: Scene, [x, y, z]: Vec3, tone: Tone): void {
  const at = (d: number) => CLOUD.map(([u, v]) => facing(x - d, y - d, z, u * SCALE, v * SCALE));
  if (tone !== "ghost") scene.panel(at(3), tone);
  scene.panel(at(0), tone);
}

/** A file standing upright on the plane y: a sheet with a folded corner and lines of text, turned by `rot`. */
function file(scene: Scene, x: number, y: number, z: number, rot: number, tone: Tone): void {
  const c = Math.cos(rot), s = Math.sin(rot);
  const P = (u: number, v: number, dy = 0): Vec3 => [x + u * c - v * s, y + dy, z + u * s + v * c];
  const w = 12, h = 15, f = 7;
  const outline = (dy: number) => [P(-w, -h, dy), P(w, -h, dy), P(w, h - f, dy), P(w - f, h, dy), P(-w, h, dy)];
  scene.panel(outline(-1.5), tone);
  scene.panel(outline(0), tone);
  const ink: Tone = tone === "base" ? "muted" : tone;
  scene.polyline([P(w - f, h, 0.05), P(w - f, h - f, 0.05), P(w, h - f, 0.05)], ink);
  for (let k = 0; k < 3; k++) scene.line(P(-7, 4 - k * 5.5, 0.05), P(k === 2 ? 0 : 7, 4 - k * 5.5, 0.05), ink);
}

/** A file rises from a laptop into the cloud while the bar fills. Use for file, image and attachment uploads. */
export const upload = defineFigure({
  name: "Upload",
  label: "A file rising from a laptop into a cloud",
  offset: 14,
  setup: ({ spring }) => ({
    p: spring(0, 120, 20), progress: spring(0, 120, 20), rot: spring(0, 120, 12), lift: spring(0),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let p = 0, progress = 0, rot = 0;
    if (state === "loading") {
      const q = ctx.progress(2.4);
      if (ctx.determinate) { p = q; progress = q; }
      else {
        p = progress = smoothstep(q / 0.85);
        m.p.set(p); m.progress.set(progress);
      }
    } else if (state === "success") {
      p = progress = 1;
    } else if (state === "error") {
      // Stuck halfway: the file tips over in mid-air and the bar stops.
      p = 0.5; progress = 0.55; rot = 0.55;
    }
    const P = m.p.to(p).value, B = m.progress.to(progress).value, R = m.rot.to(rot).value;
    const L = m.lift.to(state === "idle" ? ctx.hover * 7 : 0).value;
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();

    scene.box(-14, 4, 0, 118, 104, 4, "base");
    // The laptop: deck with keyboard and trackpad, the lid standing behind.
    const shell: Tone = empty ? "ghost" : "base";
    scene.box(LX, LY, 4, LID.a * 2, 44, 4, shell);
    scene.box(LX, FACE - 2, LID.z0, LID.a * 2, 4, LID.z1 - LID.z0, shell);
    const on = (u: number, z: number): Vec3 => [LX + u, FACE + 0.05, z];
    if (!empty) {
      scene.polyline([on(-32, 12), on(32, 12), on(32, 54), on(-32, 54)], "faint", { closed: true });
      scene.rect(LX - 30, LY - 16, LX + 30, LY + 2, 8.05, "faint");
      for (let k = 1; k < 3; k++) scene.line([LX - 30, LY - 16 + k * 6, 8.05], [LX + 30, LY - 16 + k * 6, 8.05], "faint");
      scene.rect(LX - 10, LY + 7, LX + 10, LY + 17, 8.05, "faint");
      // The progress bar on the screen.
      scene.line(on(-22, 20), on(22, 20), "faint", { bold: true });
      if (B > 0.01) scene.line(on(-22, 20), on(-22 + 44 * clamp(B), 20), state === "loading" ? "hi" : ctx.verdict("hi"), { bold: true });
    }

    if (!empty) {
      const t = smoothstep(P);
      const x = lerp(START[0], END[0], t) + shake, y = lerp(START[1], END[1], t);
      const z = lerp(START[2], END[2], t) + 14 * Math.sin(Math.PI * P) + L;
      file(scene, x, y, z, R, tone);
    }
    cloud(scene, CLOUD_AT, empty ? "ghost" : state === "success" ? "ok" : "base");
  },
});
