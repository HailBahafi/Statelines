import { defineFigure } from "../../core/define";
import { clamp, lerp, smoothstep } from "../../engine/math";
import { pointAlong, sliceAlong, type Point2 } from "../../engine/path";
import type { Vec3 } from "../../engine/scene";
import { facing, faceArc, parcel } from "../shapes";

/** A plane flying a route between two cities. Use for flights, trips and booking confirmations. */
export const flight = defineFigure({
  name: "Flight",
  label: "A plane flying a route between two cities",
  offset: 6,
  setup: ({ spring }) => ({ t: spring(0, 90, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const ROUTE: Point2[] = [[-56, 24], [-4, -20], [56, -18]];
    const t = state === "loading" ? ctx.loop(3) : state === "success" ? 1 : state === "error" ? 0.45 : state === "empty" ? 0 : 0.2;
    const T = m.t.to(t).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : "base";
    scene.box(0, 0, 0, 150, 90, 4, "base");
    scene.polyline(ROUTE.map(([x, y]) => [x, y, 4] as Vec3), "ghost");
    if (T > 0.01 && state !== "empty") scene.polyline(sliceAlong(ROUTE, T).map(([x, y]) => [x, y, 6] as Vec3), tone, { bold: true });
    ROUTE.forEach(([x, y]) => scene.cylinder(x, y, 4, 5, 4, "muted"));
    if (state !== "empty") {
      const [x, y] = pointAlong(ROUTE, T);
      scene.box(x + shake, y, 14, 14, 6, 3, tone);
    }
    if (state === "success") scene.check(56, -18, 14, "ok", ctx.fade());
    if (state === "error") scene.cross(56, -18, 14, "err", ctx.fade());
  },
});

/** A map pin dropped on a map. Use for location, places and pickups. */
export const locate = defineFigure({
  name: "Locate",
  label: "A map pin dropping onto a map",
  offset: 4,
  setup: ({ spring }) => ({ drop: spring(40, 170, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let z = 40;
    if (state === "loading") z = 40 - 30 * Math.abs(Math.sin(ctx.loop(1.6) * Math.PI));
    if (state === "success" || state === "error") z = 14;
    if (state === "idle") z = 40 - ctx.hover * 8;
    const Z = m.drop.to(z).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 130, 90, 4, "base");
    for (let k = 0; k < 4; k++) scene.line([-60, -30 + k * 20, 4.05], [60, -30 + k * 20, 4.05], "faint");
    scene.disc(0 + shake, 14, 4.1, 6, "faint");
    scene.cylinder(shake, 0, 4, 9, Math.max(0.5, Z), tone);
    scene.disc(shake, 0, Z + 9, 12, tone, { fill: true });
    if (state === "success") scene.check(30, 26, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(30, 26, 4, "err", ctx.fade());
  },
});

/** A hotel key card sliding into a door reader. Use for check-in, room access and bookings. */
export const keycard = defineFigure({
  name: "Keycard",
  label: "A key card sliding into a reader",
  offset: 6,
  setup: ({ spring }) => ({ slide: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const x = state === "loading" ? -40 + 50 * smoothstep(ctx.loop(2)) : state === "success" ? 10 : state === "error" ? -34 : -40 + ctx.hover * 8;
    const X = m.slide.to(x).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 120, 80, 4, "base");
    scene.box(30, 0, 4, 40, 40, 30, "muted");
    scene.rect(38, -6, 50, 10, 34, state === "success" ? "ok" : "faint");
    scene.box(X + shake, -6, 6, 54, 30, 2, tone);
    scene.line([X - 20 + shake, -6, 8.05], [X + 18 + shake, -6, 8.05], "muted");
    if (state === "success") scene.check(44, -28, 34, "ok", ctx.fade());
    if (state === "error") scene.cross(44, -28, 34, "err", ctx.fade());
  },
});

/** A suitcase with a zip opening. Use for packing, trip planning and luggage. `count`: items, 1–4. */
export const luggage = defineFigure({
  name: "Luggage",
  label: "A suitcase with items going in",
  offset: 8,
  setup: ({ spring }) => ({ zip: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(2, 4, 1);
    const packed = state === "success" ? n : state === "loading" ? Math.floor(ctx.progress(n + 1) * n) : state === "error" ? n - 1 : 0;
    const Z = m.zip.to(state === "loading" ? 0 : state === "success" ? 1 : 0).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 110, 70, 26, tone);
    scene.box(0, 0, 26, 110, 74, 4, "muted");
    scene.box(-40, 0, 26, 4, 60, 3, "faint");
    for (let k = 0; k < n; k++) {
      if (k >= packed) continue;
      parcel(scene, -26 + k * 22 + shake * (state === "error" && k === n - 1 ? 1 : 0), 0, 30 + Z * 2, "muted");
    }
    if (state === "success") scene.check(0, -44, 26, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -44, 26, "err", ctx.fade());
  },
});

/** A passport with its stamp pressed. Use for identity, verification of travel documents, and entry. */
export const passport = defineFigure({
  name: "Passport",
  label: "A passport with a stamp",
  offset: 6,
  setup: ({ spring }) => ({ stamp: spring(40, 170, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let z = 40;
    if (state === "loading") z = 40 - 30 * Math.abs(Math.sin(ctx.loop(1.6) * Math.PI));
    if (state === "success" || state === "error") z = 14;
    const Z = m.stamp.to(z).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(-22, 0, 0, 80, 100, 10, "base");
    scene.rect(-40, -36, -4, -20, 10.05, "faint");
    for (let k = 0; k < 4; k++) scene.line([-30, -8 + k * 8, 10.05], [6, -8 + k * 8, 10.05], "muted");
    scene.disc(20 + shake, 24, Z, 14, tone);
    scene.disc(20 + shake, 24, Z, 9, tone);
    if (state === "success") scene.check(20, 24, Z + 1, "ok", ctx.fade());
    if (state === "error") scene.cross(20, 24, Z + 1, "err", ctx.fade());
  },
});

/** A globe slowly turning, with a marker on it. Use for worldwide reach, locales and global settings. */
export const globe = defineFigure({
  name: "Globe",
  label: "A globe turning with a marker",
  offset: 0,
  setup: () => ({}),
  draw(ctx) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const spin = state === "loading" ? ctx.time * 1.2 : 0.3;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    const R = 52;
    scene.disc(shake, 0, 4, R, "base", { plate: true });
    scene.polyline(faceArc(shake, 0, 4, R, 0, Math.PI * 2, 48), tone, { closed: true });
    for (let k = -2; k <= 2; k++) {
      const yy = (R * k) / 3;
      const w = Math.sqrt(Math.max(0, R * R - yy * yy));
      scene.line([shake - w, yy, 4], [shake + w, yy, 4], "faint");
    }
    for (let k = 0; k < 4; k++) {
      const a = spin + k * (Math.PI / 2);
      const x = shake + R * Math.cos(a) * 0.9;
      scene.polyline([[x, -R * 0.9, 4], [x, R * 0.9, 4]] as Vec3[], "faint");
    }
    const mk = spin;
    scene.disc(shake + R * 0.55 * Math.cos(mk), R * 0.4 * Math.sin(mk), 4.1, 4, tone === "base" ? "hi" : tone, { fill: true });
    if (state === "success") scene.check(0, 0, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 0, 4, "err", ctx.fade());
  },
});

/** A train passing along its track. Use for transit, travel progress and rail routes. */
export const train = defineFigure({
  name: "Train",
  label: "A train moving along a track",
  offset: 6,
  setup: ({ spring }) => ({ t: spring(0.2, 90, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const t = state === "loading" ? ctx.loop(3) : state === "success" ? 1 : state === "error" ? 0.5 : state === "empty" ? 0 : 0.2;
    const T = m.t.to(t).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 150, 60, 4, "base");
    scene.line([-64, -8, 4.05], [64, -8, 4.05], "faint", { bold: true });
    scene.line([-64, 8, 4.05], [64, 8, 4.05], "faint", { bold: true });
    const x = lerp(-56, 48, T) + shake;
    scene.box(x, 0, 4.1, 34, 14, 12, tone);
    scene.box(x + 12, 0, 4.1, 10, 14, 18, tone === "base" ? "muted" : tone);
    for (let k = 0; k < 2; k++) scene.disc(x - 8 + k * 16, 0, 4.1, 3.5, "muted", { fill: true });
    if (state === "success") scene.check(48, -22, 16, "ok", ctx.fade());
    if (state === "error") scene.cross(48, -22, 16, "err", ctx.fade());
  },
});

/** A compass needle finding north. Use for navigation, direction and onboarding to a place. */
export const compass = defineFigure({
  name: "Compass",
  label: "A compass needle turning north",
  offset: 0,
  setup: ({ spring }) => ({ needle: spring(0.8, 90, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    let a = 0.8;
    if (state === "idle" && ctx.pointer.over > 0.2) a = Math.atan2(g.y, g.x) + 0.2;
    if (state === "loading") a = Math.sin(ctx.time * 3) * 1.6;
    if (state === "success") a = 0;
    if (state === "error") a = 2.4;
    const A = m.needle.to(a).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.disc(shake, 0, 4, 50, "base", { plate: true });
    scene.polyline(faceArc(shake, 0, 4, 50, 0, Math.PI * 2, 48), "muted", { closed: true });
    for (let k = 0; k < 4; k++) scene.line([shake + 44 * Math.cos(k * Math.PI / 2), 44 * Math.sin(k * Math.PI / 2), 4], [shake + 36 * Math.cos(k * Math.PI / 2), 36 * Math.sin(k * Math.PI / 2), 4], "muted");
    const tip: Vec3 = [shake + 34 * Math.cos(A), 34 * Math.sin(A), 4.1];
    const tail: Vec3 = [shake - 34 * Math.cos(A), -34 * Math.sin(A), 4.1];
    scene.polyline([tip, [shake, 0, 4.1], tail], tone, { bold: true });
    scene.disc(shake, 0, 4.2, 3, tone, { fill: true });
    if (state === "success") scene.check(0, -58, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -58, 4, "err", ctx.fade());
  },
});

/** A boarding pass with a QR block. Use for tickets, check-in confirmations and boarding. */
export const boarding = defineFigure({
  name: "Boarding",
  label: "A boarding pass being scanned",
  offset: 6,
  setup: ({ spring }) => ({ pass: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const x = state === "loading" ? -30 + 60 * smoothstep(ctx.loop(2.2)) : state === "success" ? 40 : state === "error" ? -40 : -30 + ctx.hover * 6;
    const X = m.pass.to(x).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 130, 70, 3, "base");
    scene.box(-62, -40, 3, 8, 8, 30, "muted");
    scene.box(X + shake, 0, 6, 74, 40, 3, tone);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if ((r + c) % 2) scene.box(X - 20 + c * 6 + shake, -10 + r * 6, 8.5, 4, 4, 1, "muted");
    if (state === "success") scene.check(44, -28, 6, "ok", ctx.fade());
    if (state === "error") scene.cross(44, -28, 6, "err", ctx.fade());
  },
});
