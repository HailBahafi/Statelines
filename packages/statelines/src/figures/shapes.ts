import type { Scene, Tone, Vec3 } from "../engine/scene";

const ROOT3 = Math.sqrt(3);

/**
 * A point on the plane that faces the viewer, through (x, y, z): `u` runs right across the
 * screen and `v` straight up, both in screen pixels. Use it for flat things that should read
 * head-on, like hearts, gauges and play buttons.
 */
export const facing = (x: number, y: number, z: number, u: number, v: number): Vec3 =>
  [x + u / ROOT3, y - u / ROOT3, z + v];

/** A circle, or part of one, on the viewer-facing plane. */
export function faceArc(cx: number, cy: number, cz: number, r: number, a0 = 0, a1 = Math.PI * 2, steps = 32): Vec3[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return facing(cx, cy, cz, r * Math.cos(a), r * Math.sin(a));
  });
}

/** A circle on the vertical plane y = yFront, the face of a box that looks toward the lower left. */
export function frontArc(cx: number, yFront: number, cz: number, r: number, a0 = 0, a1 = Math.PI * 2, steps = 32): Vec3[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [cx + r * Math.cos(a), yFront, cz + r * Math.sin(a)] as Vec3;
  });
}

/** A heart facing the viewer, `size` pixels across. */
export function heart(scene: Scene, x: number, y: number, z: number, size: number, tone: Tone = "base", opacity?: number): void {
  const k = size / 32, pts: Vec3[] = [];
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    const u = 16 * Math.sin(t) ** 3;
    const v = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push(facing(x, y, z, u * k, v * k));
  }
  scene.panel(pts, tone, opacity);
}

/** A stack of coins, bottom first. */
export function coins(scene: Scene, x: number, y: number, z: number, count: number, tone: Tone = "base", top: Tone = tone, r = 14): number {
  for (let k = 0; k < count; k++) scene.cylinder(x, y, z + k * 5, r, 4, k === count - 1 ? top : tone);
  return z + count * 5;
}

/**
 * Small objects that recur across figures. Each one is drawn the same way everywhere,
 * so a sheet in Upload and a sheet in Download read as the same thing.
 */

/** A sheet of paper lying flat, with a few lines of text. */
export function sheet(scene: Scene, x: number, y: number, z: number, w: number, d: number,
                      tone: Tone = "base", opacity?: number, lines = 3): void {
  scene.box(x, y, z, w, d, 2, tone, opacity);
  if (tone === "ghost") return;
  const top = z + 2.05, left = x - w * 0.32, right = x + w * 0.32, step = (d * 0.56) / Math.max(1, lines - 1);
  for (let i = 0; i < lines; i++) {
    const ly = y - d * 0.28 + i * step;
    scene.line([left, ly, top], [i === lines - 1 ? x : right, ly, top], "muted", { opacity });
  }
}

/** An envelope lying flat, its flap drawn on top. */
export function envelope(scene: Scene, x: number, y: number, z: number, tone: Tone = "base", opacity?: number, scale = 1): void {
  const w = 25 * scale, d = 17 * scale;
  scene.box(x, y, z, w * 2, d * 2, 3, tone, opacity);
  if (tone === "ghost") return;
  scene.polyline([[x - w, y - d, z + 3], [x, y + 3 * scale, z + 3], [x + w, y - d, z + 3]],
    tone === "base" ? "muted" : tone, { opacity });
}

/** The bust of the person standee, in facing (u, v) units: flat base, straight sides, round shoulders. */
const BUST: [number, number][] = [
  [-8.5, 0], [8.5, 0],
  ...Array.from({ length: 11 }, (_, i): [number, number] => {
    const a = (Math.PI * i) / 10;
    return [8.5 * Math.cos(a), 5 + 7.5 * Math.sin(a)];
  }),
];

/**
 * A person: the familiar avatar silhouette, a round head over rounded shoulders, cut as a
 * standee with a little thickness that faces the viewer, standing on a small round base.
 */
export function person(scene: Scene, x: number, y: number, z: number, tone: Tone = "base", opacity?: number, scale = 1): void {
  const s = scale, t = 1.6 * s, b = 2 * s;
  scene.cylinder(x, y, z, 7.5 * s, b, tone, opacity);
  // The cut-out is drawn twice: once pushed back (its thickness), then the face.
  for (const d of [t, 0]) {
    const cx = x - d, cy = y - d, cz = z + b;
    scene.panel(BUST.map(([u, v]) => facing(cx, cy, cz, u * s, v * s)), tone, opacity);
    scene.panel(faceArc(cx, cy, cz + 19 * s, 5.6 * s, 0, Math.PI * 2, 20), tone, opacity);
  }
}

/** A parcel with tape across its lid. */
export function parcel(scene: Scene, x: number, y: number, z: number, tone: Tone = "base", opacity?: number): void {
  scene.box(x, y, z, 24, 24, 20, tone, opacity);
  if (tone === "ghost") return;
  scene.line([x, y - 12, z + 20.05], [x, y + 12, z + 20.05], "muted", { opacity });
}

/** An open tray: floor and four walls. `inside` is drawn between the back and front walls. */
export function tray(scene: Scene, w: number, d: number, wall: number, z: number, tone: Tone, inside: () => void): void {
  const t = 3;
  scene.box(0, 0, z, w, d, t, tone);
  scene.box(-w / 2 + t / 2, 0, z + t, t, d, wall, tone);
  scene.box(0, -d / 2 + t / 2, z + t, w, t, wall, tone);
  inside();
  scene.box(w / 2 - t / 2, 0, z + t, t, d, wall, tone);
  scene.box(0, d / 2 - t / 2, z + t, w, t, wall, tone);
}
