import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { badge } from "../shapes";

const HINGE = -31;
const WIDTH = 62;
const BOTTOM = 4;
const TOP = 84;
const WALL = { inner: 36, outer: 74, h: 92, d: 6 };
const MAT = { x: 10, y: 30, w: 46, d: 30 };

/** A door that opens. Use for sign in, sign up, joining and access granted. */
export const signIn = defineFigure({
  name: "SignIn",
  label: "A door opening",
  offset: 18,
  setup: ({ spring }) => ({ angle: spring(0, 120, 18), bolt: spring(0, 200, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let target = state === "success" ? 1.25 : state === "idle" ? 0.35 * clamp(ctx.hover) : 0;
    // Loading: someone tries the handle, the door rattles on its latch.
    if (state === "loading") { target = 0.1 * Math.abs(Math.sin(ctx.time * 9)); m.angle.set(target); }
    const a = m.angle.to(target).value;
    const B = m.bolt.to(state === "error" ? 1 : 0).value;
    const wall: Tone = empty ? "muted" : "base";
    const wx = (WALL.inner + WALL.outer) / 2, ww = WALL.outer - WALL.inner;

    scene.box(0, 12, 0, 2 * WALL.outer + 12, 80, 4, "base");
    scene.box(MAT.x, MAT.y, 4, MAT.w, MAT.d, 2, empty ? "ghost" : "base");
    if (!empty) scene.rect(MAT.x - MAT.w / 2 + 4, MAT.y - MAT.d / 2 + 4, MAT.x + MAT.w / 2 - 4, MAT.y + MAT.d / 2 - 4, 6.05, "faint");

    // The wall with its doorway; the left piece is farthest, so it goes first.
    scene.box(-wx, 0, 4, ww, WALL.d, WALL.h - 4, wall);

    const reach = (f: number): [number, number] => [HINGE + WIDTH * f * Math.cos(a) + shake, WIDTH * f * Math.sin(a)];
    const on = (f: number, z: number): Vec3 => { const [x, y] = reach(f); return [x, y + 0.05, z]; };
    const [fx, fy] = reach(1);
    const door: Vec3[] = [[HINGE + shake, 0, BOTTOM], [fx, fy, BOTTOM], [fx, fy, TOP], [HINGE + shake, 0, TOP]];
    if (empty) scene.panel(door, "ghost");
    else {
      const tone: Tone = state === "success" ? "ok" : state === "error" ? "err" : "base";
      scene.panel(door, tone);
      const trim: Tone = tone === "base" ? "faint" : tone;
      scene.polyline([on(0.16, 50), on(0.84, 50), on(0.84, 76), on(0.16, 76)], trim, { closed: true });
      scene.polyline([on(0.16, 12), on(0.84, 12), on(0.84, 40), on(0.16, 40)], trim, { closed: true });
      scene.line(on(0.86, 42), on(0.86, 52), state === "loading" ? "hi" : tone === "base" ? "base" : tone, { bold: true });
    }

    scene.box(0, 0, TOP + 2, 2 * WALL.inner, WALL.d, WALL.h - TOP - 2, wall);
    scene.box(wx, 0, 4, ww, WALL.d, WALL.h - 4, wall);
    // A keypad beside the door, lit while it checks.
    const pad: Tone = empty ? "ghost" : state === "loading" ? (Math.floor(ctx.time * 3) % 2 ? "hi" : "muted") : ctx.verdict("muted");
    scene.box(wx - 8, WALL.d / 2 + 1, 40, 8, 2, 12, pad);

    // Refused: a bar drops across the door at handle height.
    if (B > 0.01 && !empty) scene.box(shake * 0.5, WALL.d / 2 + 2, 70 - B * 26, 2 * WALL.inner + 14, 3, 5, "err");

    badge(scene, MAT.x, MAT.y, 6, state, ctx.fade(), 12);
  },
});
