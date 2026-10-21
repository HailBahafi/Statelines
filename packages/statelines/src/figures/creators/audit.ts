import { defineFigure } from "../../core/define";
import { clamp, wrap } from "../../engine/math";
import type { Tone } from "../../engine/scene";
import { badge, person } from "../shapes";

const N = 7;
const SPAN = 140;
const FAKES = new Set([2, 5]);
const BELT = 7;
const ARCH = 42;
/** Where everyone stands once the scan has finished: the real ones through the gate, the fakes off the belt. */
const PASSED = [14, 28, 42, 56, 70];
const REMOVED = [22, 50];

/** Followers pass a scanner and the fake ones drop away. Use for audience audits, fake follower checks and fraud. */
export const audit = defineFigure({
  name: "Audit",
  label: "Followers passing a scanner that drops the fake ones",
  offset: 10,
  setup: ({ spring }) => ({ beam: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const flow = state === "loading" ? ctx.loop(SPAN / 26) * SPAN : state === "idle" ? ctx.pointer.x * 0.12 * ctx.hover : 0;
    const glow = m.beam.to(state === "idle" ? ctx.hover : 0).value;
    const gate: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();

    scene.box(0, 0, 0, 168, 76, 4, "base");
    scene.box(0, 0, 4, 156, 26, BELT - 4, empty ? "ghost" : "muted");

    const items: { depth: number; draw: () => void }[] = [];
    const add = (x: number, y: number, z: number, tone: Tone, opacity?: number) =>
      items.push({ depth: x + y, draw: () => person(scene, x, y, z, tone, opacity, 0.8) });

    if (state === "success") {
      PASSED.forEach(x => add(x, 0, BELT, "ok"));
      REMOVED.forEach(x => add(x, 26, 4, "ghost"));
    } else if (state === "error") {
      // The scan stopped with a fake already through the gate.
      for (let k = 0; k < N; k++) {
        const x = -66 + k * 20;
        add(x, 0, BELT, k === 5 ? "err" : x > 0 ? "muted" : "base");
      }
    } else if (!empty) {
      for (let k = 0; k < N; k++) {
        const x = wrap(-70 + k * (SPAN / N) + flow, SPAN) - 70;
        const fake = FAKES.has(k), past = x > 0;
        // A fake that clears the gate is pushed off the front of the belt onto the plate.
        const off = fake && past ? clamp(x / 16) : 0;
        const tone: Tone = off > 0 ? "ghost" : past && state === "loading" ? "hi" : "base";
        add(x, off * 26, BELT - off * (BELT - 4), tone);
      }
    }

    // The scanner: two posts and a lintel, with a light curtain between the posts.
    items.push({ depth: -18, draw: () => scene.box(shake, -18, 4, 6, 6, ARCH, gate) });
    items.push({ depth: 0.5, draw: () => {
      if (empty) return;
      const tone: Tone = state === "loading" ? "hi" : state === "error" ? "err" : glow > 0.05 ? "muted" : "faint";
      for (const y of [-9, 0, 9]) scene.line([shake, y, ARCH + 3], [shake, y, BELT + 0.05], tone, { opacity: state === "loading" ? 0.9 : 0.7 });
    } });
    items.push({ depth: 18, draw: () => scene.box(shake, 18, 4, 6, 6, ARCH, gate) });
    items.sort((a, b) => a.depth - b.depth).forEach(i => i.draw());
    scene.box(shake, 0, ARCH + 4, 8, 44, 5, gate);

    const bx = state === "success" ? -40 : 34;
    badge(scene, bx, 24, 4, state, ctx.fade());
  },
});
