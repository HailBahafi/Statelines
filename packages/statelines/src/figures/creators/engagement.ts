import { defineFigure } from "../../core/define";
import { clamp, wrap } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { frontArc, heart } from "../shapes";

const PHONE = { w: 68, d: 10, h: 124 };
const FACE = PHONE.d / 2 + 0.05;
/** The photo on the post: u from -27 to 27, z from 56 to 99. */
const PHOTO = { u0: -27, u1: 27, z0: 56, z1: 99 };
/** The crack a broken photo splits along, top to bottom. */
const CRACK: [number, number][] = [[2, 99], [-3, 90], [4, 81], [-2, 72], [3, 63], [-1, 56]];
const LIKE = { u: -21, z: 46 };

/** A heart drawn flat on the phone's face (the plane y), `size` units across. */
function faceHeart(scene: Scene, x: number, y: number, z: number, size: number, tone: Tone): void {
  const k = size / 32, pts: Vec3[] = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    const u = 16 * Math.sin(t) ** 3;
    const v = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([x + u * k, y, z + v * k]);
  }
  scene.panel(pts, tone);
}

/** A social post on a phone, with hearts floating up off it. Use for engagement and post analytics. */
export const engagement = defineFigure({
  name: "Engagement",
  label: "A social post on a phone with hearts floating up",
  offset: 30,
  setup: ({ spring }) => ({ big: spring(0, 180, 14), crack: spring(0, 120, 12), likes: spring(10, 140, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty", broken = state === "error";
    const on = (u: number, z: number, d = 0): Vec3 => [u + shake, FACE + d, z];

    scene.box(0, 0, 0, 120, 84, 4, "base");
    scene.box(0, 0, 4, PHONE.w, PHONE.d, PHONE.h, empty ? "ghost" : "base");
    if (empty) {
      scene.panel([on(PHOTO.u0, PHOTO.z0), on(PHOTO.u1, PHOTO.z0), on(PHOTO.u1, PHOTO.z1), on(PHOTO.u0, PHOTO.z1)], "ghost");
      return;
    }
    // The screen's edge and the speaker.
    scene.polyline([on(-30, 12), on(30, 12), on(30, 118), on(-30, 118)], "faint", { closed: true });
    scene.line(on(-6, 123), on(6, 123), "muted");

    // The post's header: the creator's avatar and name.
    const text: Tone = broken ? "faint" : "muted";
    scene.polyline(frontArc(-21 + shake, FACE, 108, 4.5, 0, Math.PI * 2, 14), text);
    scene.line(on(-13, 110), on(9, 110), text, { bold: true });
    scene.line(on(-13, 105), on(-2, 105), "faint");

    // The photo: a print standing on the screen, or, when the post fails, split along a crack.
    const { u0, u1, z0, z1 } = PHOTO;
    const C = m.crack.to(broken ? 1 : 0).value;
    if (broken) {
      const left: Vec3[] = [on(u0, z0, 0.6), ...CRACK.slice().reverse().map(([u, z]) => on(u, z, 0.6)), on(u0, z1, 0.6)];
      const du = 3 * C, dz = -8 * C;
      const right: Vec3[] = [...CRACK.map(([u, z]) => on(u + du, z + dz, 0.6)), on(u1 + du, z0 + dz, 0.6), on(u1 + du, z1 + dz, 0.6)];
      scene.panel(left, "err");
      scene.panel(right, "err");
      scene.polyline([on(u0 + 6, z0 + 8, 0.7), on(-8, 76, 0.7), on(-3, 70, 0.7)], "faint");
    } else {
      scene.box(shake, FACE + 1, z0, u1 - u0, 2, z1 - z0, "base");
      const f = 2.05;
      scene.polyline(frontArc(14 + shake, FACE + f, 89, 4, 0, Math.PI * 2, 12), "muted");
      scene.polyline([on(u0, z0 + 6, f), on(-12, 78, f), on(-4, 70, f), on(8, 84, f), on(u1, z0 + 10, f)], "muted");
    }

    // The action row: like, comment, share and save, then the like count and the caption.
    const liked: Tone = state === "success" ? "ok" : broken ? "faint" : state === "loading" ? "hi" : "base";
    faceHeart(scene, LIKE.u + shake, FACE, LIKE.z, 10 + (state === "idle" ? ctx.hover * 4 : 0), liked);
    // Liked: the button fills in.
    if (state === "success") for (const s of [6.5, 3]) faceHeart(scene, LIKE.u, FACE, LIKE.z - (10 - s) * 0.08, s, "ok");
    scene.polyline([...frontArc(-7 + shake, FACE, 46.5, 4, -2.2, 3.6, 12), on(-10, 41.5)], text, { closed: true });
    scene.polyline([on(2, 45), on(11, 49.5), on(6, 41), on(5, 45)], text, { closed: true });
    scene.polyline([on(22, 50), on(22, 42), on(24.5, 44.5), on(27, 42), on(27, 50)], text, { closed: true });
    const L = m.likes.to(state === "success" ? 26 : broken ? 6 : state === "loading" ? 18 : 12).value;
    scene.line(on(-27, 36), on(-27 + L, 36), state === "success" ? "ok" : state === "loading" ? "hi" : text, { bold: true });
    scene.line(on(-27, 29), on(20, 29), "faint");
    scene.line(on(-27, 23), on(4, 23), "faint");

    // While loading, hearts float up off the like button across the photo.
    if (state === "loading") {
      for (let k = 0; k < 4; k++) {
        const q = wrap(ctx.time * 0.55 + k / 4, 1);
        const u = LIKE.u + 6 + q * 22 + Math.sin(q * 7 + k) * 5;
        heart(scene, u, FACE + 8, LIKE.z + 8 + q * 56, 9 + 7 * q, "hi", clamp((1 - q) * 1.6));
      }
    }
    // Liked: a big heart pops in front of the photo.
    const big = m.big.to(state === "success" ? 1 : 0).value;
    if (big > 0.02) heart(scene, 0, FACE + 10, 78, 36 * big, "ok", Math.min(1, big * 1.5));
  },
});
