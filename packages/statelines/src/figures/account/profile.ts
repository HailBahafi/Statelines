import { defineFigure } from "../../core/define";
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


const CARD = { a: 44, b: 57, d: 5, r: 7 };
const ZB = 9;
const ZT = ZB + CARD.b * 2;
const CZ = ZB + CARD.b;
/** The avatar's centre on the card face, overlapping the bottom of the cover photo. */
const AV = { u: -20, z: ZT - 40, r: 13 };

/** A profile card with an avatar. Use for onboarding, account setup and profile photos. */
export const profile = defineFigure({
  name: "Profile",
  label: "A profile card: cover photo, avatar, name, stats and a follow button",
  offset: 26,
  setup: ({ spring }) => ({ pop: spring(0), drop: spring(0, 110, 13), ring: spring(0, 90, 18), press: spring(0, 200, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const card: Tone = empty ? "ghost" : "base";

    scene.box(0, 0, 0, 132, 66, 4, "base");
    // The card stands in a slotted foot.
    scene.box(0, -1, 4, 104, 14, 6, card);
    const face = slab(scene, 0, 0, CZ, CARD.a, CARD.b, CARD.r, CARD.d, card);
    const on = (u: number, z: number, d = 0.05): Vec3 => [u, face + d, z];
    scene.box(0, face + 2, 4, 104, 4, 8, card);
    if (empty) {
      scene.panel(frontArc(AV.u, face + 0.1, AV.z, AV.r, 0, Math.PI * 2, 20), "ghost");
      return;
    }

    // The cover photo across the top: hills and a sun.
    const top = ZT - 4, low = ZT - 40;
    scene.panel([on(-CARD.a + 4, top, 0.1), on(CARD.a - 4, top, 0.1), on(CARD.a - 4, low, 0.1), on(-CARD.a + 4, low, 0.1)], "base");
    scene.polyline([on(-CARD.a + 4, low + 8), on(-14, low + 22), on(0, low + 12), on(14, low + 26), on(CARD.a - 4, low + 10)], "muted");
    scene.panel(frontArc(24, face + 0.15, top - 9, 3.6, 0, Math.PI * 2, 10), "muted");

    // Name and handle beside the avatar, a short bio, the stats row.
    scene.line(on(-2, ZT - 47), on(30, ZT - 47), "base", { bold: true });
    scene.line(on(-2, ZT - 53), on(16, ZT - 53), "faint");
    scene.line(on(-36, ZT - 64), on(34, ZT - 64), "muted");
    scene.line(on(-36, ZT - 70), on(18, ZT - 70), "muted");
    for (let i = 0; i < 3; i++) {
      const u = -26 + i * 26;
      scene.line(on(u - 6, ZT - 79), on(u + 6, ZT - 79), "base", { bold: true });
      scene.line(on(u - 8, ZT - 85), on(u + 8, ZT - 87), "faint");
      if (i) scene.line(on(u - 13, ZT - 77), on(u - 13, ZT - 87), "faint");
    }

    // The follow button; it presses flush and turns green once the profile is saved.
    const press = m.press.to(state === "success" ? 1 : 0).value;
    const btn: Tone = state === "success" ? "ok" : "base";
    const depth = 3 - 2.5 * press;
    scene.panel(rounded(0, face + 0.1, ZB + 19, 24, 5.5, 5.5, 3), btn);
    scene.panel(rounded(0, face + depth, ZB + 19, 24, 5.5, 5.5, 3), btn);
    scene.line(on(-9, ZB + 19, depth + 0.05), on(9, ZB + 19, depth + 0.05), btn === "base" ? "muted" : btn, { bold: true });

    // The ring round the avatar fills as the photo uploads.
    const R = m.ring.to(state === "success" ? 1 : state === "error" ? 0.6 : 0).value;
    const ringAt = (a0: number, a1: number, tone: Tone) =>
      scene.polyline(frontArc(AV.u, face + 0.3, AV.z, AV.r + 3.5, a0, a1, 28), tone, { bold: true });
    scene.polyline(frontArc(AV.u, face + 0.2, AV.z, AV.r + 3.5, 0, Math.PI * 2, 28), "faint");
    if (state === "loading") {
      const t = -ctx.time * 4;
      ringAt(t, t + 2.2, "hi");
    } else if (R > 0.01 && (state === "success" || state === "error")) {
      ringAt(Math.PI / 2, Math.PI / 2 - Math.PI * 2 * Math.min(1, R), ctx.verdict());
    }

    // The avatar: a round photo standing proud of the card with a head and shoulders in it.
    // On error it drops out of its place and lies crooked against the bio.
    const D = Math.min(1.15, m.drop.to(state === "error" ? 1 : 0).value);
    const pop = m.pop.to(state === "idle" ? ctx.hover : state === "success" ? 0.6 : 0).value;
    const who: Tone = state === "loading" ? "muted" : ctx.verdict();
    const au = AV.u + D * 10 + shake, az = AV.z - D * 26, out = 3 + pop * 4;
    if (D > 0.05) scene.polyline(frontArc(AV.u, face + 0.25, AV.z, AV.r, 0, Math.PI * 2, 20), "faint");
    const disc = (d: number) => scene.panel(frontArc(au, face + d, az, AV.r, 0, Math.PI * 2, 24), who);
    disc(0.4);
    disc(out);
    const f = face + out + 0.05, tilt = D * 0.5;
    scene.panel(frontArc(au + Math.sin(tilt) * 4, f, az + 3.5, 4.4, 0, Math.PI * 2, 12), who === "base" ? "muted" : who);
    scene.polyline(frontArc(au - Math.sin(tilt) * 4, f, az - 9, 8, Math.PI * 0.12, Math.PI * 0.88, 10), who === "base" ? "muted" : who);
  },
});
