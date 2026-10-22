import { defineFigure } from "../../core/define";
import { clamp, lerp, smoothstep } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { faceArc, facing } from "../shapes";
import { add, mul, obox, rotY, tube } from "./solid";

const MAX = 6;
const RX = -8, RY = 8, R = 13;
const PAD = 10;
const BODY = 64;
const NOSE = 22;
const TOWER = { x: 34, y: -34, h: 104 };
const ARM_Z = PAD + BODY * 0.78;
const DIAG: Vec3 = (() => { const dx = RX - TOWER.x, dy = RY - TOWER.y, l = Math.hypot(dx, dy); return [dx / l, dy / l, 0]; })();
/** Length of the broken-off top that falls on error. */
const BREAK = 22;

/** A rocket lifts off its launch pad. Use for deploys, publishing and builds. `count`: stages, 2–6. */
export const deploy = /*#__PURE__*/ defineFigure({
  name: "Deploy",
  label: "A multi-stage rocket lifting off its launch pad",
  offset: 18,
  setup: ({ spring }) => ({ lift: spring(0, 90, 16), arm: spring(1, 120, 18), fall: spring(0, 70, 12) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    const stages = ctx.count(4, MAX, 2);
    const h = BODY / stages;

    let lift = 4 * clamp(ctx.hover), arm = 1, flame = 0;
    if (state === "loading") {
      const t = ctx.loop(2.4);
      lift = 8 + 14 * smoothstep(t / 0.7) - 14 * smoothstep((t - 0.75) / 0.25);
      flame = 0.75 + 0.25 * Math.sin(ctx.time * 31);
      m.lift.set(lift);
      arm = 0;
    } else if (state === "success") { lift = 30; arm = 0; }
    else if (state === "error") arm = 0;
    const L = m.lift.to(lift).value, A = m.arm.to(arm).value;
    const F = m.fall.to(state === "error" ? 1 : 0).value;
    const x = RX + shake, y = RY, z0 = PAD + L;
    const tone: Tone = empty ? "ghost" : state === "loading" ? "hi" : ctx.verdict();

    scene.box(0, 0, 0, 124, 124, 4, "base");
    // The launch tower: a lattice mast with an arm that holds the rocket until launch.
    const tw: Tone = empty ? "ghost" : "base";
    scene.box(TOWER.x, TOWER.y, 4, 12, 12, TOWER.h, tw);
    if (!empty) {
      const fy = TOWER.y + 6.05, fx = TOWER.x + 6.05;
      const zig = (k: number): Vec3[] => [[TOWER.x - 6, fy, 10 + k * 18], [TOWER.x + 6, fy, 19 + k * 18], [TOWER.x - 6, fy, 28 + k * 18]];
      const zag = (k: number): Vec3[] => [[fx, TOWER.y - 6, 10 + k * 18], [fx, TOWER.y + 6, 19 + k * 18], [fx, TOWER.y - 6, 28 + k * 18]];
      for (let k = 0; k < 5; k++) { scene.polyline(zig(k), "faint"); scene.polyline(zag(k), "faint"); }
    }
    const reach = Math.hypot(RX - TOWER.x, RY - TOWER.y) - R - 8;
    const armLen = 6 + (reach - 6) * A;
    obox(scene, add([TOWER.x, TOWER.y, ARM_Z], mul(DIAG, 6 + armLen / 2)), mul(DIAG, armLen / 2), [-DIAG[1] * 2.5, DIAG[0] * 2.5, 0], [0, 0, 2.5], tw);

    // The pad, with a flame trench ring.
    scene.cylinder(RX, RY, 4, 24, PAD - 4, empty ? "ghost" : "base");
    if (!empty) scene.disc(RX, RY, PAD + 0.05, 15, "faint");

    if (state === "success" && L > 8) scene.line([x, y, PAD + 1], [x, y, z0 - 2], "faint", { opacity: clamp((L - 8) / 20) });

    // Fins: the two at the back first, then the body, then the two in front.
    const fin = (dx: number, dy: number) => {
      const p = (r: number, zz: number): Vec3 => [x + dx * r, y + dy * r, zz];
      scene.panel([p(R - 1, z0 + 20), p(R + 10, z0 + 2), p(R + 10, z0 - 4), p(R - 1, z0 + 2)], tone);
    };
    fin(-1, 0); fin(0, -1);
    tube(scene, [x, y, z0 - 3], [x, y, z0], R * 0.6, R * 0.75, tone, undefined, false);

    const top = z0 + BODY;
    const breakAt = top - BREAK;
    for (let k = 0; k < stages; k++) {
      const a = z0 + k * h, b = Math.min(z0 + (k + 1) * h, F > 0.001 ? breakAt : Infinity);
      if (b > a + 0.2) tube(scene, [x, y, a], [x, y, b], R, R, tone);
    }
    fin(1, 0); fin(0, 1);

    // The top stage and nose: upright, or broken off and fallen onto the plate on error.
    const pivot: Vec3 = [x + R, y, breakAt];
    const put = (p: Vec3): Vec3 => (F > 0.001 ? add(rotY(p, pivot, (-F * Math.PI) / 2), [16 * F, 6 * F, -F * (breakAt - 4 - R)]) : p);
    if (F > 0.001) {
      for (let k = 0; k < stages; k++) {
        const a = Math.max(z0 + k * h, breakAt), b = z0 + (k + 1) * h;
        if (b > a + 0.2) tube(scene, put([x, y, a]), put([x, y, b]), R, R, tone);
      }
    }
    tube(scene, put([x, y, top]), put([x, y, top + NOSE]), R, 0.6, tone, undefined, false);
    // A porthole on the top stage, facing the viewer, while it stands.
    if (!empty && F < 0.05) {
      const s = R * Math.SQRT1_2;
      scene.polyline(faceArc(x + s, y + s, top - Math.min(h, BREAK) / 2, 3.4, 0, Math.PI * 2, 12), "muted");
    }
    if (state === "error" && F > 0.5) {
      // Scorched stub where it snapped.
      scene.disc(x, y, breakAt + 0.05, R * 0.55, "err", { opacity: lerp(0, 1, (F - 0.5) * 2) });
    }
    // Exhaust: a flickering flame out of the engine bell while it climbs.
    if (flame > 0) {
      const zf = z0 - 3, len = 38 * flame;
      scene.panel([facing(x, y, zf, -7, 0), facing(x, y, zf, 7, 0), facing(x, y, zf, 2.5, -len * 0.7),
        facing(x, y, zf, 0, -len), facing(x, y, zf, -2.5, -len * 0.7)], "hi");
      scene.line(facing(x, y, zf, 0, -2), facing(x, y, zf, 0, -len * 0.55), "hi");
    }
  },
});
