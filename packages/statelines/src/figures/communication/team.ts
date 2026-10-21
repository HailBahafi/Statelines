import { defineFigure } from "../../core/define";
import { clamp, lerp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { person } from "../shapes";

const R = 62;
const MAX = 8;
const PLATE = 98;
const PAD = 11;
const seat = (k: number, seats: number, spin: number) => {
  const a = -Math.PI * 0.75 + (k * Math.PI * 2) / seats + spin;
  return { x: R * Math.cos(a), y: R * Math.sin(a), a };
};

/** People joining around a host. Use for teams, invites, members and sharing. `count`: seats, 2–8. */
export const team = defineFigure({
  name: "Team",
  label: "People joining a team around its host",
  offset: -14,
  setup: ({ spring }) => ({
    spin: spring(0, 60, 14),
    seats: Array.from({ length: MAX }, (_, k) => spring(k < 3 ? 1 : 0, 150, 22)),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const seats = ctx.count(5, MAX, 2);
    const invited = Math.max(1, seats - 2);
    const spin = m.spin.to(state === "idle" ? (ctx.pointer.x / 140) * 0.5 * ctx.hover : 0).value;
    const present = state === "success" ? seats : empty ? 0 : invited;

    scene.cylinder(0, 0, 0, PLATE, 4, "base");
    // Links run along the plate from the host's stand to each seat's pad.
    for (let k = 0; k < seats; k++) {
      const { a } = seat(k, seats, spin);
      const from: Vec3 = [20 * Math.cos(a), 20 * Math.sin(a), 4.05];
      const to: Vec3 = [(R - PAD - 3) * Math.cos(a), (R - PAD - 3) * Math.sin(a), 4.05];
      if (state === "success") {
        ctx.fade(1.4);
        const p = clamp(ctx.stateTime * 3 - k * 0.3);
        scene.line(from, [lerp(from[0], to[0], p), lerp(from[1], to[1], p), 4.05], "ok");
      } else {
        const bad = state === "error" && k === invited;
        scene.line(from, to, empty ? "ghost" : bad ? "err" : k < present ? "muted" : "faint");
      }
    }

    if (state === "loading") {
      const { a } = seat(invited, seats, spin), r = lerp(20, R - PAD - 4, ctx.loop(1.4));
      scene.cylinder(r * Math.cos(a), r * Math.sin(a), 4, 4, 4, "hi");
    }

    const host: Tone = empty ? "ghost" : ctx.verdict();
    const people = [{ depth: 0, draw: () => {
      scene.cylinder(0, 0, 4, 17, 5, empty ? "ghost" : "base");
      person(scene, 0, 0, 9, host, 1, 1.3);
    } }];
    for (let k = 0; k < seats; k++) {
      const { x, y } = seat(k, seats, spin);
      const bad = state === "error" && k === invited;
      const shown = m.seats[k]!.to(k < present ? 1 : 0).value;
      const calling = state === "loading" && k === invited;
      people.push({
        depth: x + y,
        draw: () => {
          scene.disc(x, y, 4.05, PAD, empty ? "ghost" : bad ? "err" : "faint");
          if (bad) person(scene, x + shake, y, 4, "err");
          else if (shown > 0.02) person(scene, x, y, 4, state === "success" ? "ok" : "base", shown);
          else person(scene, x, y, 4, calling ? "hi" : "ghost", calling ? 0.5 : undefined);
        },
      });
    }
    people.sort((p, q) => p.depth - q.depth).forEach(p => p.draw());
  },
});
