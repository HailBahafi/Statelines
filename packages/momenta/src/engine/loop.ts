/** Something that draws a frame and says whether it still has motion left. */
export interface Task {
  tick(dt: number): boolean;
}

const MAX_DT = 1 / 20;
const running = new Set<Task>();
let handle = 0;
let last = 0;

function tick(now: number): void {
  const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000));
  last = now;
  for (const task of running) if (!task.tick(dt)) running.delete(task);
  handle = running.size ? requestAnimationFrame(tick) : 0;
}

/**
 * Every figure on the page shares one animation frame. A figure joins when something changes
 * and leaves once it has settled, so a page of resting figures costs nothing.
 */
export function wake(task: Task): void {
  running.add(task);
  if (!handle && typeof requestAnimationFrame !== "undefined") {
    last = performance.now();
    handle = requestAnimationFrame(tick);
  }
}

export function sleep(task: Task): void {
  running.delete(task);
}
