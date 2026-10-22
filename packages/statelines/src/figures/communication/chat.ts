import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { frontArc } from "../shapes";

type UZ = [number, number];

/** A rounded rectangle on the vertical plane y, centred on (cx, cz): clockwise from the top-right corner. */
function rounded(cx: number, y: number, cz: number, a: number, b: number, r: number, steps = 4): Vec3[] {
  const out: Vec3[] = [];
  const corners: UZ[] = [[cx + a - r, cz + b - r], [cx + a - r, cz - b + r], [cx - a + r, cz - b + r], [cx - a + r, cz + b - r]];
  corners.forEach(([x, z], k) => {
    for (let i = 0; i <= steps; i++) {
      const t = Math.PI / 2 - (Math.PI / 2) * (k + i / steps);
      out.push([x + r * Math.cos(t), y, z + r * Math.sin(t)]);
    }
  });
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
  // The band above and to the right of the face: from the top-left corner round to the bottom-right one.
  const idx = [15, 16, 17, 18, 19, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  scene.panel([...idx.map(i => back[i]!), ...idx.slice().reverse().map(i => front[i]!)], tone);
  scene.panel(front, tone);
  return face;
}

/** A speech bubble in (u, z), clockwise from the top: rounded corners, with a tail at the bottom on `side`. */
function bubble(u0: number, u1: number, z0: number, h: number, side: -1 | 1): UZ[] {
  const z1 = z0 + h, r = 4, pts: UZ[] = [];
  const arc = (cu: number, cz: number, a0: number) => {
    for (let i = 0; i <= 3; i++) {
      const a = a0 - (Math.PI / 2) * (i / 3);
      pts.push([cu + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  };
  arc(u1 - r, z1 - r, Math.PI / 2);
  if (side === 1) pts.push([u1, z0 + 4], [u1 + 3.5, z0 - 2.5], [u1 - 7, z0]);
  else arc(u1 - r, z0 + r, 0);
  if (side === -1) pts.push([u0 + 7, z0], [u0 - 3.5, z0 - 2.5], [u0, z0 + 4]);
  else arc(u0 + r, z0 + r, -Math.PI / 2);
  arc(u0 + r, z1 - r, Math.PI);
  return pts;
}

const PHONE = { a: 40, b: 68, r: 11, d: 8 };
const CZ = 4 + PHONE.b;
const TOP = 4 + PHONE.b * 2;
/** Where a bubble's bottom sits for each slot, counted up from the input bar. */
const slotZ = (s: number) => 36 + s * 19;
const H = 13;
/** The conversation, oldest first: who sent it (-1 them, 1 me) and its extent across the screen. */
const THREAD = [
  { side: -1, u0: -20, u1: 10 },
  { side: 1, u0: -2, u1: 30 },
  { side: -1, u0: -20, u1: 16 },
  { side: 1, u0: 6, u1: 30 },
] as const;
const NEW = { side: 1, u0: -8, u1: 30 } as const;
const TYPING = { side: -1, u0: -20, u1: 0 } as const;

/** A conversation on a phone. Use for chat, comments, support and assistant replies. */
export const chat = /*#__PURE__*/ defineFigure({
  name: "Chat",
  label: "A messaging app on a phone",
  offset: 26,
  setup: ({ spring }) => ({
    scroll: spring(0, 120, 18),
    fresh: spring(0, 150, 16),
    pop: spring(0, 180, 16),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const body: Tone = empty ? "ghost" : "base";

    scene.box(0, 0, 0, 124, 60, 4, "base");
    // The side button, then the phone itself: rounded body, screen edge, the camera island.
    if (!empty) scene.box(PHONE.a + 1, 0, 98, 2, 4, 16, "base");
    const face = slab(scene, 0, 0, CZ, PHONE.a, PHONE.b, PHONE.r, PHONE.d, body);
    const on = (u: number, z: number, d = 0.05): Vec3 => [u, face + d, z];
    const disc = (u: number, z: number, r: number, tone: Tone, d = 0.1) =>
      scene.panel(frontArc(u, face + d, z, r, 0, Math.PI * 2, 14), tone);

    if (empty) {
      scene.panel(bubble(-20, 10, slotZ(1), H, -1).map(([u, z]) => on(u, z)), "ghost");
      scene.panel(rounded(-4, face + 0.1, 22, 28, 5, 5), "ghost");
      return;
    }
    scene.polyline(rounded(0, face + 0.05, CZ, PHONE.a - 4, PHONE.b - 4, PHONE.r - 3), "faint", { closed: true });
    scene.panel(rounded(0, face + 0.1, TOP - 9, 8, 2.6, 2.6, 2), "muted");

    // The header: the other person's avatar and name above a divider.
    disc(-24, 119, 5.5, "base");
    scene.line(on(-15, 121), on(6, 121), "muted", { bold: true });
    scene.line(on(-15, 116.5), on(-4, 116.5), "faint");
    scene.line(on(-36, 109), on(36, 109), "faint");

    // The input bar and its send button.
    const failed = state === "error";
    scene.panel(rounded(-5, face + 0.1, 22, 27, 5.5, 5.5), "faint");
    scene.line(on(-26, 22, 0.15), on(-14, 22, 0.15), "faint");
    disc(29, 22, 5.5, failed ? "err" : "base");
    scene.polyline([on(26.5, 21.5, 0.2), on(29, 24.5, 0.2), on(31.5, 21.5, 0.2)], failed ? "err" : "muted");
    scene.line(on(29, 19, 0.2), on(29, 24.5, 0.2), failed ? "err" : "muted");

    // Older messages scroll up one slot when a new one arrives and fade under the header.
    const S = m.scroll.to(state === "idle" ? 0 : 1).value;
    const F = clamp(m.fresh.to(state === "idle" ? 0 : 1).value, 0, 1.2);
    const pop = m.pop.to(state === "idle" ? ctx.hover : 0).value;
    const draw = (msg: { side: -1 | 1; u0: number; u1: number }, z0: number, tone: Tone, depth: number,
                  opacity = 1, tilt = 0, du = 0) => {
      if (opacity < 0.02) return;
      const pu = msg.side === 1 ? msg.u1 : msg.u0, c = Math.cos(tilt), s = Math.sin(tilt);
      const at = ([u, z]: UZ, d: number): Vec3 => {
        const x = u - pu, y = z - z0;
        return on(pu + x * c - y * s + du, z0 + x * s + y * c, d);
      };
      const pts = bubble(msg.u0, msg.u1, z0, H, msg.side);
      scene.panel(pts.map(p => at(p, 0.1)), tone, opacity);
      scene.panel(pts.map(p => at(p, depth)), tone, opacity);
      if (msg.side === -1) disc(-30 + du, z0 + 3, 3.6, "base");
      return (u0: number, u1: number, lt: Tone = "muted") =>
        scene.line(at([u0, z0 + H / 2], depth + 0.05), at([u1, z0 + H / 2], depth + 0.05), lt, { opacity });
    };

    THREAD.forEach((msg, k) => {
      const pos = 3 - k + S;
      const opacity = 1 - clamp(pos - 3);
      const last = k === THREAD.length - 1;
      const text = draw(msg, slotZ(pos), "base", last ? 3 + pop * 3 : 3, opacity);
      text?.(msg.u0 + 5, msg.u1 - 8);
    });

    if (F < 0.02) return;
    if (state === "loading") {
      // They are typing: the dots light one after another.
      draw(TYPING, slotZ(0) - (1 - F) * 8, "hi", 3 * F, clamp(F));
      const front = face + 3 * F + 0.1, active = Math.floor(ctx.time * 5) % 3;
      for (let i = 0; i < 3; i++) {
        scene.panel(frontArc(-14 + i * 6, front, slotZ(0) + H / 2, 1.8, 0, Math.PI * 2, 8), i === active ? "hi" : "muted");
      }
      return;
    }
    // Sent: the new bubble rises out of the input bar into the thread. Failed: it hangs crooked, short of its place.
    const tone = ctx.verdict();
    const z0 = failed ? slotZ(0) - 3 * F : slotZ(0) - (1 - F) * 16;
    const text = draw(NEW, z0, tone, 3 * F, clamp(F), failed ? -0.12 * F : 0, failed ? shake - 7 * F : 0);
    text?.(NEW.u0 + 5, NEW.u1 - 8, tone);
  },
});
