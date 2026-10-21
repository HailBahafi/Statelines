import { defineFigure } from "../../core/define";
import { smoothstep } from "../../engine/math";
import type { Tone, Vec3 } from "../../engine/scene";
import { facing } from "../shapes";

/** A padlock that opens. Use for locked content, access control and secure areas. */
export const lock = defineFigure({
  name: "Lock",
  label: "A padlock springing open",
  offset: 8,
  setup: ({ spring }) => ({ shackle: spring(0, 180, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let open = state === "success" ? 1 : state === "idle" ? ctx.hover * 0.4 : 0;
    if (state === "loading") open = 0.5 + 0.5 * Math.sin(ctx.time * 3);
    const O = m.shackle.to(open).value, L = 34 * O;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(shake, 0, 0, 70, 52, 14, tone);
    scene.polyline([[-16 + shake, 0, 14], [-16 + shake, 0, 14 + 22 + L * 0.3], [16 + shake, 0, 14 + 22 + L * 0.3], [16 + shake, 0, 14]], tone === "ghost" ? "ghost" : "muted", { bold: true });
    scene.disc(shake, -26, 14.05, 4, "muted", { fill: true });
    if (state === "success") scene.check(0, -40, 14, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -40, 14, "err", ctx.fade());
  },
});

/** A shield with a checkmark, or a shield struck. Use for protection, security status and checks. */
export const shield = defineFigure({
  name: "Shield",
  label: "A shield standing guard",
  offset: 0,
  setup: ({ spring }) => ({ lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const bob = state === "loading" ? 3 * Math.sin(ctx.time * 3) : 0;
    const L = m.lift.to((state === "idle" ? ctx.hover * 10 : 0) + bob).value;
    const outline: [number, number][] = [[-36, 36], [0, 46], [36, 36], [36, 0], [0, -48], [-36, 0]];
    const pts = outline.map(([u, v]) => facing(0, 0, 4 + L, u, v)).map(([x, y, z]) => [x + shake, y, z] as Vec3);
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    if (state === "empty") scene.polyline(pts, "ghost", { closed: true });
    else {
      scene.panel(pts, "base");
      scene.polyline(pts, tone, { closed: true, bold: true });
    }
    if (state === "success") scene.check(0, 0, 10 + L, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 0, 10 + L, "err", ctx.fade());
  },
});

/** A key turning in a lock, with the key's teeth drawn. Use for sign in, passwords and reset flows. */
export const key = defineFigure({
  name: "Key",
  label: "A key turning in a lock",
  offset: 6,
  setup: ({ spring }) => ({ turn: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake(), g = ctx.ground(10);
    let t = 0;
    if (state === "idle") t = ctx.hover * 0.3;
    if (state === "loading") t = 0.5 * smoothstep(ctx.loop(2.2) * 1.4 - 0.2);
    if (state === "success") t = 1;
    const T = m.turn.to(t).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 90, 60, 4, "base");
    scene.cylinder(-14 + shake, 0, 4, 22, 6, "muted");
    scene.disc(-14 + shake, 0, 10.05, 6, "base", { plate: true });
    scene.disc(-14 + shake, 0, 10.1, 6, "faint");
    scene.line([-14 + shake, 0, 12], [-14 + shake + 26 * Math.cos(T * Math.PI), 26 * Math.sin(T * Math.PI) * 0.4, 12], tone, { bold: true });
    scene.line([-14 + shake, 0, 12], [-14 + shake + 26 * Math.cos(T * Math.PI + 0.001), 0, 12], tone, { bold: true });
    scene.line([14, 0, 12], [48, 0, 12], tone, { bold: true });
    [38, 46].forEach(x => scene.line([x, 0, 12], [x, -10, 12], tone, { bold: true }));
    scene.sparkle(g.x * 0.2, g.y * 0.2, 30, 2, "faint", ctx.hover);
    if (state === "success") scene.check(30, -22, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(30, -22, 4, "err", ctx.fade());
  },
});

/** A safe with a dial spinning. Use for vaults, secure storage and encrypted data. */
export const vault = defineFigure({
  name: "Vault",
  label: "A safe door with a spinning dial",
  offset: 8,
  setup: ({ spring }) => ({ dial: spring(0, 90, 14), door: spring(0, 120, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const dialTarget = state === "loading" ? ctx.time * 2.2 : state === "success" ? 0 : ctx.pointer.x * 0.02;
    const D = state === "loading" ? dialTarget : m.dial.to(dialTarget).value;
    const door = m.door.to(state === "success" ? 1 : 0).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 110, 90, 6, "base");
    scene.disc(-8 + shake, 0, 6.05, 34, tone, { plate: true });
    scene.disc(-8 + shake, 0, 6.1, 34, "faint");
    scene.disc(-8 + shake, 0, 6.12, 22, "muted");
    scene.line([-8 + shake, 0, 6.2], [-8 + shake + 20 * Math.cos(D), 20 * Math.sin(D), 6.2], tone, { bold: true });
    scene.disc(-8 + shake, 0, 6.2, 4, tone, { fill: true });
    scene.box(44, 0, 6, 8, 16, 14, "muted");
    scene.line([48, -6, 20], [48 - 10 * door, -6, 20], "faint");
    if (state === "success") scene.check(-8, 0, 6, "ok", ctx.fade());
    if (state === "error") scene.cross(-8, 0, 6, "err", ctx.fade());
  },
});

/** A fingerprint being read on a reader's glass. Use for biometric sign in and device trust. */
export const fingerprint = defineFigure({
  name: "Fingerprint",
  label: "A fingerprint being scanned",
  offset: 34,
  setup: ({ spring }) => ({ shown: spring(0.5, 120, 18), scan: spring(18, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const face = 7.05, cz = 46, low = 18, high = 76;
    // How far up the glass the ridges are lit, 0…1.
    let lit = 0.45 + ctx.hover * 0.55, scan = low;
    if (state === "loading") {
      const p = ctx.loop(2.2);
      scan = low + (high - low) * (1 - Math.abs(2 * p - 1));
      lit = (scan - low) / (high - low);
      m.scan.set(scan); m.shown.set(lit);
    }
    if (state === "success" || state === "error") lit = 1;
    if (state === "empty") lit = 0;
    const L = m.shown.to(lit).value;
    const reader: Tone = state === "empty" ? "ghost" : state === "loading" ? "base" : ctx.verdict();
    const ridge: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "base";

    scene.box(0, 0, 0, 112, 84, 4, "base");
    scene.box(shake, 0, 4, 66, 14, 82, reader);
    scene.box(shake, 0, 86, 14, 6, 3, state === "success" ? "ok" : state === "error" ? "err" : "muted");
    const at = (u: number, z: number): Vec3 => [shake + u, face, z];
    scene.polyline([at(-26, 14), at(26, 14), at(26, 80), at(-26, 80)], "faint", { closed: true });
    if (state === "empty") {
      scene.polyline(Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return at(16 * Math.cos(a), cz + 22 * Math.sin(a));
      }), "ghost");
      return;
    }

    // Nested arches, open at the bottom, like the whorl of a fingertip.
    for (let k = 1; k <= 6; k++) {
      const rx = 3 + 3.3 * k, rz = 3.5 + 4 * k;
      const pts = Array.from({ length: 29 }, (_, i) => {
        const a = -0.18 * Math.PI + (i / 28) * 1.36 * Math.PI;
        return at(rx * Math.cos(a), cz + rz * Math.sin(a));
      });
      // On error the print is smudged: every other ridge breaks in the middle.
      const parts = state === "error" && k % 2 === 0 ? [pts.slice(0, 11), pts.slice(18)] : [pts];
      const on = (cz - rz - low) / (high - low) < L;
      for (const part of parts) scene.polyline(part, on ? ridge : "faint");
    }
    if (state === "loading") scene.line(at(-26, m.scan.value), at(26, m.scan.value), "hi", { bold: true });
  },
});

/** A firewall wall with packets bouncing off. Use for network protection, blocked traffic and firewall rules. */
export const firewall = defineFigure({
  name: "Firewall",
  label: "A wall stopping packets",
  offset: 6,
  setup: ({ spring }) => ({ wall: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const raise = m.wall.to(state === "idle" ? ctx.hover * 10 : state === "success" ? 16 : 0).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 120, 60, 4, "base");
    for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) {
      scene.box(-36 + c * 24, 0, 4 + r * 9 + raise * 0, 18, 18, 6 + raise * 0.4, tone === "ghost" ? "ghost" : c === 2 ? tone : "muted");
    }
    scene.box(0 + shake, 0, 40 + raise, 10, 20, 6, state === "loading" ? "hi" : "muted");
    if (state === "loading") for (let k = 0; k < 3; k++) {
      const q = (ctx.loop(1.8) + k / 3) % 1;
      scene.line([-54, 0, 6], [-54 + 100 * q, 0, 6], "hi", { opacity: 1 - q });
    }
    if (state === "success") scene.check(0, -30, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -30, 4, "err", ctx.fade());
  },
});

/** Two keys meeting in a handshake. Use for OAuth, connecting accounts and trusted links. */
export const handshake = defineFigure({
  name: "Handshake",
  label: "Two keys meeting",
  offset: 4,
  setup: ({ spring }) => ({ gap: spring(40, 140, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let gap = 40;
    if (state === "idle") gap = 40 - ctx.hover * 10;
    if (state === "loading") gap = 40 - 26 * smoothstep(ctx.loop(2.2) < 0.5 ? ctx.loop(2.2) * 2 : 2 - ctx.loop(2.2) * 2);
    if (state === "success") gap = 0;
    if (state === "error") gap = 58;
    const G = m.gap.to(gap).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 130, 50, 4, "base");
    scene.cylinder(-G / 2 - 6 + shake, 0, 4, 9, 8, tone);
    scene.cylinder(G / 2 + 6 - shake, 0, 4, 9, 8, tone);
    scene.line([-G / 2 + shake, 0, 12], [G / 2 - shake, 0, 12], "muted", { bold: true });
    if (state === "success") scene.check(0, -22, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -22, 4, "err", ctx.fade());
  },
});

/** A breach alert: a radar sweep finds a threat. Use for security alerts, monitoring and incidents. */
export const radar = defineFigure({
  name: "Radar",
  label: "A radar sweep finding a threat",
  offset: 30,
  setup: ({ spring }) => ({ sweep: spring(1.1, 90, 16), threat: spring(0, 160, 14) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const empty = state === "empty";
    // The scope faces the viewer on a stand; (u, v) are screen units across and up its face.
    const CZ = 70, R = 48;
    const at = (u: number, v: number): Vec3 => facing(shake, 0, CZ, u, v);
    const ring = (r: number, steps = 40): Vec3[] => Array.from({ length: steps + 1 }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      return at(r * Math.cos(a), r * Math.sin(a));
    });
    const BLIPS = [{ u: 22, v: 17 }, { u: -27, v: 10 }, { u: 8, v: -31 }, { u: -14, v: -16 }];
    const threatAngle = Math.atan2(BLIPS[0]!.v, BLIPS[0]!.u);

    // Where the beam points. It turns clockwise while loading; at rest it leans toward the pointer.
    let sweep = 1.1;
    if (state === "idle") {
      const cy = -CZ + 30;
      sweep = 1.1 + ctx.hover * 0.6 * Math.atan2(-(ctx.pointer.y - cy), ctx.pointer.x) / Math.PI;
    }
    if (state === "loading") { sweep = Math.PI / 2 - ctx.loop(2.4) * Math.PI * 2; m.sweep.set(sweep); }
    if (state === "error") sweep = threatAngle;
    const S = m.sweep.to(sweep).value, T = m.threat.to(state === "error" ? 1 : 0).value;
    const screen: Tone = empty ? "ghost" : state === "success" ? "ok" : state === "error" ? "err" : "muted";
    const beam: Tone = state === "loading" ? "hi" : state === "success" ? "ok" : state === "error" ? "err" : "base";

    scene.box(0, 0, 0, 104, 84, 4, "base");
    scene.box(shake, 0, 4, 46, 38, 8, empty ? "ghost" : "base");
    scene.box(shake, 0, 12, 8, 8, 14, empty ? "ghost" : "base");
    // The bezel and its screen.
    scene.panel(ring(R + 6), empty ? "ghost" : "base");
    scene.polyline(ring(R), screen);
    if (empty) return;
    scene.polyline(ring(R * 0.66), "faint");
    scene.polyline(ring(R * 0.33), "faint");
    scene.line(at(-R, 0), at(R, 0), "faint");
    scene.line(at(0, -R), at(0, R), "faint");

    // The afterglow: fading spokes trailing the beam.
    if (state !== "success") {
      for (let k = 14; k >= 1; k--) {
        const a = S + k * 0.06;
        scene.line(at(0, 0), at(R * Math.cos(a), R * Math.sin(a)), beam, { opacity: 0.6 * (1 - k / 15) });
      }
    }
    scene.line(at(0, 0), at(R * Math.cos(S), R * Math.sin(S)), beam, { bold: true });

    // Contacts glow as the beam passes them and fade behind it. A cleared screen shows none.
    if (state !== "success") {
      BLIPS.forEach((b, i) => {
        const threat = state === "error" && i === 0;
        let o = 0.35;
        if (state === "loading") {
          const behind = ((S - Math.atan2(b.v, b.u)) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2);
          o = Math.max(0.12, 1 - (Math.PI * 2 - behind) / 3);
        }
        if (state === "error") o = threat ? 1 : 0.2;
        const tone: Tone = threat ? "err" : state === "loading" ? "hi" : "muted";
        const dot = Array.from({ length: 13 }, (_, k) => at(b.u + 2.6 * Math.cos((k / 12) * Math.PI * 2), b.v + 2.6 * Math.sin((k / 12) * Math.PI * 2)));
        scene.panel(dot, tone, o);
        if (threat && T > 0.05) {
          const halo = Array.from({ length: 25 }, (_, k) => at(b.u + 7 * T * Math.cos((k / 24) * Math.PI * 2), b.v + 7 * T * Math.sin((k / 24) * Math.PI * 2)));
          scene.polyline(halo, "err", { opacity: T });
        }
      });
    }
    scene.panel(Array.from({ length: 13 }, (_, k) => at(2 * Math.cos((k / 12) * Math.PI * 2), 2 * Math.sin((k / 12) * Math.PI * 2))), beam);
  },
});

/** A checklist of security steps being completed. Use for onboarding security, audits and compliance. `count`: items, 2–5. */
export const compliance = defineFigure({
  name: "Compliance",
  label: "A checklist of security steps being ticked",
  offset: 2,
  setup: ({ spring }) => ({ tick: Array.from({ length: 5 }, () => spring(0, 180, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(4, 5, 2);
    const done = state === "success" ? n : state === "loading" ? Math.round(ctx.progress(n + 1) * n) : state === "error" ? n - 1 : 0;
    const tone = (k: number) => (state === "error" && k === n - 1 ? "err" : state === "success" ? "ok" : k < done ? "hi" : "muted");
    scene.box(0, 0, 0, 110, 40 + n * 12, 4, "base");
    for (let k = 0; k < n; k++) {
      const y = -((n - 1) * 12) / 2 + k * 12;
      const T = m.tick[k]!.to(k < done ? 1 : 0).value;
      scene.box(-38, y, 4, 9, 9, 2, tone(k));
      scene.line([-22, y, 6.05], [36, y, 6.05], k < done ? "base" : "faint");
      if (T > 0.5) scene.check(-38, y, 6.1, state === "error" && k === n - 1 ? "err" : "ok", 1);
    }
    if (state === "error") scene.cross(-38 + shake, -((n - 1) * 12) / 2 + (n - 1) * 12, 10, "err", ctx.fade());
  },
});

/** A password field with its characters masked, and one revealed. Use for password entry, strength and masked input. */
export const password = defineFigure({
  name: "Password",
  label: "A masked password field",
  offset: 10,
  setup: ({ spring }) => ({ reveal: spring(0, 200, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const dots = 8;
    const shown = state === "loading" ? Math.floor(ctx.loop(2.4) * 2.4 / 0.3) % dots : -1;
    const R = m.reveal.to(state === "success" ? 1 : 0).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "muted";
    scene.box(shake, 0, 0, 130, 40, 4, "base");
    scene.rect(-56 + shake, -12, 56 + shake, 12, 4.05, tone === "muted" ? "faint" : tone);
    for (let k = 0; k < dots; k++) {
      const x = -44 + k * 12.5 + shake;
      if (k === shown || R > 0.5) scene.disc(x, 0, 4.1, 2.6, tone === "muted" ? "base" : tone, { fill: true });
      else scene.disc(x, 0, 4.1, 2.2, tone === "muted" ? "muted" : tone, { fill: true });
    }
    if (state === "success") scene.check(56, 0, 4, "ok", ctx.fade());
    if (state === "error") scene.cross(56, 0, 4, "err", ctx.fade());
  },
});
