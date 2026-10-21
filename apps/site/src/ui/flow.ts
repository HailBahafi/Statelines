import type { FigureInstance, FigureState } from "statelines";

/** Loading runs slowly at rest, so a page of looping figures stays calm. */
export const REST_SPEED = 0.55;
const FAST_SPEED = 3;
const FINISH_MS = 900;
const HOLD_MS = 1500;

export interface Flow {
  /** The state the card shows when the pointer is away. */
  setState(state: FigureState): void;
  destroy(): void;
}

/**
 * Plays the whole story of a figure while the pointer is on its card: loading speeds up and
 * finishes, then success, then error, then round again. Only runs when the card rests in
 * loading; in any other state the card simply shows that state.
 */
export function attachFlow(card: HTMLElement, instance: FigureInstance, options: { progress: boolean; state: FigureState }): Flow {
  let state = options.state;
  let timers: ReturnType<typeof setTimeout>[] = [];
  let frame = 0;

  const rest = () => instance.update({ state, speed: state === "loading" ? REST_SPEED : 1, progress: undefined });
  const stop = () => {
    timers.forEach(clearTimeout);
    timers = [];
    cancelAnimationFrame(frame);
  };

  // Figures that show real progress fill to the end; the others just run fast.
  const finish = (done: () => void) => {
    instance.update({ state: "loading", speed: FAST_SPEED });
    if (!options.progress) { timers.push(setTimeout(done, FINISH_MS)); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FINISH_MS);
      instance.update({ progress: t });
      if (t < 1) frame = requestAnimationFrame(step);
      else done();
    };
    frame = requestAnimationFrame(step);
  };

  const cycle = () => finish(() => {
    instance.update({ state: "success", speed: 1, progress: undefined });
    timers.push(setTimeout(() => {
      instance.update({ state: "error" });
      timers.push(setTimeout(cycle, HOLD_MS));
    }, HOLD_MS));
  });

  const enter = () => { if (state === "loading") { stop(); cycle(); } };
  const leave = () => { stop(); rest(); };
  card.addEventListener("pointerenter", enter);
  card.addEventListener("pointerleave", leave);
  rest();

  return {
    setState(next) { state = next; stop(); rest(); },
    destroy() {
      stop();
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointerleave", leave);
    },
  };
}
