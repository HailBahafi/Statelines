import { defineFigure } from "../../core/define";
import { clamp } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { add, mul, obox, rotX, rotY, tube } from "./solid";

const BODY = { w: 104, d: 50, h: 18 };
const TOP = 4 + BODY.h;
const FRONT = BODY.d / 2;
const ANTENNAS = [-36, 0, 36];
const FAN = [-0.3, 0, 0.3];
const LENGTH = 52;
const LEDS = [-36, -22, -8, 6, 20];

/** A Wi-Fi router with its antennas up. Use for connectivity, offline, reconnecting and network status. */
export const connection = defineFigure({
  name: "Connection",
  label: "A Wi-Fi router with its antennas up and status lights",
  offset: 22,
  setup: ({ spring }) => ({
    antennas: ANTENNAS.map(() => ({ fan: spring(0, 140, 14), fold: spring(0, 120, 13) })),
  }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const body: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    const x0 = shake;

    scene.box(0, 0, 0, 144, 92, 4, "base");
    scene.box(x0, 0, 4, BODY.w, BODY.d, BODY.h, body);
    if (!empty) {
      // Vents across the lid, two ports on the end, and the row of status lights on the front.
      for (let k = 0; k < 6; k++) {
        const vx = x0 - 30 + k * 12;
        scene.line([vx, -10, TOP + 0.05], [vx, 10, TOP + 0.05], "faint");
      }
      const end = x0 + BODY.w / 2 + 0.05;
      for (const py of [-14, 2]) scene.polyline([[end, py, 9], [end, py + 9, 9], [end, py + 9, 15], [end, py, 15]], "muted", { closed: true });
      const chase = state === "loading" ? Math.floor(ctx.time * 6) % (LEDS.length + 2) : -1;
      LEDS.forEach((u, k) => {
        let tone: Tone = k === 0 ? "muted" : "faint", bold = k === 0;
        if (state === "loading" && k <= chase && k > 0) { tone = "hi"; bold = true; }
        if (state === "success") { tone = "ok"; bold = true; }
        if (state === "error") { tone = k === 0 ? "err" : "faint"; bold = k === 0; }
        scene.line([x0 + u, FRONT + 0.05, 13], [x0 + u + 6, FRONT + 0.05, 13], tone, { bold });
      });
    }

    // Antennas hinge on the back of the lid: fanned out at rest, straight up when connected, flopped across the lid when down.
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "base";
    ANTENNAS.forEach((ax, i) => {
      const a = m.antennas[i]!;
      let fan = FAN[i]! * (1 - 0.6 * clamp(ctx.hover)), fold = 0;
      if (state === "success" || empty) fan = 0;
      if (state === "loading") fan = FAN[i]! * 0.5 + 0.12 * Math.sin(ctx.time * 3 + i * 1.4);
      if (state === "error") { fan = FAN[i]! * 0.6; fold = -1.42; }
      if (state === "loading") a.fan.set(fan);
      const F = a.fan.to(fan).value, D = a.fold.to(fold).value;
      const base: Vec3 = [x0 + ax, -FRONT + 5, TOP];
      const dir = rotX(rotY([0, 0, 1], [0, 0, 0], F), [0, 0, 0], D);
      obox(scene, add(base, [0, 0, 3]), [4, 0, 0], [0, 4, 0], [0, 0, 3], tone === "ghost" ? "ghost" : "base");
      const p0 = add(base, mul(dir, 6)), p1 = add(base, mul(dir, 6 + LENGTH));
      tube(scene, p0, p1, 3.4, 2.6, tone);
      if (!empty) tube(scene, add(base, mul(dir, 6 + LENGTH * 0.62)), add(base, mul(dir, 7 + LENGTH * 0.62)), 3.8, 3.8, crease(tone));
    });
  },
});

const crease = (t: Tone): Tone => (t === "base" ? "muted" : t);
