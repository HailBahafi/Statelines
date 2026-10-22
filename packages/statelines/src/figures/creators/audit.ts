import { defineFigure } from "../../core/define";
import { bump, clamp, lerp, smoothstep, wrap } from "../../engine/math";
import type { Scene, Tone, Vec3 } from "../../engine/scene";
import { faceArc, facing, frontArc } from "../shapes";

/** Profile cards ride a belt past a magnifier on a stand; fakes are flicked into a bin in front. */
const BELT_Y = -12;
const BELT_Z = 9;
const SPAN = 168;
const N = 6;
const FAKES = new Set([1, 4]);
const CARD = { w: 22, d: 3, h: 30 };
const LENS: Vec3 = [12, 4, 34];
const BIN = { x: 60, y: 28, w: 32, d: 24, h: 14 };

type Card = { x: number; y: number; z: number; fake: boolean; tone: Tone; opacity?: number };

/** An upright profile card: a person's avatar, or a bot's square head with an antenna. */
function card(scene: Scene, c: Card) {
  const { x, y, z, fake, tone, opacity } = c;
  scene.box(x, y, z, CARD.w, CARD.d, CARD.h, tone, opacity);
  if (tone === "ghost") return;
  const f = y + CARD.d / 2 + 0.05, ink: Tone = tone === "base" ? "muted" : tone;
  if (fake) {
    scene.polyline([[x - 6, f, z + 8], [x + 6, f, z + 8], [x + 6, f, z + 18], [x - 6, f, z + 18]], ink, { closed: true, opacity });
    scene.polyline([[x, f, z + 18], [x, f, z + 22], [x + 2, f, z + 23]], ink, { opacity });
    scene.line([x - 3.5, f, z + 13], [x - 1.5, f, z + 13], ink, { bold: true, opacity });
    scene.line([x + 1.5, f, z + 13], [x + 3.5, f, z + 13], ink, { bold: true, opacity });
  } else {
    scene.polyline(frontArc(x, f, z + 17, 4, 0, Math.PI * 2, 12), ink, { opacity });
    scene.polyline(frontArc(x, f, z + 5, 7, 0, Math.PI, 8), ink, { opacity });
  }
}

/** Followers pass a scanner and the fake ones drop away. Use for audience audits, fake follower checks and fraud. */
export const audit = /*#__PURE__*/ defineFigure({
  name: "Audit",
  label: "A magnifier checking profile cards and flicking the fakes into a bin",
  offset: 8,
  setup: ({ spring }) => ({ lean: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const lens: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();
    const lean = m.lean.to(state === "idle" ? ctx.hover * 4 : 0).value;

    scene.box(0, 4, 0, 176, 100, 4, "base");
    // The belt, with slats that move while it runs.
    scene.box(0, BELT_Y, 4, 164, 26, BELT_Z - 4, empty ? "ghost" : "base");
    const flow = state === "loading" ? ctx.loop(SPAN / 30) * SPAN : state === "idle" ? ctx.pointer.x * 0.1 * ctx.hover : 0;
    if (!empty) for (let k = 0; k < 6; k++) {
      const x = wrap(k * 28 + flow, SPAN) - SPAN / 2;
      if (Math.abs(x) < 78) scene.line([x, BELT_Y - 12, BELT_Z + 0.05], [x, BELT_Y + 12, BELT_Z + 0.05], "faint");
    }

    // Who is where. Fakes past the lens are flicked off the belt into the bin.
    const cards: Card[] = [], binned: Card[] = [];
    const bin = (k: number): Card => ({ x: BIN.x - 6 + k * 10, y: BIN.y - 3 + k * 4, z: 6, fake: true, tone: "base" });
    if (state === "idle") {
      [-62, -32, 0, 32, 64].forEach((x, k) => cards.push({ x: x + flow, y: BELT_Y, z: BELT_Z, fake: k === 1, tone: "base" }));
      binned.push(bin(0));
    } else if (state === "success") {
      [-62, -32, 0, 32, 64].forEach(x => cards.push({ x, y: BELT_Y, z: BELT_Z, fake: false, tone: "ok" }));
      binned.push(bin(0), bin(1));
    } else if (state === "error") {
      // The check failed: a fake rode straight past the lens.
      [-62, -32, 0, 34, 64].forEach((x, k) => cards.push({ x: x + (k === 3 ? shake : 0), y: BELT_Y, z: BELT_Z, fake: k === 3 || k === 1, tone: k === 3 ? "err" : "base" }));
    } else if (state === "loading") {
      for (let k = 0; k < N; k++) {
        const x = wrap(k * (SPAN / N) + flow, SPAN) - SPAN / 2;
        const fake = FAKES.has(k), opacity = clamp((SPAN / 2 - Math.abs(x)) / 10);
        const under = Math.abs(x) < 12;
        if (fake && x > 12) {
          const f = smoothstep(clamp((x - 12) / 26));
          const c: Card = { x: lerp(x, BIN.x, f), y: lerp(BELT_Y, BIN.y, f), z: lerp(BELT_Z, 6, f) + 16 * bump(f), fake, tone: "base", opacity };
          (f > 0.98 ? binned : cards).push(c);
        } else cards.push({ x, y: BELT_Y, z: BELT_Z, fake, tone: under ? "hi" : "base", opacity });
      }
    }

    const items: { depth: number; draw: () => void }[] = [];
    if (!empty) cards.forEach(c => items.push({ depth: c.x + c.y, draw: () => card(scene, c) }));

    // The bin: back walls, whatever is inside, then the front walls.
    const btone: Tone = empty ? "ghost" : "base";
    items.push({ depth: BIN.x + BIN.y, draw: () => {
      const { x, y, w, d, h } = BIN;
      scene.box(x, y, 4, w, d, 2, btone);
      scene.box(x, y - d / 2 + 1, 6, w, 2, h, btone);
      scene.box(x - w / 2 + 1, y, 6, 2, d, h, btone);
      binned.forEach(c => card(scene, c));
      scene.box(x + w / 2 - 1, y, 6, 2, d, h, btone);
      scene.box(x, y + d / 2 - 1, 6, w, 2, h, btone);
    } });

    // The magnifier on its stand: a base, a handle and a rim around clear glass.
    const [lx, ly, lz] = LENS;
    items.push({ depth: lx + ly + 2, draw: () => {
      const z = lz + lean, at = (u: number, v: number): Vec3 => facing(lx + shake, ly, z, u, v);
      const a = -2.3, c = Math.cos(a), s = Math.sin(a), n = 3;
      const end = at(36 * c, 36 * s);
      scene.cylinder(end[0], end[1], 4, 9, 4, empty ? "ghost" : "base");
      scene.panel([at(18 * c - n * s, 18 * s + n * c), at(37 * c - n * s, 37 * s + n * c), at(37 * c + n * s, 37 * s - n * c), at(18 * c + n * s, 18 * s - n * c)], lens);
      scene.polyline(faceArc(lx + shake, ly, z, 18, 0, Math.PI * 2, 32), lens, { bold: true });
      scene.polyline(faceArc(lx + shake, ly, z, 15, 0, Math.PI * 2, 28), empty ? "ghost" : "faint");
      if (!empty) scene.polyline(faceArc(lx + shake, ly, z, 11, 2.0, 2.8, 6), "faint");
    } });
    items.sort((p, q) => p.depth - q.depth).forEach(i => i.draw());
  },
});
