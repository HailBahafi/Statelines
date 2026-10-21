import { defineFigure } from "../../core/define";
import { clamp, lerp } from "../../engine/math";
import { person } from "../shapes";

const R = 66;
const MAX = 8;
const seat = (k: number, seats: number, spin: number) => {
  const a = -Math.PI * 0.75 + (k * Math.PI * 2) / seats + spin;
  return { x: R * Math.cos(a), y: R * Math.sin(a), a };
};

/** People joining around a host. Use for teams, invites, members and sharing. `count`: seats, 2–8. */
export const team = defineFigure({
  name: "Team",
  label: "People joining a team around its host",
  offset: -8,
  setup: ({ spring }) => ({
    spin: spring(0, 60, 14),
    seats: Array.from({ length: MAX }, (_, k) => spring(k < 3 ? 1 : 0, 150, 22)),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const seats = ctx.count(5, MAX, 2);
    const invited = Math.max(1, seats - 2);
    const spin = m.spin.to(state === "idle" ? (ctx.pointer.x / 140) * 0.5 * ctx.hover : 0).value;
    const present = state === "success" ? seats : state === "empty" ? 0 : invited;

    for (let k = 0; k < seats; k++) {
      const { a } = seat(k, seats, spin);
      const from: [number, number, number] = [16 * Math.cos(a), 16 * Math.sin(a), 0];
      const to: [number, number, number] = [(R - 12) * Math.cos(a), (R - 12) * Math.sin(a), 0];
      if (state === "success") {
        ctx.fade(1.4);
        const p = clamp(ctx.stateTime * 3 - k * 0.3);
        scene.line(from, [lerp(from[0], to[0], p), lerp(from[1], to[1], p), 0], "ok");
      } else {
        scene.line(from, to, k < present ? "muted" : "ghost");
      }
    }

    if (state === "loading") {
      const { a } = seat(invited, seats, spin), r = lerp(16, R - 10, ctx.loop(1.4));
      scene.cylinder(r * Math.cos(a), r * Math.sin(a), 0, 4, 4, "hi");
    }

    const people = [{ depth: 0, draw: () => person(scene, 0, 0, 0, state === "empty" ? "muted" : ctx.verdict(), 1, 1.3) }];
    for (let k = 0; k < seats; k++) {
      const { x, y } = seat(k, seats, spin);
      const bad = state === "error" && k === invited;
      const shown = m.seats[k]!.to(k < present ? 1 : 0).value;
      const calling = state === "loading" && k === invited;
      people.push({
        depth: x + y,
        draw: () => {
          if (bad) {
            person(scene, x + shake, y, 0, "err");
            scene.cross(x + shake, y, 26, "err", ctx.fade());
          } else if (shown > 0.02) {
            person(scene, x, y, 0, state === "success" ? "ok" : "base", shown);
          } else {
            person(scene, x, y, 0, calling ? "hi" : "ghost", calling ? 0.5 : undefined);
          }
        },
      });
    }
    people.sort((p, q) => p.depth - q.depth).forEach(p => p.draw());
  },
});
