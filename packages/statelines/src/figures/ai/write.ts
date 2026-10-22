import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { facing } from "../shapes";

/** Line widths on the page, top to bottom; the first is the title. */
const LINES = [28, 52, 46, 52, 24, 52, 42, 34];
const TOTAL = LINES.reduce((a, b) => a + b, 0);
const LEFT = -26;
const lineV = (k: number) => 78 - k * 9;
const WRITTEN = { idle: 230, loading: 0, success: TOTAL, error: 270, empty: 0 } as const;
/** The clipboard stands on a block and faces the viewer; (u, v) run across and up its face. */
const BASE = 12;
const ANGLE = (52 * Math.PI) / 180;
const at = (u: number, v: number, front = 0): Vec3 => {
  const p = facing(0, 0, BASE, u, v);
  return [p[0] + front, p[1] + front, p[2]];
};

/** A page writes itself line by line. Use for AI replies, generated drafts and summaries. */
export const write = /*#__PURE__*/ defineFigure({
  name: "Write",
  label: "A page writing itself line by line",
  offset: 30,
  setup: ({ spring }) => ({
    u: spring(LEFT + 40, 160, 20), v: spring(lineV(3), 160, 20),
    rest: spring(0, 120, 18), snap: spring(0, 140, 16), lift: spring(0),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const q = state === "loading" ? ctx.progress(4.2) : 0;
    const written = state !== "loading" ? WRITTEN[state] : ctx.determinate ? q * TOTAL : Math.min(TOTAL, ((q * 4.2) / 3.4) * TOTAL);

    // Where the writing stops: the pencil's tip sits there.
    let caretU = LEFT, caretV = lineV(0), used = 0, lastLine = -1;
    const lengths: number[] = [];
    for (let k = 0; k < LINES.length; k++) {
      const length = clamp(written - used, 0, LINES[k]!);
      used += LINES[k]!;
      lengths.push(length);
      if (length > 0) { caretU = LEFT + length; caretV = lineV(k); lastLine = k; }
      if (written <= used) break;
    }
    if (state === "loading") { m.u.set(caretU); m.v.set(caretV); }
    const U = m.u.to(caretU).value, V = m.v.to(caretV).value;
    const R = m.rest.to(state === "success" ? 1 : 0).value;
    const S = m.snap.to(state === "error" ? 1 : 0).value;
    const L = m.lift.to(state === "idle" ? ctx.hover * 8 : 0).value;

    const paper: Tone = empty ? "ghost" : state === "success" ? "ok" : "base";
    const pencil: Tone = state === "loading" ? "hi" : state === "error" ? "err" : "base";

    scene.box(0, 0, 0, 112, 92, 4, "base");
    // The stand, and the clipboard's board with its edge showing behind.
    scene.box(0, 0, 4, 40, 40, 8, empty ? "ghost" : "base");
    const quad = (u0: number, v0: number, u1: number, v1: number, front: number): Vec3[] =>
      [at(u0, v0, front), at(u1, v0, front), at(u1, v1, front), at(u0, v1, front)];
    if (empty) {
      scene.panel(quad(-38, 0, 38, 104, 0), "ghost");
      scene.panel(quad(-30, 8, 30, 88, 0.5), "ghost");
      return;
    }
    scene.panel(quad(-38, 0, 38, 104, -2.5), "base");
    scene.panel(quad(-38, 0, 38, 104, 0), "base");

    // The paper, its top right corner folded over.
    const F = 12;
    scene.panel([at(-31, 6, 0.6), at(31, 6, 0.6), at(31, 90 - F, 0.6), at(31 - F, 90, 0.6), at(-31, 90, 0.6)], paper);
    scene.panel([at(31, 90 - F, 0.8), at(31 - F, 90, 0.8), at(31 - F, 90 - F, 0.8)], paper);

    // The text, written so far.
    lengths.forEach((length, k) => {
      if (length <= 0) return;
      const tone: Tone = state === "error" && k === lastLine ? "err" : k === 0 ? "base" : "muted";
      scene.line(at(LEFT, lineV(k), 1), at(LEFT + length, lineV(k), 1), tone, { bold: k === 0 });
    });

    // The clip across the top of the board, with its ring.
    scene.panel(quad(-14, 86, 14, 100, 1.5), "base");
    scene.line(at(-10, 91, 1.6), at(10, 91, 1.6), "muted");
    scene.polyline(Array.from({ length: 13 }, (_, i) => {
      const a = (i / 12) * Math.PI;
      return at(7 * Math.cos(a), 100 + 6 * Math.sin(a), 1.5);
    }), "base", { bold: true });

    // The pencil: in hand it writes at the caret, its tip on the paper.
    if (R < 0.98) {
      const t0 = L + 40 * R;
      const along = (t: number, n: number): Vec3 =>
        at(U + shake + (t + t0) * Math.cos(ANGLE) - n * Math.sin(ANGLE), V + (t + t0) * Math.sin(ANGLE) + n * Math.cos(ANGLE), 3);
      const w = 3.8, o = 1 - R;
      if (S < 0.5) scene.panel([along(0, 0), along(11, -w), along(11, w)], pencil, o);
      else scene.polyline([along(11, -w), along(8, -1), along(12, 1), along(9, w)], "err", { opacity: o, bold: true });
      scene.panel([along(11, -w), along(46, -w), along(46, w), along(11, w)], pencil, o);
      scene.line(along(13, 0), along(46, 0), "muted", { opacity: o });
      scene.panel([along(46, -w), along(51, -w), along(51, w), along(46, w)], "muted", o);
      scene.panel([along(51, -w), along(57, -w), along(57, w), along(51, w)], pencil, o);
    }
    if (R > 0.02) {
      // Done: laid down on the plate in front of the stand.
      const x = 14, y = 34, z = 4;
      scene.box(x, y, z, 44, 6, 5, "ok", R);
      scene.panel([[x - 22, y - 3, z + 5], [x - 32, y, z + 2.5], [x - 22, y + 3, z]], "ok", R);
      scene.box(x + 24, y, z, 4, 6, 5, "muted", R);
    }
    if (S > 0.02) {
      // The snapped point, fallen onto the plate.
      const p = at(U, V, 32), z = 4 + (p[2] - 4) * (1 - S);
      scene.panel([[p[0] - 4, p[1], z + 2], [p[0] + 4, p[1] - 2, z + 2], [p[0], p[1] + 4, z]], "err", S);
    }

    // The mark of generated text.
    if (state !== "error") {
      const pulse = state === "loading" ? 1 + 0.25 * Math.sin(ctx.time * 6) : 1;
      const tone: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : "muted";
      const s = at(-50, 98);
      scene.sparkle(s[0], s[1], s[2], 9 * pulse, tone);
      const s2 = at(-58, 82);
      scene.sparkle(s2[0], s2[1], s2[2], 5 * (2 - pulse), tone, 0.8);
    }
  },
});
