import { Scene, type Tone } from "../engine/scene";
import { Spring } from "../engine/spring";
import { clamp, wrap } from "../engine/math";
import type { DrawContext, FigureDefinition, FigureState } from "./types";

/** Half the viewBox, used to normalise the pointer. */
const HALF_W = 140;
const HALF_H = 112;
const unproject = (sx: number, sy: number, z: number) => {
  const u = sx / Math.cos(Math.PI / 6), v = 2 * (sy + z);
  return { x: (u + v) / 2, y: (v - u) / 2 };
};

/**
 * Runs one figure without touching the DOM: it keeps time, state and springs, and turns
 * each frame into markup. The DOM layer and the static renderer both drive it.
 */
export class Runner<Model> {
  state: FigureState = "idle";
  intensity = 0.5;
  reducedMotion = false;
  speed = 1;
  progressValue: number | undefined;
  countValue: number | undefined;
  marks = true;

  private clock = 0;
  private loopClock = 0;
  private stateStart = 0;
  private live = false;
  private scene = new Scene();
  private readonly springs: Spring[] = [];
  private readonly px = new Spring(0, 90, 19);
  private readonly py = new Spring(0, 90, 19);
  private readonly over = new Spring(0, 90, 19);
  private readonly model: Model;
  private readonly ctx: DrawContext;

  constructor(readonly definition: FigureDefinition<Model>) {
    this.model = definition.setup({
      spring: (initial = 0, stiffness, damping) => {
        const spring = new Spring(initial, stiffness, damping);
        this.springs.push(spring);
        return spring;
      },
    });
    this.ctx = this.createContext();
  }

  setState(state: FigureState): void {
    if (state === this.state) return;
    this.state = state;
    this.stateStart = this.clock;
  }

  pointerMove(x: number, y: number): void {
    this.px.to(x);
    this.py.to(y - (this.definition.offset ?? 0));
    this.over.to(1);
  }

  pointerLeave(): void {
    this.px.to(0);
    this.py.to(0);
    this.over.to(0);
  }

  /** Draws one frame, then advances every spring. `active` is false once nothing is left to move. */
  frame(dt: number): { markup: string; active: boolean } {
    const pace = this.reducedMotion ? 0.4 : 1;
    this.clock += dt * pace;
    this.loopClock += dt * pace * this.speed;
    this.live = false;
    this.scene = new Scene(this.definition.offset ?? 0, this.marks);
    this.definition.draw(this.ctx, this.model);

    let moving = false;
    for (const spring of [this.px, this.py, this.over]) {
      spring.step(dt);
      if (!spring.resting) moving = true;
    }
    for (const spring of this.springs) {
      spring.step(dt);
      if (!spring.resting) moving = true;
    }
    // Every figure answers the pointer. The whole drawing leans a little toward it, so a figure
    // with no bespoke hover response still moves. Figures with one add it on top.
    let markup = this.scene.toString();
    const lean = this.over.value * (0.4 + this.intensity) * 2.5;
    if (lean > 0.01) {
      const x = (this.px.value / HALF_W) * lean, y = (this.py.value / HALF_H) * lean;
      markup = `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})">${markup}</g>`;
    }
    return { markup, active: moving || this.live };
  }

  private createContext(): DrawContext {
    const runner = this;
    const strength = () => runner.over.value * (0.5 + runner.intensity);
    return {
      get scene() { return runner.scene; },
      get state() { return runner.state; },
      get time() { runner.live = true; return runner.loopClock; },
      get determinate() { return runner.progressValue !== undefined; },
      get stateTime() { return runner.clock - runner.stateStart; },
      get intensity() { return runner.intensity; },
      pointer: {
        get x() { return runner.px.value; },
        get y() { return runner.py.value; },
        get over() { return runner.over.value; },
      },
      get hover() { return strength(); },
      fade(duration = 0.3) {
        const value = clamp((runner.clock - runner.stateStart) / duration);
        if (value < 1) runner.live = true;
        return value;
      },
      loop(period) {
        runner.live = true;
        return wrap(runner.loopClock, period) / period;
      },
      progress(period) {
        return runner.progressValue !== undefined ? clamp(runner.progressValue) : this.loop(period);
      },
      count(fallback, max, min = 0) {
        const value = runner.countValue ?? fallback;
        return Math.round(clamp(value, min, max));
      },
      shake(amplitude = 6) {
        if (runner.state !== "error" || runner.reducedMotion) return 0;
        const t = runner.clock - runner.stateStart;
        if (t > 1.2) return 0;
        runner.live = true;
        return Math.sin(t * 48) * amplitude * Math.exp(-t * 4.5);
      },
      lean(reach) {
        const nx = runner.px.value / HALF_W, ny = runner.py.value / HALF_H, k = strength() * reach;
        return { x: (nx * 0.6 + ny * 0.8) * k, y: (-nx * 0.6 + ny * 0.8) * k };
      },
      ground(z = 0) {
        return unproject(runner.px.value, runner.py.value, z);
      },
      verdict(fallback: Tone = "base"): Tone {
        return runner.state === "success" ? "ok" : runner.state === "error" ? "err" : fallback;
      },
    };
  }
}
