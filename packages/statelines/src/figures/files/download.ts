import { defineFigure } from "../../core/define";
import { clamp, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { facing } from "../shapes";

/** The cloud, high to the left, and the folder standing open on the plate to the right. */
const CLOUD_AT: Vec3 = [-50, 2, 78];
const FX = 32;
const FY = 0;
const BACK = { y: FY - 4, h: 52 };
const FRONT = { y: FY + 4, h: 41 };
const START: Vec3 = [CLOUD_AT[0], CLOUD_AT[1] - 1, CLOUD_AT[2] - 14];
const END: Vec3 = [FX + 4, FY - 1, 4 + 32];
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

/** A file drops out of the cloud into a folder while the bar fills. Use for downloads and exports. */
export const download = /*#__PURE__*/ defineFigure({
  name: "Download",
  label: "A file dropping from a cloud into a folder",
  offset: 12,
  setup: ({ spring }) => ({ p: spring(0, 110, 20), bar: spring(0, 110, 20), rot: spring(0, 120, 12), peek: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let p = 0, bar = 0, rot = 0;
    if (state === "loading") {
      const q = ctx.progress(2.2);
      if (ctx.determinate) p = bar = q;
      else { p = bar = smoothstep(q / 0.85); m.p.set(p); m.bar.set(bar); }
    } else if (state === "success") {
      p = bar = 1;
    } else if (state === "error") {
      // Interrupted mid-flight: the file tips over and the bar stops.
      p = bar = 0.5; rot = -0.6;
    }
    const P = m.p.to(p).value, B = m.bar.to(bar).value, R = m.rot.to(rot).value;
    const peek = m.peek.to(state === "idle" ? ctx.hover * 6 : 0).value;
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict();
    const folder: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";

    scene.box(-4, 4, 0, 140, 76, 4, "base");
    // The folder's back with its tab.
    scene.box(FX, BACK.y, 4, 72, 2, BACK.h, folder);
    scene.box(FX - 22, BACK.y, 4 + BACK.h, 24, 2, 6, folder);

    if (!empty) {
      const t = smoothstep(P);
      const x = lerp(START[0], END[0], t) + shake, y = lerp(START[1], END[1], t);
      const z = lerp(START[2], END[2], t) + 10 * Math.sin(Math.PI * P) - peek;
      file(scene, x, y, z, R, tone);
    }

    // The folder's front, a down arrow on it and the progress bar along its foot.
    scene.box(FX, FRONT.y, 4, 72, 2, FRONT.h, folder);
    if (!empty) {
      const on = (u: number, z: number): Vec3 => [FX + u, FRONT.y + 1.05, z];
      const arrow: Tone = state === "loading" ? "hi" : folder === "base" ? "muted" : folder;
      scene.line(on(0, 36), on(0, 24), arrow, { bold: true });
      scene.polyline([on(-5, 29), on(0, 24), on(5, 29)], arrow, { bold: true });
      scene.line(on(-22, 12), on(22, 12), "faint", { bold: true });
      if (B > 0.01) scene.line(on(-22, 12), on(-22 + 44 * clamp(B), 12), state === "loading" ? "hi" : ctx.verdict("hi"), { bold: true });
    }
    cloud(scene, CLOUD_AT, empty ? "ghost" : "base");
  },
});
