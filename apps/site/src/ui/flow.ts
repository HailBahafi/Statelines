import type { FigureInstance, FigureState } from "statelines";

/** Loading runs slowly at rest, so a page of looping figures stays calm. */
export const REST_SPEED = 0.55;
const FAST_SPEED = 1;
const FINISH_MS = 2200;
const HOLD_MS = 2200;

/** Figures whose hover story plays more slowly, so their motion stays readable. */
const SLOW = new Set([
  "Discover", "Outreach", "Inbox", "Chat", "Code", "Denied", "Wallet", "Plans",
  "SignIn", "Calendar", "Write", "Gallery", "Sign", "Notes", "Streak",
]);
const SLOW_SPEED = 0.5;
const SLOW_FINISH_MS = 3600;
const SLOW_HOLD_MS = 3200;

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
export function attachFlow(card: HTMLElement, instance: FigureInstance, options: { progress: boolean; state: FigureState; name?: string }): Flow {
  let state = options.state;
  const slow = options.name !== undefined && SLOW.has(options.name);
  const fast = slow ? SLOW_SPEED : FAST_SPEED, finishMs = slow ? SLOW_FINISH_MS : FINISH_MS, holdMs = slow ? SLOW_HOLD_MS : HOLD_MS;
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
    instance.update({ state: "loading", speed: fast });
    if (!options.progress) { timers.push(setTimeout(done, finishMs)); return; }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / finishMs);
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
      timers.push(setTimeout(cycle, holdMs));
    }, holdMs));
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
