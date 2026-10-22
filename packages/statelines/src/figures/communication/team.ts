import { defineFigure } from "../../core/define";
import { clamp, lerp, smoothstep } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { person } from "../shapes";

const R = 58;
const MAX = 8;
const PLATE = 90;
const TABLE = { r: 38, z: 24 };
const SEAT = 15;
/** Where someone waits before taking a seat: on the floor, outside the ring of chairs. */
const OUT = R + 22;
const angle = (k: number, seats: number, spin: number) => -Math.PI * 0.75 + (k * Math.PI * 2) / seats + spin;

/** A team meeting around a table. Use for teams, invites, members and sharing. `count`: seats, 2–8. */
export const team = defineFigure({
  name: "Team",
  label: "People taking their seats around a team table",
  offset: 4,
  setup: ({ spring }) => ({
    spin: spring(0, 60, 14),
    seats: Array.from({ length: MAX }, (_, k) => spring(k < 3 ? 1 : 0, 150, 22)),
    away: spring(0, 120, 14),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const seats = ctx.count(5, MAX, 2);
    const invited = Math.max(1, seats - 2);
    const spin = m.spin.to(state === "idle" ? (ctx.pointer.x / 140) * 0.35 * ctx.hover : 0).value;
    const present = state === "success" ? seats : empty ? 0 : invited;
    const away = clamp(m.away.to(state === "error" ? 1 : 0).value, 0, 1.2);
    const furniture: Tone = empty ? "ghost" : "base";

    scene.cylinder(0, 0, 0, PLATE, 4, "base");

    const items: { depth: number; draw: () => void }[] = [{
      depth: 0,
      draw: () => {
        // The table: a round top on a single pedestal with a foot.
        scene.cylinder(0, 0, 4, 15, 2, furniture);
        scene.cylinder(0, 0, 6, 5, TABLE.z - 6, furniture);
        scene.cylinder(0, 0, TABLE.z, TABLE.r, 3, furniture);
        if (!empty) scene.disc(0, 0, TABLE.z + 3.05, TABLE.r - 5, "faint");
      },
    }];

    for (let k = 0; k < seats; k++) {
      const a = angle(k, seats, spin), c = Math.cos(a), s = Math.sin(a);
      const x = R * c, y = R * s, far = c + s < 0;
      const host = k === 0, bad = state === "error" && k === invited;
      const calling = state === "loading" && k === invited;
      const shown = m.seats[k]!.to(k < present ? 1 : 0).value;
      const chair: Tone = empty ? "ghost" : bad ? "err" : calling ? "hi" : "base";
      // A chair: a round seat on a post, its back on the side away from the table.
      const back = () => {
        const bx = (R + 9) * c, by = (R + 9) * s, tx = -s * 9.5, ty = c * 9.5, top = SEAT + (host ? 24 : far ? 20 : 10);
        const quad: Vec3[] = [[bx - tx, by - ty, SEAT], [bx + tx, by + ty, SEAT], [bx + tx, by + ty, top], [bx - tx, by - ty, top]];
        scene.panel(quad, chair);
      };
      const seat = () => {
        scene.line([x, y, 4], [x, y, SEAT], empty ? "ghost" : "muted", { bold: true });
        scene.cylinder(x, y, SEAT, 9.5, 2.5, chair);
      };
      const sitter = () => {
        const scale = host ? 1.25 : 1.12;
        if (empty) return;
        if (calling) {
          // The newcomer walks in from outside the ring and sits down.
          const q = ctx.loop(1.8), p = smoothstep(q / 0.7), r = lerp(OUT, R, p);
          const z = lerp(4, SEAT + 2.5, smoothstep((p - 0.55) / 0.45));
          person(scene, r * c, r * s, z, "hi", 1 - smoothstep((q - 0.88) / 0.1), scale);
          return;
        }
        if (bad) {
          // Turned away: they stay standing outside the ring.
          const r = lerp(R, OUT, Math.min(1, away)), b = a + 0.4 * clamp(away);
          person(scene, r * Math.cos(b) + shake, r * Math.sin(b), lerp(SEAT + 2.5, 4, clamp(away)), "err", undefined, scale);
          return;
        }
        if (shown > 0.02) person(scene, x, y, SEAT + 2.5, state === "success" ? "ok" : "base", shown, scale);
      };
      items.push({
        depth: x + y,
        draw: () => {
          if (far) { back(); seat(); if (!bad && !calling) sitter(); }
          else { seat(); if (!bad && !calling) sitter(); back(); }
        },
      });
      // People out on the floor are sorted on their own, beyond the chair.
      if (bad || calling) items.push({ depth: bad ? OUT * (Math.cos(a + 0.4) + Math.sin(a + 0.4)) : (OUT - 6) * (c + s), draw: sitter });
    }
    items.sort((p, q) => p.depth - q.depth).forEach(p => p.draw());
  },
});
