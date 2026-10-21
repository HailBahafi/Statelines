import { defineFigure } from "../../core/define";
import { bump, clamp, falloff, lerp, smoothstep, wrap } from "../../engine/math";
import type { Vec3 } from "../../engine/scene";
import { facing, faceArc, parcel } from "../shapes";

/** Cards sliding across columns on a board. Use for kanban boards, pipelines and task status. `count`: cards per column, 1–3. */
export const kanban = defineFigure({
  name: "Kanban",
  label: "Cards moving across three columns",
  offset: 8,
  setup: ({ spring }) => ({ x: spring(0, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const per = ctx.count(2, 3, 1), colX = [-48, 0, 48];
    const moving = state === "loading" ? Math.floor(ctx.loop(2.4) * 3) : state === "success" ? 2 : 0;
    const X = m.x.to(state === "idle" ? ctx.hover * 6 : 0).value;
    scene.box(0, 0, 0, 150, 84, 4, "base");
    colX.forEach((cx, c) => scene.line([cx - 22, -34, 4.05], [cx - 22, 34, 4.05], "faint"));
    for (let c = 0; c < 3; c++) for (let k = 0; k < per; k++) {
      const moved = c === moving && k === 0 && state === "loading";
      const x = colX[c]! + (moved ? 0 : 0), y = -22 + k * 22;
      const tone = state === "error" && c === 2 && k === 0 ? "err" : state === "success" && c === 2 ? "ok" : moved ? "hi" : state === "empty" ? "ghost" : "base";
      scene.box(x + X * (c === 0 ? 1 : 0) + (state === "error" && c === 2 && k === 0 ? shake : 0), y, 4 + (moved ? 8 : 0), 32, 14, 3, tone);
    }
    if (state === "success") scene.check(48, 0, 10, "ok", ctx.fade());
    if (state === "error") scene.cross(48, -22, 10, "err", ctx.fade());
  },
});

/** A checklist that ticks off line by line. Use for to-dos, onboarding steps and task completion. `count`: items, 2–5. */
export const todo = defineFigure({
  name: "Todo",
  label: "A checklist ticking off items",
  offset: 2,
  setup: ({ spring }) => ({ tick: Array.from({ length: 5 }, () => spring(0, 180, 16)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(4, 5, 2);
    const done = state === "success" ? n : state === "loading" ? Math.round(ctx.progress(n + 1) * n) : state === "error" ? n - 1 : 0;
    scene.box(0, 0, 0, 110, 40 + n * 12, 4, "base");
    for (let k = 0; k < n; k++) {
      const y = -((n - 1) * 12) / 2 + k * 12;
      const T = m.tick[k]!.to(k < done ? 1 : 0).value;
      const tone = state === "error" && k === n - 1 ? "err" : k < done ? (state === "success" ? "ok" : "hi") : "muted";
      scene.box(-38 + (state === "error" && k === n - 1 ? shake : 0), y, 4, 9, 9, 2, tone);
      scene.line([-22, y, 6.05], [36, y, 6.05], k < done ? "base" : "faint");
      if (T > 0.5) scene.check(-38, y, 6.1, state === "error" && k === n - 1 ? "err" : "ok", 1);
    }
    if (state === "error") scene.cross(-38 + shake, -((n - 1) * 12) / 2 + (n - 1) * 12, 10, "err", ctx.fade());
  },
});

/** A calendar week with blocks being placed. Use for scheduling, planners and time blocks. */
export const planner = defineFigure({
  name: "Planner",
  label: "Blocks placed on a week grid",
  offset: 6,
  setup: ({ spring }) => ({ slide: spring(0, 160, 18) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const blocks = [[0, 1, 2], [1, 3, 2], [3, 0, 1], [4, 2, 2]] as const;
    const placed = state === "empty" ? 0 : state === "loading" ? Math.floor(ctx.progress(blocks.length + 1) * blocks.length) : blocks.length;
    scene.box(0, 0, 0, 140, 90, 4, "base");
    for (let c = 0; c < 5; c++) scene.line([-56 + c * 28, -36, 4.05], [-56 + c * 28, 36, 4.05], "faint");
    for (let r = 0; r < 4; r++) scene.line([-56, -36 + r * 24, 4.05], [56, -36 + r * 24, 4.05], "faint");
    blocks.forEach(([c, r, span], k) => {
      if (k >= placed) { scene.box(-56 + c * 28 + 14, -36 + r * 24 + 12, 4, 26, 22, 2, "ghost"); return; }
      const x = -56 + c * 28 + 14 + (state === "error" && k === 2 ? shake : 0), y = -36 + r * 24 + 12;
      const tone = state === "error" && k === 2 ? "err" : state === "success" ? "ok" : state === "loading" && k === placed - 1 ? "hi" : "base";
      scene.box(x, y, 4 + (state === "loading" && k === placed - 1 ? 6 : 0), 26, span * 6 + 14, 4, tone);
    });
    if (state === "success") scene.check(44, -30, 10, "ok", ctx.fade());
    if (state === "error") scene.cross(-14, -6, 12, "err", ctx.fade());
  },
});

/** A timer ring counting down. Use for focus sessions, countdowns and time tracking. */
export const timer = defineFigure({
  name: "Timer",
  label: "A ring counting down",
  offset: 4,
  setup: ({ spring }) => ({ left: spring(1, 90, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const left = state === "loading" ? 1 - ctx.progress(12) : state === "success" ? 0 : state === "error" ? 0.6 : state === "empty" ? 1 : 0.7;
    const L = m.left.to(left).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : "base";
    scene.box(0, 0, 0, 110, 110, 4, "base");
    scene.disc(0 + shake, 0, 4.05, 40, "faint");
    scene.arc(shake, 0, 4.1, 40, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * L, tone, { bold: true });
    scene.disc(shake, 0, 4.1, 26, "faint");
    if (state === "success") scene.check(0, 0, 4.2, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 0, 4.2, "err", ctx.fade());
  },
});

/** A document stack being signed. Use for e-signatures, contracts and approvals. */
export const sign = defineFigure({
  name: "Sign",
  label: "A document being signed",
  offset: 6,
  setup: ({ spring }) => ({ pen: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const t = state === "loading" ? ctx.loop(2) : state === "success" ? 1 : 0;
    const pen = m.pen.to(t).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 110, 84, 3, "base");
    scene.box(0, -4, 3, 104, 76, 3, "faint");
    for (let k = 0; k < 4; k++) scene.line([-36, -26 + k * 12, 6.05], [36 - (k === 3 ? 30 : 0), -26 + k * 12, 6.05], "muted");
    const sx = lerp(-34, 22, pen);
    scene.polyline([[-34, 14, 6.1], [sx * 0.6 + 4, 16 + 4 * Math.sin(pen * 9), 6.1], [sx, 12 + 3 * Math.cos(pen * 7), 6.1]], tone, { bold: true });
    scene.cylinder(sx + shake, 14, 12, 2.5, 22, tone);
    if (state === "success") scene.check(40, 22, 6, "ok", ctx.fade());
    if (state === "error") scene.cross(40, 22, 6, "err", ctx.fade());
  },
});

/** Notes folding into a notebook page. Use for notes, drafts, saving and journaling. */
export const notes = defineFigure({
  name: "Notes",
  label: "Notes folding into a page",
  offset: 4,
  setup: ({ spring }) => ({ fold: spring(0, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const f = m.fold.to(state === "success" ? 1 : state === "idle" ? ctx.hover * 0.4 : 0).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 96, 110, 3, "base");
    for (let k = 0; k < 5; k++) scene.line([-30, -34 + k * 14, 3.05], [30 - (k === 4 ? 14 : 0), -34 + k * 14, 3.05], "muted");
    const corner = 22 * (1 - f * 0.6);
    scene.polyline([[48, 55, 3.1], [48 - corner, 55, 3.1], [48, 55 - corner, 3.1]], tone, { closed: true });
    if (state === "loading") scene.line([-34 + shake, 50, 3.1], [-34 + 60 * ctx.progress(2), 50, 3.1], "hi", { bold: true });
    if (state === "success") scene.check(0, -20, 3.2, "ok", ctx.fade());
    if (state === "error") scene.cross(0, -20, 3.2, "err", ctx.fade());
  },
});

/** A folder of files being archived. Use for archiving, cleanup and retention. `count`: files, 1–4. */
export const archive = defineFigure({
  name: "Archive",
  label: "Files being archived into a box",
  offset: 8,
  setup: ({ spring }) => ({ files: Array.from({ length: 4 }, () => spring(0, 150, 18)) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const n = ctx.count(3, 4, 1);
    scene.box(0, 0, 0, 120, 70, 16, state === "empty" ? "ghost" : "base");
    scene.box(0, -34, 16, 130, 10, 6, state === "empty" ? "ghost" : "muted");
    for (let k = 0; k < 4; k++) {
      const q = state === "loading" ? (ctx.loop(2.4) + k * 0.2) % 1 : 0;
      const z = k < n ? 16 + (state === "loading" ? 10 * Math.sin(q * Math.PI) : 0) + k * 2 : -8;
      const Z = m.files[k]!.to(state === "empty" ? -8 : z).value;
      if (k >= n && state !== "loading") continue;
      scene.box(0 + (state === "error" && k === 0 ? shake : 0), -22 + k * 3, Z + 16 - (k === 0 ? 0 : 0), 84, 22, 2, state === "success" ? "ok" : state === "error" && k === 0 ? "err" : "muted", state === "empty" ? 0.5 : 1);
    }
    if (state === "success") scene.check(44, 30, 18, "ok", ctx.fade());
    if (state === "error") scene.cross(44, 30, 18, "err", ctx.fade());
  },
});

/** A parcel being packed into a shipping box. Use for fulfilment, packing and bulk operations. */
export const pack = defineFigure({
  name: "Pack",
  label: "A parcel dropping into a box",
  offset: 6,
  setup: ({ spring }) => ({ drop: spring(40, 160, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let z = 40;
    if (state === "loading") z = 40 - 34 * smoothstep(ctx.loop(2));
    if (state === "success") z = 0;
    if (state === "error") z = 30;
    const Z = m.drop.to(z).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 90, 90, 6, tone);
    scene.box(-45, 0, 6, 6, 90, 22, "muted");
    scene.box(45, 0, 6, 6, 90, 22, "muted");
    scene.box(0, -45, 6, 90, 6, 22, "muted");
    if (state !== "empty") parcel(scene, shake, 0, Z + 6, tone === "base" ? "base" : tone);
    if (state === "success") scene.check(0, 0, 40, "ok", ctx.fade());
    if (state === "error") scene.cross(0, 0, 40, "err", ctx.fade());
  },
});

/** A pinned note with a pin dropping in. Use for pins, bookmarks and highlights. */
export const pin = defineFigure({
  name: "Pin",
  label: "A pin dropping onto a card",
  offset: 4,
  setup: ({ spring }) => ({ drop: spring(40, 170, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    let z = 40;
    if (state === "loading") z = 40 - 30 * bump(ctx.loop(1.6));
    if (state === "success" || state === "error") z = 12;
    if (state === "idle") z = 40 - ctx.hover * 8;
    const Z = m.drop.to(z).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : state === "loading" ? "hi" : state === "empty" ? "ghost" : "base";
    scene.box(0, 0, 0, 96, 70, 3, "base");
    for (let k = 0; k < 3; k++) scene.line([-32, -18 + k * 14, 3.05], [22 - k * 6, -18 + k * 14, 3.05], "muted");
    scene.cylinder(-18 + shake, 10, 3, 3, Math.max(0.5, Z - 3), tone);
    scene.disc(-18 + shake, 10, Z, 6, tone, { fill: true });
    if (state === "success") scene.check(30, 22, 3, "ok", ctx.fade());
    if (state === "error") scene.cross(30, 22, 3, "err", ctx.fade());
  },
});

/** A whiteboard being drawn on, one stroke after another. Use for brainstorms, collaboration and drawing tools. */
export const whiteboard = defineFigure({
  name: "Whiteboard",
  label: "A whiteboard being drawn on",
  offset: 4,
  setup: ({ spring }) => ({ ink: spring(0, 130, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const strokes = state === "loading" ? Math.floor(ctx.loop(3.2) * 4) : state === "success" ? 4 : state === "empty" ? 0 : 2;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : "muted";
    scene.box(0, 0, 0, 130, 90, 3, "base");
    scene.rect(-54, -36, 54, 36, 3.05, "faint");
    const paths: [number, number][][] = [
      [[-42, -20], [-20, -28], [-6, -10]],
      [[0, -26], [18, -26], [34, -10]],
      [[-40, 8], [-10, 12], [16, 6], [40, 14]],
      [[-22, 26], [0, 22], [22, 30]],
    ];
    paths.slice(0, strokes).forEach((p, i) => {
      const pts = p.map(([x, y]) => [x + (state === "error" && i === 3 ? shake : 0), y, 3.1] as Vec3);
      scene.polyline(pts, state === "loading" && i === strokes - 1 ? "hi" : i === 3 && state === "error" ? "err" : tone, { bold: true });
    });
    if (state === "success") scene.check(44, 30, 3, "ok", ctx.fade());
    if (state === "error") scene.cross(44, 30, 3, "err", ctx.fade());
  },
});

/** A chart of tasks completing on a progress track with a flag at the finish. Use for milestones, goals and launches. */
export const milestone = defineFigure({
  name: "Milestone",
  label: "A track with milestones and a flag",
  offset: 4,
  setup: ({ spring }) => ({ runner: spring(0, 120, 16) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    const shake = ctx.shake();
    const p = state === "loading" ? ctx.progress(3) : state === "success" ? 1 : state === "error" ? 0.45 : state === "empty" ? 0 : 0.3;
    const P = m.runner.to(p).value;
    const tone = state === "error" ? "err" : state === "success" ? "ok" : "base";
    scene.box(0, 0, 0, 150, 60, 3, "base");
    scene.line([-60, 0, 4], [60, 0, 4], "faint", { bold: true });
    scene.line([-60, 0, 4.05], [-60 + 120 * P, 0, 4.05], tone === "base" ? "hi" : tone, { bold: true });
    [-30, 0, 30].forEach(x => scene.disc(x, 0, 4.1, 4, x / 60 < P - 0.5 ? "hi" : "muted", { fill: true }));
    scene.line([58, 0, 4], [58, 0, 36], "base", { bold: true });
    scene.polyline([[58, 0, 36], [58, 0, 36], [72, 0, 36]].map(([a, b, c]) => [a, b, c] as Vec3), tone, { closed: true });
    scene.disc(-60 + 120 * P + shake, 0, 6, 4, tone, { fill: true });
    if (state === "success") scene.check(58, 0, 40, "ok", ctx.fade());
    if (state === "error") scene.cross(-60 + 120 * P + shake, 0, 16, "err", ctx.fade());
  },
});
