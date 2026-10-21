import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, smoothstep } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { facing, frontArc } from "../shapes";

/** A phone that connects to a device. Use for pairing, bluetooth and device setup. */
export const pair = defineFigure({
  name: "Pair",
  label: "A phone connecting to a device",
  offset: 6,
  setup: ({ spring }) => ({ link: spring(0, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const link = m.link.to(state === "success" ? 1 : 0).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 140, 90, 4, "base");
    scene.box(-40 + shake, 0, 4, 30, 50, 40, tone);
    scene.rect(-48 + shake, -18, -32 + shake, 14, 44, "faint");
    scene.box(40, 0, 4, 40, 40, 20, state === "empty" ? "ghost" : "muted");
    if (state === "loading") for (let k = 0; k < 3; k++) {
      const q = (ctx.loop(1.8) + k / 3) % 1;
      scene.arc(-8, 0, 30, 10 + 28 * q, -0.8, 0.8, "hi", { opacity: 1 - q });
    }
    scene.line([-24, 0, 30 * link + 26], [24, 0, 26 + 2 * link], state === "success" ? "ok" : "faint", { bold: true });
    if (state === "success") scene.check(0, -30, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -30, 4, "err", ctx.fade());
  },
});

/** A battery that fills and charges. Use for battery status, charging and power. */
export const battery = defineFigure({
  name: "Battery",
  label: "A battery filling up",
  offset: 6,
  setup: ({ spring }) => ({ level: spring(0.35, 120, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let level = 0.35;
    if (state === "loading") level = ctx.progress(3);
    if (state === "success") level = 1;
    if (state === "error") level = 0.08;
    if (state === "empty") level = 0;
    const L = m.level.to(level).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : "base";
    scene.box(0, 0, 0, 120, 60, 4, "base");
    scene.box(-42 + shake, 0, 4, 96, 36, 36, tone === "base" ? "base" : tone);
    scene.box(-42 + 96 - 2, 0, 4, 6, 14, 14, "muted");
    if (L > 0.02) scene.box(-40 + shake, 0, 6, 90 * L, 30, 26, tone === "base" ? "muted" : tone);
    if (state === "success") scene.check(0, -28, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -28, 4, "err", ctx.fade());
  },
});

/** A smart speaker with waves. Use for voice assistants, audio output and smart-home devices. */
export const speaker = defineFigure({
  name: "Speaker",
  label: "A smart speaker sending sound waves",
  offset: 0,
  setup: () => ({}),
  draw(ctx) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 80, 80, 4, "base");
    scene.cylinder(shake, 0, 4, 28, 60, tone);
    scene.disc(shake, 0, 64, 14, "muted", { plate: true });
    if (state === "loading") for (let k = 0; k < 3; k++) {
      const q = (ctx.loop(1.5) + k / 3) % 1;
      scene.arc(0, 0, 66, 14 + 46 * q, -0.9, 0.9, "hi", { opacity: 1 - q });
    }
    if (state === "success") scene.check(0, -44, 64, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -44, 64, "err", ctx.fade());
  },
});

/** A watch face with a heart and steps ring. Use for wearables, activity and fitness. */
export const watch = defineFigure({
  name: "Watch",
  label: "A smartwatch face with a progress ring",
  offset: 4,
  setup: ({ spring }) => ({ ring: spring(0.6, 110, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let ring = 0.6;
    if (state === "loading") ring = ctx.progress(3);
    if (state === "success") ring = 1;
    if (state === "error") ring = 0.2;
    const R = m.ring.to(ring).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 100, 100, 4, "base");
    scene.cylinder(shake, 0, 4, 34, 14, tone === "base" ? "base" : tone);
    scene.disc(shake, 0, 18.1, 26, "faint");
    scene.arc(shake, 0, 18.2, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * R, tone, { bold: true });
    scene.box(shake, -50, 4, 24, 12, 4, "muted");
    if (state === "success") scene.check(0, 56, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 56, 4, "err", ctx.fade());
  },
});

/** A camera with a lens that iris-opens. Use for photo capture, camera permission and selfies. */
export const camera = defineFigure({
  name: "Camera",
  label: "A camera lens opening",
  offset: 18,
  setup: ({ spring }) => ({ iris: spring(0.3, 160, 18), photo: spring(0, 120, 16), press: spring(0, 220, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let open = 0.3 + ctx.hover * 0.4, press = 0;
    if (state === "loading") {
      const q = ctx.loop(1.6);
      open = 0.3 + 0.6 * bump(q);
      press = q < 0.15 ? 1 : 0;
      m.iris.set(open);
    }
    if (state === "success") open = 0.9;
    if (state === "error") open = 0.12;
    const O = m.iris.to(open).value, P = m.press.to(press).value;
    const F = m.photo.to(state === "success" ? 1 : 0).value;
    const body: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const accent: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "muted";

    // Body proportions: x across, y depth (the lens looks out of the y+ face), z up.
    const X = shake, Y = -8, W = 86, D = 30, H = 50, top = 4 + H, front = Y + D / 2;
    scene.box(0, 0, 0, 132, 108, 4, "base");

    // An instant photo slides out from under the camera on success.
    if (F > 0.02) {
      const py = lerp(Y, 34, F), pz = 4;
      scene.box(-30, py, pz, 34, 36, 2, "ok", Math.min(1, F * 1.6));
      scene.rect(-43, py - 13, -17, py + 9, pz + 2.05, "ok", F);
      scene.polyline([[-43, py + 9, pz + 2.1], [-34, py - 1, pz + 2.1], [-28, py + 4, pz + 2.1], [-17, py - 6, pz + 2.1]], "ok", { opacity: F });
    }

    scene.box(X, Y, 4, W, D, H, body);
    if (empty) {
      scene.polyline(frontArc(X + 4, front + 0.05, 4 + H / 2, 18, 0, Math.PI * 2, 32), "ghost");
      return;
    }
    // On top: the mode dial, the viewfinder hump and the shutter button.
    scene.cylinder(X - 30, Y - 4, top, 7, 5, body);
    scene.box(X + 2, Y - 2, top, 30, 22, 10, body);
    scene.cylinder(X + 30, Y + 2, top, 5, 3 - P * 2, state === "loading" ? "hi" : body);
    // On the face: the flash window and the grip.
    const flash: Vec3[] = [[X - 38, front + 0.05, top - 14], [X - 24, front + 0.05, top - 14], [X - 24, front + 0.05, top - 6], [X - 38, front + 0.05, top - 6]];
    scene.polyline(flash, state === "loading" && P > 0.5 ? "hi" : "muted", { closed: true, bold: state === "loading" && P > 0.5 });
    scene.box(X + 34, front + 2, 4, 14, 4, H - 6, body);

    // The lens: stepped rings standing out of the face, then the glass and its iris.
    const lx = X + 2, lz = 4 + H / 2 - 1;
    for (let k = 0; k < 6; k++) {
      const y = front + 0.05 + k * 2.6, r = 21 - k * (k < 2 ? 0.4 : 1.1);
      scene.panel(frontArc(lx, y, lz, r, 0, Math.PI * 2, 32), k === 5 ? accent === "muted" ? body : accent : body);
    }
    const glass = front + 0.1 + 5 * 2.6;
    scene.polyline(frontArc(lx, glass, lz, 11, 0, Math.PI * 2, 28), "muted");
    scene.polyline(frontArc(lx, glass, lz, Math.max(1.5, 11 * O), 0, Math.PI * 2, 28), accent === "muted" ? "base" : accent, { bold: true });
    scene.polyline(frontArc(lx, glass, lz, 7.5, 2.1, 2.9, 6), "faint");
    if (state === "error") {
      // A cracked lens.
      scene.polyline([[lx - 12, glass, lz + 6], [lx - 3, glass, lz + 1], [lx + 1, glass, lz + 5], [lx + 11, glass, lz - 4]], "err", { opacity: ctx.fade() });
      scene.line([lx - 3, glass, lz + 1], [lx - 5, glass, lz - 9], "err", { opacity: ctx.fade() });
    }
  },
});

/** A microphone with sound rising from it. Use for voice recording, transcription and audio input. */
export const mic = defineFigure({
  name: "Mic",
  label: "A microphone picking up sound",
  offset: 4,
  setup: ({ spring }) => ({ level: spring(0.2, 140, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const lvl = state === "loading" ? 0.3 + 0.7 * Math.abs(Math.sin(ctx.time * 6)) : state === "empty" ? 0 : 0.25;
    const L = m.level.to(lvl).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 100, 70, 4, "base");
    scene.cylinder(-10 + shake, 0, 4, 12, 30, tone);
    scene.arc(-10 + shake, 0, 34, 16, 0, Math.PI, "muted");
    scene.line([-10 + shake, 0, 34], [-10 + shake, 0, 14], "muted", { bold: true });
    for (let k = 1; k <= 3; k++) scene.arc(-10, 0, 14, 18 + k * 12 * (0.5 + L), -0.6, 0.6, tone === "base" ? "muted" : tone, { opacity: 1 - k * 0.22 });
    if (state === "success") scene.check(40, -22, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(40, -22, 4, "err", ctx.fade());
  },
});

/** A printer with a page sliding out. Use for printing, exports and physical output. */
export const printer = defineFigure({
  name: "Printer",
  label: "A printer with a page sliding out",
  offset: 6,
  setup: ({ spring }) => ({ page: spring(0, 150, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let out = 0;
    if (state === "loading") out = ctx.progress(2.4);
    if (state === "success") out = 1;
    if (state === "error") out = 0.25;
    const P = m.page.to(out).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 120, 70, 22, "base");
    scene.box(0 + shake, 0, 22, 86, 30, 4, tone);
    scene.box(0, 26 + 28 * P, 22, 66, 40 * P + 1, 1, "faint");
    scene.line([-30, 40, 22.05], [30 * P, 40, 22.05], "muted");
    if (state === "success") scene.check(44, -26, 22, "ok", ctx.fade());
    if (state === "error") scene.cross(44, -26, 22, "err", ctx.fade());
  },
});

/** A server rack: blades that light up one at a time. Use for hosting, deploy health and infrastructure. `count`: blades, 3–8. */
export const rack = defineFigure({
  name: "Rack",
  label: "A server rack with blades lighting up",
  offset: 10,
  setup: ({ spring }) => ({ light: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(5, 8, 3);
    const h = 90 / n;
    scene.box(0, 0, 0, 80, 70, 4, state === "empty" ? "ghost" : "base");
    for (let k = 0; k < n; k++) {
      const z = 4 + k * h, lit = state === "loading" ? k === Math.floor(ctx.loop(1.6) * n) : state === "success";
      const tone = state === "error" && k === 0 ? "err" : lit ? (state === "success" ? "ok" : "hi") : "muted";
      scene.box(shake * (state === "error" && k === 0 ? 1 : 0), 0, z, 60, 60, h * 0.7, state === "empty" ? "ghost" : tone);
      scene.disc(28, -22, z + h * 0.7 + 0.05, 2, lit ? "hi" : "faint", { fill: true });
    }
    if (state === "success") scene.check(0, 46, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 46, 4, "err", ctx.fade());
  },
});

/** A satellite dish pointing at a signal. Use for connectivity, reconnecting and global coverage. */
export const satellite = defineFigure({
  name: "Satellite",
  label: "A dish locking onto a signal",
  offset: 6,
  setup: ({ spring }) => ({ aim: spring(0, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    let aim = 0;
    if (state === "idle" && ctx.pointer.over > 0.2) aim = clamp(g.x / 60, -0.6, 0.6);
    if (state === "loading") aim = 0.6 * Math.sin(ctx.time * 1.4);
    if (state === "success") aim = 0;
    const A = m.aim.to(aim).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 120, 80, 4, "base");
    scene.cylinder(-12, 4, 4, 6, 40, "muted");
    const cx = -12 + shake, cy = 0, cz = 46;
    const pts = Array.from({ length: 17 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 16) * Math.PI;
      return [cx + 26 * Math.cos(a + A) * 0.9, cy + 26 * Math.sin(a + A) * 0.9, cz + 22 * Math.sin(a + A) * 0.3 + 22] as Vec3;
    });
    scene.polyline(pts, tone, { bold: true });
    scene.line([cx, cy, cz], [cx + 14 * Math.cos(A), cy, cz - 6], tone === "base" ? "muted" : tone);
    if (state === "loading") for (let k = 0; k < 3; k++) {
      const q = (ctx.loop(1.6) + k / 3) % 1;
      scene.arc(40, -24, 4, 6 + 22 * q, -0.9, 0.9, "hi", { opacity: 1 - q });
    }
    if (state === "success") scene.check(40, -24, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(40, -24, 4, "err", ctx.fade());
  },
});

/** An antenna sending a satellite-to-phone pulse. Use for push notifications and background sync. */
export const sync = defineFigure({
  name: "Sync",
  label: "Two arrows turning to sync",
  offset: 4,
  setup: ({ spring }) => ({ turn: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const a = state === "loading" ? ctx.time * 2.4 : state === "success" ? 0 : state === "error" ? 0.4 : 0.5 + ctx.hover * 0.3;
    const T = m.turn.to(a).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 100, 100, 4, "base");
    scene.arc(shake, 0, 6, 30, T, T + Math.PI * 1.2, tone, { bold: true });
    scene.arc(shake, 0, 6, 30, T + Math.PI, T + Math.PI * 2.2, tone, { bold: true });
    scene.cylinder(shake, 0, 4, 10, 10, tone);
    if (state === "success") scene.check(0, 0, 18, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 0, 18, "err", ctx.fade());
  },
});

/** A chip being inserted into a board. Use for hardware setup, integrations and dev kits. */
export const chip = defineFigure({
  name: "Chip",
  label: "A chip seating into a board",
  offset: 4,
  setup: ({ spring }) => ({ seat: spring(40, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let z = 40;
    if (state === "loading") z = 40 - 34 * smoothstep(ctx.loop(2));
    if (state === "success") z = 6;
    if (state === "error") z = 30;
    if (state === "idle") z = 40 - ctx.hover * 8;
    const Z = m.seat.to(z).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 120, 90, 4, "base");
    for (let k = 0; k < 6; k++) scene.box(-50 + k * 8, -50, 4, 3, 10, 3, "muted");
    scene.box(0 + shake, 0, Z, 40, 40, 6, tone);
    for (let k = 0; k < 6; k++) scene.line([-22, -10 + k * 4, Z + 6.05], [-20 + k * 4, -10 + k * 4, Z + 6.05], "muted");
    if (state === "success") scene.check(42, 34, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(42, 34, 4, "err", ctx.fade());
  },
});

/** A mouse and cursor clicking. Use for click-through tutorials, demos and interactive guides. */
export const cursor = defineFigure({
  name: "Cursor",
  label: "A cursor clicking a button",
  offset: 4,
  setup: ({ spring }) => ({ press: spring(0, 220, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const pressed = state === "loading" ? (ctx.loop(1.2) < 0.2 ? 1 : 0) : 0;
    const P = m.press.to(pressed).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : "base";
    scene.box(0, 0, 0, 120, 70, 4, "base");
    scene.box(0 + shake, 0, 4 - P * 2, 70, 30, 8 - P * 3, state === "idle" ? "muted" : tone);
    const tip: Vec3[] = [[30, -28, 4], [30, 0, 4], [36, -5, 4], [42, 6, 4], [48, 2, 4], [42, -6, 4], [48, -10, 4]];
    scene.polyline(tip.map(([x, y, z]) => [x - 20 + P * 4, y + 10, z + 12] as Vec3), tone, { closed: true });
    if (state === "success") scene.check(42, 30, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(42, 30, 4, "err", ctx.fade());
  },
});
