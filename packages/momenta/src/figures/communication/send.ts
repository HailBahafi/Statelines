import { defineFigure } from "../../core/define";
import { clamp, lerp, smoothstep } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";
import { envelope } from "../shapes";

const FROM = [-50, 36] as const;
const TO = [50, -36] as const;
const ARC = 64;
const at = (p: number): Vec3 => [lerp(FROM[0], TO[0], p), lerp(FROM[1], TO[1], p), Math.sin(Math.PI * clamp(p)) * ARC];

/** An envelope flies to the other side. Use for sent messages, emails and invitations. */
export const send = defineFigure({
  name: "Send",
  label: "An envelope flying from one tray to another",
  offset: 4,
  setup: ({ spring }) => ({ p: spring(0, 110, 20) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), lean = ctx.lean(14);
    let p = 0, opacity = 1;
    if (state === "loading") {
      const q = ctx.progress(1.9);
      if (ctx.determinate) p = q;
      else {
        p = smoothstep(q / 0.8);
        opacity = 1 - smoothstep((q - 0.8) / 0.1);
        m.p.set(p);
      }
    } else if (state === "success") p = 1;
    else if (state === "error") p = 0.12;

    const P = m.p.to(p).value;
    const [ax, ay, az] = at(P);
    const idle = state === "idle";
    const x = ax + (idle ? lean.x : 0) + shake, y = ay + (idle ? lean.y : 0);
    const z = 4 + az + (idle ? ctx.hover * 14 : 0);

    scene.box(TO[0], TO[1], 0, 64, 48, 4, state === "success" ? "ok" : "base");
    scene.rect(TO[0] - 24, TO[1] - 16, TO[0] + 24, TO[1] + 16, 4, "faint");
    scene.box(FROM[0], FROM[1], 0, 64, 48, 4, "base");

    const trail = Array.from({ length: 41 }, (_, i) => {
      const [tx, ty, tz] = at(i / 40);
      return [tx, ty, tz + 6] as Vec3;
    });
    scene.polyline(trail, state === "error" ? "err" : "ghost", { opacity: state === "loading" || state === "error" ? 1 : 0.6 });

    if (state === "empty") envelope(scene, x, y, z, "ghost");
    else envelope(scene, x, y, z, state === "loading" ? "hi" : ctx.verdict(), opacity);

    if (state === "success") scene.check(x, y + 8, z + 3, "ok", ctx.fade());
    if (state === "error") scene.cross(x, y + 8, z + 3, "err", ctx.fade());
  },
});
