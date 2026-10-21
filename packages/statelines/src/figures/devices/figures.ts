import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, smoothstep } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { facing, frontArc } from "../shapes";

const TAU = Math.PI * 2;

/** A rounded rectangle on the vertical plane y, centred on (cx, cz): clockwise from the top-right corner. */
function rounded(cx: number, y: number, cz: number, a: number, b: number, r: number, steps = 4): Vec3[] {
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

/** An upright slab with rounded corners whose face looks to the lower left. Returns the y of its face. */
function slab(scene: Scene, cx: number, cy: number, cz: number, a: number, b: number, r: number, d: number, tone: Tone): number {
  const face = cy + d / 2;
  const front = rounded(cx, face, cz, a, b, r), back = rounded(cx, cy - d / 2, cz, a, b, r);
  if (tone === "ghost") {
    scene.panel(front, "ghost");
    return face;
  }
  // The band that shows above and to the right of the face: the top-left corner round to the bottom-right one.
  const idx = [15, 16, 17, 18, 19, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  scene.panel([...idx.map(i => back[i]!), ...idx.slice().reverse().map(i => front[i]!)], tone);
  scene.panel(front, tone);
  return face;
}

/** An oval on the vertical plane x, centred on (y, z): the face of a knob or ear cup that looks to the lower right. */
const sideOval = (x: number, y: number, z: number, ry: number, rz: number, steps = 16): Vec3[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * TAU;
    return [x, y + ry * Math.cos(a), z + rz * Math.sin(a)] as Vec3;
  });

/** Tips a point forward (toward y+) by `a` radians about the horizontal line through (py, pz). */
const tip = (py: number, pz: number, a: number) => ([x, y, z]: Vec3): Vec3 => {
  const dy = y - py, dz = z - pz, c = Math.cos(a), s = Math.sin(a);
  return [x, py + dy * c + dz * s, pz - dy * s + dz * c];
};

/** The part of an upright cylinder's skin that faces the viewer, between two heights. */
function skin(cx: number, cy: number, r: number, z0: number, z1: number, a0: number, a1: number, steps = 8): Vec3[] {
  const ring = (z: number, from: number, to: number) => Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a), z] as Vec3;
  });
  return [...ring(z0, a0, a1), ...ring(z1, a1, a0)];
}

/** A phone pairing with a pair of headphones. Use for pairing, bluetooth and device setup. */
export const pair = defineFigure({
  name: "Pair",
  label: "A phone pairing with headphones",
  offset: 12,
  setup: ({ spring }) => ({ link: spring(0, 160, 18), knob: spring(0, 200, 18), fall: spring(0, 90, 11) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const K = m.knob.to(state === "success" ? 1 : 0).value;
    const L = clamp(m.link.to(state === "success" ? 1 : 0).value, 0, 1.2);
    const F = m.fall.to(state === "error" ? 1.3 : ctx.hover * 0.12).value;
    const verdict: Tone = state === "loading" ? "hi" : ctx.verdict("muted");
    scene.box(0, 0, 0, 150, 104, 4, "base");

    // The route between them runs along the floor.
    const r0: Vec3 = [-12, 14, 4.05], r1: Vec3 = [8, -8, 4.05];
    const along = (t: number): Vec3 => [lerp(r0[0], r1[0], t), lerp(r0[1], r1[1], t), 4.05];
    if (!empty) {
      if (state === "loading") {
        scene.line(r0, r1, "faint");
        for (let k = 0; k < 3; k++) {
          const q = (ctx.loop(1.4) + k / 3) % 1;
          scene.line(along(q * 0.85), along(q * 0.85 + 0.15), "hi", { bold: true });
        }
      } else if (state === "error") {
        scene.line(r0, along(0.42), "err", { bold: true, opacity: ctx.fade() });
        scene.line(along(0.58), r1, "faint");
      } else if (L > 0.02) {
        scene.line(r0, along(Math.min(1, L)), "ok", { bold: true });
      }
    }

    // The phone, standing, its screen looking down-left.
    const PX = -34, PY = 22, PZ = 39;
    const face = slab(scene, PX, PY, PZ, 19, 35, 6, 8, empty ? "ghost" : "base");
    const on = (u: number, z: number, d = 0.05): Vec3 => [PX + u, face + d, z];
    if (!empty) {
      scene.polyline(rounded(PX, face + 0.05, PZ, 15, 31, 4, 2), "faint", { closed: true });
      scene.line(on(-4, 70), on(4, 70), "muted");
      // A headphone glyph above the device row.
      scene.polyline(frontArc(PX, face + 0.1, 50, 7, 0, Math.PI, 10), "muted", { bold: true });
      scene.polyline([on(-8, 50), on(-8, 43), on(-5, 43), on(-5, 50)], "muted", { closed: true });
      scene.polyline([on(5, 50), on(5, 43), on(8, 43), on(8, 50)], "muted", { closed: true });
      if (state === "loading") {
        const a = -ctx.time * 5;
        scene.polyline(frontArc(PX, face + 0.15, 47, 12, a, a + 2.2, 12), "hi", { bold: true });
      }
      // The device row with its toggle.
      const row: Tone = state === "loading" ? "base" : ctx.verdict();
      const rx = PX + (state === "error" ? shake * 0.5 : 0);
      scene.box(rx, face + 1.5, 18, 28, 3, 12, row);
      const rf = face + 3.05;
      scene.line([rx - 11, rf, 26], [rx - 2, rf, 26], "muted");
      scene.line([rx - 11, rf, 22], [rx - 5, rf, 22], "faint");
      scene.polyline([[rx + 1, rf, 21], [rx + 12, rf, 21], [rx + 12, rf, 27], [rx + 1, rf, 27]], K > 0.5 ? "ok" : "faint", { closed: true });
      scene.box(rx + 3.5 + K * 6, rf + 1, 21.5, 4, 2, 5, K > 0.5 ? "ok" : state === "loading" ? "hi" : "muted");
    }

    // The headphones: two ear cups on a headband; they tip over onto the plate on error.
    const hx = 30 + shake, hy = -24, cz = 16;
    const T = tip(hy + 9, 4, F);
    const tone: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const cup = (x: number, ry: number, rz: number, t: Tone) => scene.panel(sideOval(x, hy, cz, ry, rz).map(T), t);
    const band = (y: number) => {
      const outer = Array.from({ length: 13 }, (_, i) => T([hx + 26 * Math.cos((i / 12) * Math.PI), y, 25 + 33 * Math.sin((i / 12) * Math.PI)]));
      const inner = Array.from({ length: 13 }, (_, i) => T([hx + 22 * Math.cos(((12 - i) / 12) * Math.PI), y, 25 + 29 * Math.sin(((12 - i) / 12) * Math.PI)]));
      scene.panel([...outer, ...inner], tone);
    };
    cup(hx - 27, 8, 11, tone);
    cup(hx - 24, 9, 12, tone);
    if (!empty) {
      cup(hx - 20, 8, 11, "muted");
      scene.polyline(sideOval(hx - 19.9, hy, cz, 4.5, 6.5, 12).map(T), "faint");
    }
    band(hy - 3);
    band(hy + 3);
    if (!empty) cup(hx + 20, 8, 11, "muted");
    cup(hx + 23, 9, 12, tone);
    cup(hx + 26, 8.5, 11.5, tone);
    if (!empty) {
      scene.polyline(sideOval(hx + 26.05, hy, cz, 5, 7, 14).map(T), "muted");
      scene.polyline(sideOval(hx + 26.1, hy + 5, cz - 7, 1.1, 1.1, 6).map(T), state === "idle" ? "faint" : verdict, { bold: state !== "idle" });
    }
  },
});

/** A battery charging in its cradle. Use for battery status, charging and power. */
export const battery = defineFigure({
  name: "Battery",
  label: "A battery filling up in its charger",
  offset: 14,
  setup: ({ spring }) => ({ level: spring(0.35, 120, 18), lift: spring(0, 130, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let level = 0.35;
    if (state === "loading") level = ctx.progress(3);
    if (state === "success") level = 1;
    if (state === "error") level = 0.08;
    if (state === "empty") level = 0;
    const L = clamp(m.level.to(level).value, 0, 1);
    const up = m.lift.to(state === "error" ? 15 : ctx.hover * 4).value;
    const tone: Tone = state === "loading" ? "hi" : ctx.verdict("muted");
    const cr: Tone = empty ? "ghost" : "base";
    scene.box(0, 0, 0, 140, 100, 4, "base");

    // The mains plug and its lead into the back of the cradle.
    if (!empty) scene.polyline([[-31, 12, 8], [-42, 12, 5], [-50, 20, 5], [-50, 28, 6]], "muted", { bold: true });
    scene.box(-50, 34, 4, 12, 14, 9, cr);

    // The cradle, with a socket for the cell.
    const BX = -9, BY = -4;
    scene.box(0, 0, 4, 60, 44, 16, cr);
    if (!empty) scene.disc(BX, BY, 20.05, 17.5, "muted");

    // The cell: body, wrapper band and the positive nub, with a level window on its skin.
    const bx = BX + shake, z0 = 6 + up, body: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    scene.cylinder(bx, BY, z0, 15, 46, body);
    scene.cylinder(bx, BY, z0 + 46, 15, 16, body);
    scene.cylinder(bx, BY, z0 + 62, 5, 4, body);
    if (!empty) {
      scene.arc(bx, BY, z0 + 49, 15.05, -Math.PI / 4, (3 * Math.PI) / 4, "faint");
      const w0 = z0 + 18, w1 = z0 + 42, a0 = Math.PI / 4 - 0.95, a1 = Math.PI / 4 + 0.95;
      scene.polyline(skin(bx, BY, 15.05, w0, w1, a0, a1), "faint", { closed: true });
      if (L > 0.03) {
        const top = w0 + (w1 - w0) * L;
        scene.panel(skin(bx, BY, 15.1, w0, top, a0, a1), tone);
        for (let k = 1; k < 4; k++) if (w0 + k * 6 < top - 1) scene.arc(bx, BY, w0 + k * 6, 15.15, a0, a1, tone);
        scene.arc(bx, BY, top, 15.15, a0, a1, tone, { bold: true });
      }
    }

    // The cradle's top in front of the cell, its front and its end hide the seated part.
    const rim: Vec3[] = [];
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 4 + (i / 12) * Math.PI;
      rim.push([BX + 17.5 * Math.cos(a), BY + 17.5 * Math.sin(a), 20]);
    }
    if (!empty) {
      const y1 = BY + 17.5 * Math.sin(-Math.PI / 4);
      scene.panel([...rim, [-30, rim[12]![1], 20], [-30, 22, 20], [30, 22, 20], [30, y1, 20]], "base");
      scene.panel([[-30, 22, 4], [30, 22, 4], [30, 22, 20], [-30, 22, 20]], "base");
      scene.panel([[30, -22, 4], [30, 22, 4], [30, 22, 20], [30, -22, 20]], "base");
      scene.polyline(rim, "muted");
      // Four charge lights on the cradle.
      const lit = state === "error" ? 1 : Math.ceil(L * 4 - 0.02);
      for (let k = 0; k < 4; k++) {
        const on = k < lit;
        scene.disc(10 + k * 6, 14, 20.05, 2.3, on ? tone : "faint", { fill: on });
      }
    }
  },
});

/** A smart speaker with waves. Use for voice assistants, audio output and smart-home devices. */
export const speaker = defineFigure({
  name: "Speaker",
  label: "A smart speaker sending sound waves",
  offset: 10,
  setup: ({ spring }) => ({ plug: spring(0, 110, 13), press: spring(0, 200, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const U = m.plug.to(state === "error" ? 1 : 0).value;
    const press = m.press.to(ctx.hover).value;
    const body: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const X = 6 + shake, Y = -8, R = 26, top = 68;
    scene.box(0, 0, 0, 124, 104, 4, "base");

    // The wall socket and the lead to the speaker.
    scene.box(-50, 30, 4, 8, 18, 24, empty ? "ghost" : "base");
    const plug: Vec3 = [-41 + 11 * U, 30 + 5 * U, 12 - 8 * U];
    if (!empty) {
      scene.polyline([[plug[0] + 4, plug[1], plug[2] + 2], [-22, 26, 4.5], [X - 18, Y + 18, 4.5]], "muted", { bold: true });
      scene.box(plug[0], plug[1], plug[2], 8, 8, 6, state === "error" ? "err" : "base");
    }

    // Ripples across the plate while it plays.
    if (state === "loading") for (let k = 0; k < 3; k++) {
      const q = (ctx.loop(1.6) + k / 3) % 1;
      scene.arc(X, Y, 4.05, R + 6 + 20 * q, -Math.PI / 4, (3 * Math.PI) / 4, "hi", { opacity: 1 - q });
    }
    if (state === "success") for (let k = 0; k < 2; k++) {
      scene.arc(X, Y, 4.05, R + 8 + k * 9, -Math.PI / 4, (3 * Math.PI) / 4, "ok", { opacity: ctx.fade() * (1 - k * 0.35) });
    }

    // The speaker: a foot, a fabric-covered body and a top with a light ring and buttons.
    scene.cylinder(X, Y, 4, R - 1, 5, body);
    scene.cylinder(X, Y, 9, R, top - 9, body);
    if (empty) return;
    for (let z = 18; z < top - 4; z += 8) scene.arc(X, Y, z, R + 0.05, -Math.PI / 4, (3 * Math.PI) / 4, "faint");
    scene.arc(X, Y, 12, R + 0.05, -Math.PI / 4, (3 * Math.PI) / 4, "muted");
    const t = top + 0.05;
    scene.disc(X, Y, t, R - 3, "faint");
    if (state === "loading") {
      const a = ctx.time * 4;
      scene.arc(X, Y, t, R - 3, a, a + 1.3, "hi", { bold: true });
      scene.arc(X, Y, t, R - 3, a + Math.PI, a + Math.PI + 1.3, "hi", { bold: true });
    } else if (state === "success") scene.arc(X, Y, t, R - 3, 0, TAU, "ok", { bold: true });
    else if (state === "error") scene.arc(X, Y, t, R - 3, 0.2, 1.6, "err", { bold: true, opacity: ctx.fade() });
    // Volume, mute and action buttons.
    for (const a of [-2.4, -1.2, 0]) scene.disc(X + 12 * Math.cos(a), Y + 12 * Math.sin(a), t, 2.4, "muted");
    scene.cylinder(X - 3, Y + 3, top, 4.5, 2 - press * 1.5, "base");
  },
});

/** A smartwatch with activity rings closing. Use for wearables, activity and fitness. */
export const watch = defineFigure({
  name: "Watch",
  label: "A smartwatch with activity rings",
  offset: 16,
  setup: ({ spring }) => ({ ring: spring(0.6, 110, 16), crown: spring(0, 180, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let ring = 0.6;
    if (state === "loading") ring = ctx.progress(3);
    if (state === "success") ring = 1;
    if (state === "error") ring = 0.12;
    if (empty) ring = 0;
    const R = clamp(m.ring.to(ring).value, 0, 1);
    const C = m.crown.to(ctx.hover * 2.5).value;
    const tone: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    scene.box(0, 0, 0, 110, 100, 4, "base");

    // The strap loops round behind the case, as on a display stand.
    const sc = -12, sz = 36, SR = 32, X = shake;
    const at = (p: number): [number, number] => [sc + SR * Math.cos(p), sz + SR * Math.sin(p)];
    const run = (from: number, to: number, n: number) => Array.from({ length: n + 1 }, (_, i) => at(from + ((to - from) * i) / n));
    const ribbon = (pts: [number, number][]) => scene.panel([
      ...pts.map(([y, z]) => [X - 13, y, z] as Vec3), ...pts.slice().reverse().map(([y, z]) => [X + 13, y, z] as Vec3),
    ], empty ? "ghost" : "base");
    // Split where the strap turns edge-on, so each run is a clean band: the back and underside first, then over the top.
    ribbon(run((3 * Math.PI) / 4, TAU - Math.PI / 4, 12));
    ribbon([[20, 60], ...run(0.7, (3 * Math.PI) / 4, 8)]);
    ribbon([...run(TAU - Math.PI / 4, TAU - 0.6, 2), [20, 14]]);
    if (!empty) for (let k = 0; k < 4; k++) {
      const [y, z] = at(1.25 + k * 0.17);
      scene.line([X - 1.5, y, z], [X + 1.5, y, z], "muted", { bold: true });
    }

    // The case with its screen, crown and side button.
    const face = slab(scene, X, 25, 38, 25, 30, 9, 10, tone);
    if (empty) return;
    scene.polyline(rounded(X, face + 0.05, 38, 21, 26, 6, 3), "faint", { closed: true });
    const rest: Tone = state === "loading" || state === "idle" ? "muted" : state === "error" ? "faint" : "ok";
    const rings: [number, number, Tone][] = [
      [16, R, state === "loading" ? "hi" : ctx.verdict()],
      [12, R * 0.85, rest],
      [8, Math.min(1, R * 1.1), rest],
    ];
    for (const [r, v, t] of rings) {
      scene.polyline(frontArc(X, face + 0.1, 38, r, 0, TAU, 24), "faint");
      if (v > 0.02) scene.polyline(frontArc(X, face + 0.15, 38, r, Math.PI / 2, Math.PI / 2 - TAU * Math.min(v, 1), Math.max(4, Math.ceil(24 * v))), t, { bold: true });
    }
    for (let k = 0; k < 3; k++) scene.panel(sideOval(X + 25 + k * 1.3 + C * (k / 2), 25, 50, 4, 4, 12), "base");
    scene.box(X + 25.8, 25, 25, 1.6, 6, 11, "base");
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

/** A microphone on a desk stand feeding a level meter. Use for voice recording, transcription and audio input. */
export const mic = defineFigure({
  name: "Mic",
  label: "A microphone picking up sound",
  offset: 20,
  setup: ({ spring }) => ({ level: spring(0.3, 140, 16), drop: spring(0, 120, 12), gain: spring(0, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let lvl = 0.3;
    if (state === "loading") lvl = 0.3 + 0.7 * Math.abs(Math.sin(ctx.time * 5) * Math.sin(ctx.time * 1.7 + 1));
    if (state === "success") lvl = 0.84;
    if (state === "error") lvl = 0.17;
    if (empty) lvl = 0;
    const Lv = clamp(m.level.to(lvl).value, 0, 1);
    const D = m.drop.to(state === "error" ? 17 : 0).value;
    const G = m.gain.to(ctx.hover).value;
    const body: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const accent: Tone = state === "loading" ? "hi" : ctx.verdict("muted");
    scene.box(0, 0, 0, 132, 100, 4, "base");

    // The lead from the interface to the stand.
    if (!empty) scene.polyline([[12, 14, 7], [2, 14, 4.5], [-6, 4, 4.5], [-12, -2, 4.5]], "muted", { bold: true });

    // The stand: a round foot and a pole.
    const MX = -18 + shake, MY = -8, mz = 46 - D;
    scene.cylinder(MX, MY, 4, 18, 4, empty ? "ghost" : "base");
    scene.cylinder(MX, MY, 8, 2.5, 30, empty ? "ghost" : "base");

    // The yoke holds the microphone by two pivots.
    const yoke = [...frontArc(MX, MY, mz + 6, 16, Math.PI, TAU, 12)];
    if (!empty) {
      scene.polyline([[MX - 16, MY, mz + 16], ...yoke, [MX + 16, MY, mz + 16]], "muted", { bold: true });
      scene.panel(sideOval(MX - 15, MY, mz + 15, 3, 3, 10), "base");
    }
    // Body, collar, the grille head and its cap.
    scene.cylinder(MX, MY, mz, 11, 22, body);
    scene.cylinder(MX, MY, mz + 22, 13, 3, body);
    scene.cylinder(MX, MY, mz + 25, 13, 26, body);
    scene.cylinder(MX, MY, mz + 51, 10, 3, body);
    if (empty) return;
    for (let z = mz + 30; z < mz + 50; z += 4.5) scene.arc(MX, MY, z, 13.05, -Math.PI / 4, (3 * Math.PI) / 4, "faint");
    for (const a of [0, Math.PI / 4, Math.PI / 2]) scene.line([MX + 13.05 * Math.cos(a), MY + 13.05 * Math.sin(a), mz + 26], [MX + 13.05 * Math.cos(a), MY + 13.05 * Math.sin(a), mz + 50], "faint");
    scene.arc(MX, MY, mz + 14, 11.05, -Math.PI / 4, (3 * Math.PI) / 4, accent === "muted" ? "faint" : accent, { bold: accent !== "muted" });
    scene.panel(sideOval(MX + 15, MY, mz + 15, 3, 3, 10), "base");

    // The audio interface: a gain knob on top and a level meter on its face.
    const IX = 34, IY = 18;
    scene.box(IX, IY, 4, 46, 28, 14, "base");
    scene.cylinder(IX + 13, IY - 4, 18, 6, 4, "base");
    const g = -0.6 + G * 1.4;
    scene.line([IX + 13, IY - 4, 22.05], [IX + 13 + 5 * Math.cos(g), IY - 4 + 5 * Math.sin(g), 22.05], "muted");
    scene.disc(IX - 6, IY - 6, 18.05, 3, "muted");
    const lit = Math.round(Lv * 6), front = IY + 14;
    for (let k = 0; k < 6; k++) {
      const x = IX - 17 + k * 5.4;
      if (k < lit) scene.box(x, front + 0.8, 8, 3.8, 1.6, 6, state === "error" ? "err" : accent === "muted" ? "base" : accent);
      else scene.rect(x - 1.9, front + 0.05, x + 1.9, front + 0.05, 8, "faint");
      if (k >= lit) scene.line([x - 1.9, front + 0.05, 8], [x - 1.9, front + 0.05, 14], "faint");
    }
    scene.polyline(frontArc(IX + 15, front + 0.05, 11, 3, 0, TAU, 10), "muted");
  },
});

/** A printer with a page sliding out. Use for printing, exports and physical output. */
export const printer = defineFigure({
  name: "Printer",
  label: "A printer with a page sliding out",
  offset: 20,
  setup: ({ spring }) => ({ page: spring(0, 150, 16), fan: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let out = 0;
    if (state === "loading") out = ctx.progress(2.4);
    if (state === "success") out = 1;
    if (state === "error") out = 0.3;
    const P = clamp(m.page.to(out).value, 0, 1.05);
    const fan = m.fan.to(ctx.hover).value;
    const body: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const paper: Tone = state === "loading" ? "hi" : ctx.verdict("base");
    scene.box(0, 0, 0, 140, 104, 4, "base");

    // Paper waiting in the feed at the back.
    if (!empty) for (let k = 0; k < 2; k++) {
      const lean = 14 + k * 3 + fan * 3 * k;
      scene.panel([[-30, -27 + k * 2, 40], [30, -27 + k * 2, 40], [30, -27 + k * 2 - lean, 74 - k * 2], [-30, -27 + k * 2 - lean, 74 - k * 2]], "base");
    }

    // The body, its lid seam and the control panel.
    const X = shake;
    scene.box(X, -10, 4, 100, 50, 36, body);
    if (empty) {
      scene.box(0, 31, 14, 72, 32, 2, "ghost");
      return;
    }
    scene.line([X - 50, -22, 40.05], [X + 50, -22, 40.05], "faint");
    scene.rect(X + 18, 1, X + 42, 11, 40.05, "muted");
    scene.disc(X + 10, 6, 40.05, 2.4, "muted");
    const led: Tone = state === "loading" ? "hi" : ctx.verdict("faint");
    scene.disc(X + 10, -6, 40.05, 2.2, led, { fill: led !== "faint" });
    // The output slot on the face and the tray under it.
    const F = 15.05;
    scene.polyline([[X - 36, F, 20], [X + 36, F, 20], [X + 36, F, 24], [X - 36, F, 24]], "muted", { closed: true });
    scene.box(X, 31, 14, 72, 32, 2, "base");

    if (state === "error") {
      // A jam: the page buckles into folds as it leaves the slot.
      const folds: [number, number][] = [[F, 21], [20, 31], [25, 22], [30, 30], [35, 21], [39, 27]];
      for (let i = 0; i < folds.length - 1; i++) {
        const [y0, z0] = folds[i]!, [y1, z1] = folds[i + 1]!, w = 30 - i;
        scene.panel([[X - w, y0, z0], [X + w, y0, z0], [X + w, y1, z1], [X - w, y1, z1]], "err", ctx.fade(0.2));
      }
      return;
    }
    // The page slides out onto the tray, printed lines appearing as it comes.
    if (P > 0.02) {
      const lead = F + 40 * Math.min(1, P), z = 16;
      scene.box(X, (F + lead) / 2, z, 60, lead - F, 1.2, paper);
      const top = z + 1.25;
      for (let j = 0; j < 5; j++) {
        const y = lead - 6 - j * 6.5;
        if (y < F + 2) break;
        if (j === 0) scene.rect(X - 22, y - 3, X - 6, y + 2, top, paper === "base" ? "muted" : paper);
        else scene.line([X - 22, y, top], [X + (j === 4 ? 4 : 22), y, top], paper === "base" ? "muted" : paper);
      }
    }
  },
});


/** A server rack: blades that light up one at a time. Use for hosting, deploy health and infrastructure. `count`: blades, 3–8. */
export const rack = defineFigure({
  name: "Rack",
  label: "A server rack with blades lighting up",
  offset: 25,
  setup: ({ spring }) => ({ door: spring(1, 110, 15), slide: spring(0, 110, 13) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const n = ctx.count(5, 8, 3);
    const D = m.door.to(state === "success" ? 0 : 1 - ctx.hover * 0.18).value;
    const S = m.slide.to(state === "error" ? 1 : 0).value;
    const cab: Tone = empty ? "ghost" : "base";
    scene.box(12, 0, 0, 124, 92, 4, "base");

    // The cabinet on four feet; its front looks to the lower right.
    const CX = -10, FX = 10, top = 108;
    for (const [fx, fy] of [[CX - 15, -24], [CX - 15, 24], [CX + 15, -24], [CX + 15, 24]] as const) scene.box(fx, fy, 4, 6, 6, 4, cab);
    scene.box(CX, 0, 8, 40, 58, 100, cab);
    if (empty) {
      for (let k = 0; k < n; k++) scene.polyline([[FX + 0.05, 22, 14 + k * (88 / n)], [FX + 0.05, -22, 14 + k * (88 / n)]], "ghost");
      return;
    }
    for (let k = 0; k < 3; k++) scene.line([CX - 12 + k * 6, -20, top + 0.05], [CX - 12 + k * 6, 20, top + 0.05], "faint");
    // Mounting rails either side of the blades.
    scene.box(FX + 1, 26, 10, 2, 4, 96, "base");
    scene.box(FX + 1, -26, 10, 2, 4, 96, "base");

    // The blades, each with a status light, a vent and drive bays.
    const h = 88 / n, bad = Math.floor(n / 2);
    const active = state === "loading" ? Math.min(n - 1, Math.floor(ctx.loop(1.6) * n)) : -1;
    const blade = (k: number) => {
      const z = 14 + k * h, uh = h - 2, out = k === bad ? S * 22 : 0;
      const broken = state === "error" && k === bad;
      const tone: Tone = broken ? "err" : k === active ? "hi" : state === "success" ? "ok" : "base";
      scene.box(FX + (3 + out) / 2 + (broken ? shake * 0.4 : 0), 0, z, 3 + out, 48, uh, tone);
      const xf = FX + 3 + out + 0.05;
      const light: Tone = broken ? "err" : k === active ? "hi" : state === "success" ? "ok" : state === "loading" ? "faint" : "muted";
      scene.polyline(sideOval(xf, 17, z + uh / 2, 1.6, 1.6, 8), light, { bold: light !== "faint" && light !== "muted" });
      scene.line([xf, 11, z + uh / 2], [xf, 1, z + uh / 2], "faint");
      for (let j = 0; j < 3; j++) {
        const y0 = -5 - j * 6;
        scene.polyline([[xf, y0, z + 1.5], [xf, y0 - 4, z + 1.5], [xf, y0 - 4, z + uh - 1.5], [xf, y0, z + uh - 1.5]], "faint", { closed: true });
      }
    };
    for (let k = 0; k < n; k++) if (k !== bad) blade(k);
    blade(bad);

    // A glass door on hinges at the right edge: open until the work is done.
    const th = D * 1.25, dz0 = 10, dz1 = 106;
    const door = (s: number, z: number): Vec3 => [FX + 4 + s * Math.sin(th), -29 + s * Math.cos(th), z];
    const tone: Tone = state === "success" ? "ok" : "base";
    scene.polyline([door(0, dz0), door(58, dz0), door(58, dz1), door(0, dz1)], tone, { closed: true, bold: state === "success" });
    scene.polyline([door(4, dz0 + 4), door(54, dz0 + 4), door(54, dz1 - 4), door(4, dz1 - 4)], "faint", { closed: true });
    scene.line(door(51, 52), door(51, 66), tone, { bold: true });
  },
});

/** A satellite dish pointing at a signal. Use for connectivity, reconnecting and global coverage. */
export const satellite = defineFigure({
  name: "Satellite",
  label: "A dish locking onto a signal",
  offset: 22,
  setup: ({ spring }) => ({ aim: spring(0, 120, 16), droop: spring(0, 80, 11) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(0);
    const empty = state === "empty";
    let aim = 0;
    if (state === "idle" && ctx.pointer.over > 0.2) aim = clamp(g.x / 60, -0.6, 0.6);
    if (state === "loading") aim = 0.6 * Math.sin(ctx.time * 1.4);
    if (state === "success") aim = 0;
    const A = m.aim.to(aim).value, Dr = m.droop.to(state === "error" ? 1 : 0).value;
    const mast: Tone = empty ? "ghost" : "base";
    const verdict: Tone = state === "loading" ? "hi" : ctx.verdict("muted");
    scene.box(6, 0, 0, 132, 96, 4, "base");

    // The receiver with its signal bars, and the lead to the mast.
    const RX = 34, RY = 24;
    if (!empty) scene.polyline([[RX - 20, RY, 7], [RX - 30, RY, 4.5], [-6, 2, 4.5], [-10, -2, 6]], "muted", { bold: true });
    scene.box(RX, RY, 4, 40, 24, 9, mast);
    if (!empty) {
      const lit = state === "loading" ? Math.floor(ctx.loop(1.6) * 5) : state === "success" ? 4 : state === "error" ? 1 : 2;
      for (let k = 0; k < 4; k++) {
        const on = k < lit;
        scene.box(RX - 12 + k * 8, RY - 2, 13, 4.5, 4.5, 4 + k * 4, on ? (state === "error" ? "err" : verdict === "muted" ? "base" : verdict) : "faint");
      }
      scene.line([RX - 14, RY + 12.05, 9], [RX - 4, RY + 12.05, 9], "faint");
    }

    // The mast: a weighted foot, a pole and a clamp.
    const PX = -18, PY = -10;
    scene.box(PX, PY, 4, 26, 26, 5, mast);
    scene.cylinder(PX, PY, 9, 3, 44, mast);
    scene.box(PX, PY, 53, 8, 8, 6, mast);

    // The dish: a deep rim with rings, a feed arm and struts holding the receiver head at its focus.
    const az = -0.2 + A + Dr * 0.5, el = 0.3 - Dr * 0.75;
    const n: Vec3 = [Math.cos(el) * Math.cos(az), Math.cos(el) * Math.sin(az), Math.sin(el)];
    const u: Vec3 = [-Math.sin(az), Math.cos(az), 0];
    const v: Vec3 = [-Math.sin(el) * Math.cos(az), -Math.sin(el) * Math.sin(az), Math.cos(el)];
    const c: Vec3 = [PX + shake + n[0] * 8, PY + n[1] * 8, 60 + n[2] * 8];
    const at = (k: number, t: number, r: number): Vec3 => [
      c[0] + n[0] * k + (u[0] * Math.cos(t) + v[0] * Math.sin(t)) * r,
      c[1] + n[1] * k + (u[1] * Math.cos(t) + v[1] * Math.sin(t)) * r,
      c[2] + n[2] * k + (u[2] * Math.cos(t) + v[2] * Math.sin(t)) * r,
    ];
    const ring = (k: number, r: number, steps = 28) => Array.from({ length: steps + 1 }, (_, i) => at(k, (i / steps) * TAU, r));
    const dish: Tone = empty ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    if (!empty) scene.line([PX, PY, 59], at(-6, 0, 0), "base", { bold: true });
    scene.panel(ring(-4, 27), dish);
    scene.panel(ring(0, 30), dish);
    if (empty) return;
    scene.polyline(ring(-2, 20, 24), "faint");
    scene.polyline(ring(-3.5, 10, 16), "faint");
    const F = at(26, 0, 0);
    scene.line(at(0, -Math.PI / 2, 30), F, "muted", { bold: true });
    scene.line(at(0, 0.2, 30), F, "faint");
    scene.line(at(0, Math.PI - 0.2, 30), F, "faint");
    scene.box(F[0], F[1], F[2] - 4, 6, 6, 8, state === "idle" ? "base" : verdict);
  },
});

/** A laptop and a phone with arrows turning between them. Use for push notifications and background sync. */
export const sync = defineFigure({
  name: "Sync",
  label: "A laptop and a phone syncing",
  offset: 18,
  setup: ({ spring }) => ({ turn: spring(0), row: spring(0, 140, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const a = state === "loading" ? ctx.time * 2.4 : state === "success" ? 0 : state === "error" ? 0.4 : 0.5 + ctx.hover * 0.3;
    const T = m.turn.to(a).value;
    const R = clamp(m.row.to(state === "success" || state === "loading" ? 1 : 0).value, 0, 1);
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    const newRow: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : "muted";
    scene.box(2, 4, 0, 144, 104, 4, "base");

    // The laptop: deck with keyboard and trackpad, and the lid tilted back.
    const LX = -26, LY = -16, lt = 0.2, hingeY = LY - 22;
    scene.box(LX, LY, 4, 66, 44, 4, empty ? "ghost" : "base");
    const lid = (x: number, t: number, k = 0): Vec3 => [LX + x, hingeY - t * Math.sin(lt) + k * Math.cos(lt), 8 + t * Math.cos(lt) + k * Math.sin(lt)];
    if (!empty) {
      scene.rect(LX - 28, LY - 17, LX + 28, LY + 3, 8.05, "faint");
      for (let k = 1; k < 4; k++) scene.line([LX - 24, LY - 17 + k * 5, 8.05], [LX + 24, LY - 17 + k * 5, 8.05], "faint");
      scene.rect(LX - 10, LY + 8, LX + 10, LY + 18, 8.05, "faint");
      scene.panel([lid(-33, 0, -2.5), lid(33, 0, -2.5), lid(33, 46, -2.5), lid(-33, 46, -2.5)], "base");
    }
    scene.panel([lid(-33, 0), lid(33, 0), lid(33, 46), lid(-33, 46)], empty ? "ghost" : "base");
    if (!empty) {
      scene.polyline([lid(-29, 4, 0.05), lid(29, 4, 0.05), lid(29, 42, 0.05), lid(-29, 42, 0.05)], "faint", { closed: true });
      for (let j = 0; j < 3; j++) {
        const t = 34 - j * 10, rt: Tone = j === 2 ? newRow : "muted";
        scene.polyline([lid(-23, t - 3, 0.1), lid(-17, t - 3, 0.1), lid(-17, t + 3, 0.1), lid(-23, t + 3, 0.1)], rt, { closed: true });
        scene.line(lid(-12, t, 0.1), lid(j === 2 ? 6 : 16, t, 0.1), rt, { bold: j === 2 && state !== "idle" });
      }
    }

    // The phone lying on the plate, its list catching up with the laptop's.
    const PX = 36, PY = 18;
    scene.box(PX, PY, 4, 26, 48, 4, empty ? "ghost" : "base");
    if (!empty) {
      scene.rect(PX - 10.5, PY - 20, PX + 10.5, PY + 19, 8.05, "faint");
      for (let j = 0; j < 3; j++) {
        const y = PY - 12 + j * 10, last = j === 2;
        if (last && R < 0.05 && state !== "error") continue;
        const rt: Tone = last ? (state === "error" ? "err" : newRow) : "muted";
        const op = last && state !== "error" ? R : undefined;
        scene.rect(PX - 8, y - 3, PX - 3, y + 3, 8.1, rt, op);
        scene.line([PX, y, 8.1], [PX + (last ? 4 : 8), y, 8.1], rt, { opacity: op, bold: last && state !== "idle" });
      }
    }

    // Two arrows chasing round a ring on the plate between them.
    const RX = -20 + shake, RY = 32;
    const arrow = (t0: number) => {
      const pts: Vec3[] = [];
      for (let i = 0; i <= 10; i++) { const q = t0 + (i / 10) * 2.1; pts.push([RX + 11 * Math.cos(q), RY + 11 * Math.sin(q), 4.1]); }
      const t1 = t0 + 2.1;
      pts.push([RX + 7 * Math.cos(t1), RY + 7 * Math.sin(t1), 4.1]);
      pts.push([RX + 13.5 * Math.cos(t1 + 0.55), RY + 13.5 * Math.sin(t1 + 0.55), 4.1]);
      pts.push([RX + 20 * Math.cos(t1), RY + 20 * Math.sin(t1), 4.1]);
      for (let i = 10; i >= 0; i--) { const q = t0 + (i / 10) * 2.1; pts.push([RX + 16 * Math.cos(q), RY + 16 * Math.sin(q), 4.1]); }
      scene.panel(pts, tone);
    };
    arrow(T);
    if (state !== "error") arrow(T + Math.PI);
    else scene.panel([0, 1, 2].map(i => [RX + 16 * Math.cos(T + Math.PI + 1.4 + i * 0.25), RY + 16 * Math.sin(T + Math.PI + 1.4 + i * 0.25), 4.1] as Vec3)
      .concat([2, 1, 0].map(i => [RX + 11 * Math.cos(T + Math.PI + 1.4 + i * 0.25), RY + 11 * Math.sin(T + Math.PI + 1.4 + i * 0.25), 4.1] as Vec3)), "err", ctx.fade());
  },
});

/** A box drawn through a transform: its front, right side and top. */
function tbox(scene: Scene, f: (p: Vec3) => Vec3, cx: number, cy: number, z: number, w: number, d: number, h: number, tone: Tone): void {
  const a = cx - w / 2, b = cx + w / 2, c = cy - d / 2, e = cy + d / 2, t = z + h;
  const P = (x: number, y: number, zz: number) => f([x, y, zz]);
  scene.panel([P(a, e, z), P(b, e, z), P(b, e, t), P(a, e, t)], tone);
  scene.panel([P(b, c, z), P(b, e, z), P(b, e, t), P(b, c, t)], tone);
  scene.panel([P(a, c, t), P(b, c, t), P(b, e, t), P(a, e, t)], tone);
}

/** A chip being inserted into a board. Use for hardware setup, integrations and dev kits. */
export const chip = defineFigure({
  name: "Chip",
  label: "A chip seating into a board",
  offset: 14,
  setup: ({ spring }) => ({ seat: spring(40, 160, 18), lever: spring(1.35, 140, 16), tilt: spring(0, 120, 12) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    let z = 40;
    if (state === "loading") z = 40 - 29 * smoothstep(ctx.loop(2));
    if (state === "success" || state === "error") z = 11;
    if (state === "idle") z = 40 - ctx.hover * 8;
    const Z = m.seat.to(z).value;
    const Lv = m.lever.to(state === "success" ? 0 : 1.35).value;
    const Tl = m.tilt.to(state === "error" ? 1 : 0).value;
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    const board: Tone = empty ? "ghost" : "base";
    scene.box(0, 0, 0, 130, 100, 4, "base");

    // The board: traces, capacitors and two memory slots.
    scene.box(0, 0, 4, 116, 88, 3, board);
    const SX = -10, SY = 2;
    if (!empty) {
      for (const [x0, y0, x1, y1] of [[-34, -20, -48, -34], [-34, 10, -50, 10], [SX - 6, -21, SX - 6, -40], [SX + 6, 25, SX + 6, 40]] as const) {
        scene.polyline([[x0, y0, 7.05], [x0, y1 === y0 ? y0 : (y0 + y1) / 2, 7.05], [x1, y1, 7.05]], "faint");
      }
      for (const [x, y] of [[-46, -30], [-46, 22], [-38, 30]] as const) scene.cylinder(x, y, 7, 3, 6, "base");
      scene.box(38, 0, 7, 4, 76, 5, "base");
      scene.box(46, 0, 7, 4, 76, 5, "base");
    }

    // The socket with its pin field.
    scene.box(SX, SY, 7, 46, 46, 4, board);
    if (!empty) {
      scene.rect(SX - 19, SY - 19, SX + 19, SY + 19, 11.05, "muted");
      for (let k = 1; k < 5; k++) {
        const q = -19 + k * 7.6;
        scene.line([SX + q, SY - 17, 11.05], [SX + q, SY + 17, 11.05], "faint");
        scene.line([SX - 17, SY + q, 11.05], [SX + 17, SY + q, 11.05], "faint");
      }
    }

    // The retention lever along the socket's side, hinged at the back: up while open, down once seated.
    const lever = () => {
      if (empty) return;
      const hx = SX + 27, hy = SY - 22;
      const end: Vec3 = [hx, hy + 42 * Math.cos(Lv), 10 + 42 * Math.sin(Lv)];
      const lt: Tone = state === "success" ? "ok" : state === "error" ? "err" : "base";
      scene.cylinder(hx, hy, 7, 2.5, 4, "base");
      scene.line([hx, hy, 10], end, lt, { bold: true });
      scene.line(end, [end[0] + 5, end[1], end[2]], lt, { bold: true });
    };
    if (Lv > 0.7) lever();

    // The chip: substrate, heat spreader and the corner mark; on error it lands crooked and tilted.
    const cx = SX + Tl * 7 + shake, cy = SY;
    const f = tip(cy - 20, Z, -0.32 * Tl);
    tbox(scene, f, cx, cy, Z, 40, 40, 3, tone);
    tbox(scene, f, cx, cy, Z + 3, 28, 28, 3, tone);
    if (!empty) scene.polyline([f([cx - 18, cy + 12, Z + 3.05]), f([cx - 18, cy + 18, Z + 3.05]), f([cx - 12, cy + 18, Z + 3.05])], tone === "base" ? "muted" : tone, { closed: true });
    if (Lv <= 0.7) lever();
  },
});

/** A mouse and cursor clicking. Use for click-through tutorials, demos and interactive guides. */
export const cursor = defineFigure({
  name: "Cursor",
  label: "A cursor clicking a button",
  offset: 22,
  setup: ({ spring }) => ({ press: spring(0, 220, 16), au: spring(22, 140, 16), az: spring(68, 140, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const pressed = state === "loading" ? (ctx.loop(1.2) < 0.2 ? 1 : 0) : state === "success" ? 1 : 0;
    const P = m.press.to(pressed).value;
    // Where the pointer's tip rests on the screen: beside the button, on it, or off in the text on error.
    const [tu0, tz0] = state === "error" ? [-14, 72] : state === "idle" ? [lerp(22, 13, ctx.hover * 0.6), lerp(68, 57, ctx.hover * 0.6)] : [13, 57];
    const tu = m.au.to(tu0).value, tz = m.az.to(tz0).value;
    const btn: Tone = state === "loading" ? "hi" : ctx.verdict();
    scene.box(4, 0, 0, 140, 100, 4, "base");

    // The monitor: foot, neck and screen.
    const MX = -16, MY = -24;
    const mon: Tone = empty ? "ghost" : "base";
    scene.box(MX, MY, 4, 34, 22, 3, mon);
    scene.box(MX, MY - 3, 7, 8, 5, 28, mon);
    const face = slab(scene, MX, MY, 62, 42, 27, 4, 6, mon);
    const on = (u: number, z: number, d = 0.05): Vec3 => [MX + u, face + d, z];
    if (!empty) {
      scene.polyline(rounded(MX, face + 0.05, 62, 38, 23, 2, 1), "faint", { closed: true });
      // A dialog with a title bar, two lines of text and a button.
      scene.polyline([on(-27, 48), on(27, 48), on(27, 82), on(-27, 82)], "muted", { closed: true });
      scene.line(on(-27, 77), on(27, 77), "muted");
      scene.line(on(-21, 71), on(12, 71), "muted");
      scene.line(on(-21, 66), on(2, 66), "faint");
      const bx = MX + 10 + (state === "error" ? shake * 0.6 : 0), depth = 3.5 - 2.5 * P;
      scene.box(bx, face + depth / 2, 51, 26, depth, 11, btn);
      scene.line([bx - 7, face + depth + 0.05, 56.5], [bx + 7, face + depth + 0.05, 56.5], btn === "base" ? "muted" : btn);
      // The pointer stands in front of the screen with its tip on the button (or beside it, on error).
      const ay = face + 6;
      const arrow: [number, number][] = [[0, 0], [0, -14], [3.5, -10.5], [6, -16], [8.5, -15], [6, -9.5], [10.5, -9.5]];
      scene.panel(arrow.map(([du, dz]) => [MX + tu + du * 1.3, ay, tz + dz * 1.3] as Vec3), state === "error" ? "err" : "base");
    }

    // The mouse pad, the lead, and the mouse with two buttons and a wheel.
    const CX = 38, CY = 26;
    scene.box(CX, CY, 4, 62, 48, 1.5, empty ? "ghost" : "base");
    if (!empty) scene.polyline([[CX, CY - 21, 6], [CX, CY - 28, 5], [CX - 10, CY - 36, 4.5], [MX + 18, MY + 4, 4.5]], "muted", { bold: true });
    const ell = (z: number, rx: number, ry: number, dy: number, a0: number, a1: number, steps: number) =>
      Array.from({ length: steps + 1 }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / steps;
        return [CX + rx * Math.cos(a), CY + dy + ry * Math.sin(a), z] as Vec3;
      });
    const shell: Tone = empty ? "ghost" : "base";
    const lo = 5.5, hi = 19;
    scene.panel([...ell(lo, 14, 22, 0, -Math.PI / 4, (3 * Math.PI) / 4, 12), ...ell(hi, 10.5, 17, 3, (3 * Math.PI) / 4, -Math.PI / 4, 12)], shell);
    scene.panel(ell(hi, 10.5, 17, 3, 0, TAU, 24), shell);
    if (empty) return;
    // Its left button (toward x+) dips with each click.
    const press = P * 1.6;
    scene.panel([[CX, CY - 14, hi - press], ...ell(hi - press, 10.5, 17, 3, -Math.PI / 2, -0.15, 6), [CX, CY + 0.5, hi - press]], btn);
    scene.line([CX, CY - 14, hi], [CX, CY + 0.5, hi], "muted");
    scene.line([CX - 10.4, CY + 0.5, hi], [CX + 10.4, CY + 0.5, hi], "muted");
    scene.box(CX, CY - 7, hi, 3, 6, 2, "muted");
  },
});
