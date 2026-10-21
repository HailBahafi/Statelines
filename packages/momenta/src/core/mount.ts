import { injectStyles } from "../engine/styles";
import { sleep, wake, type Task } from "../engine/loop";
import { clamp } from "../engine/math";
import { PLAY_INTERVAL_MS, PLAY_SEQUENCE, VIEWBOX } from "./constants";
import { cssVariables, defaults, finite, merge, optionalFinite, type Resolved } from "./options";
import { Runner } from "./runner";
import type { FigureDefinition, FigureInstance, FigureOptions } from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Draws a figure into `element` and keeps it answering the pointer and its options. */
export function mount<Model>(
  definition: FigureDefinition<Model>,
  element: HTMLElement,
  options: FigureOptions = {},
): FigureInstance {
  injectStyles();
  const fallback = defaults(definition);
  const current: Resolved = { ...fallback };
  const runner = new Runner(definition);
  runner.reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", VIEWBOX);
  svg.setAttribute("role", "img");
  const group = document.createElementNS(SVG_NS, "g");
  svg.appendChild(group);
  element.classList.add("momenta");
  element.appendChild(svg);

  let markup = "";
  let visible = true;
  let hovering = false;
  let styled: string[] = [];

  const task: Task = {
    tick(dt) {
      const frame = runner.frame(dt);
      if (frame.markup !== markup) {
        group.innerHTML = frame.markup;
        markup = frame.markup;
      }
      return frame.active && visible;
    },
  };
  const refresh = () => { if (visible) wake(task); };

  const onMove = (event: PointerEvent) => {
    if (!current.interactive) return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    hovering = true;
    runner.pointerMove(p.x, p.y);
    refresh();
  };
  const onLeave = () => {
    hovering = false;
    runner.pointerLeave();
    refresh();
  };
  svg.addEventListener("pointermove", onMove);
  svg.addEventListener("pointerleave", onLeave);

  const observer = typeof IntersectionObserver === "function"
    ? new IntersectionObserver(([entry]) => {
        visible = !!entry?.isIntersecting;
        if (visible) refresh(); else sleep(task);
      })
    : null;
  observer?.observe(svg);

  let playTimer: ReturnType<typeof setInterval> | undefined;
  let playIndex = 0;
  const syncPlay = () => {
    clearInterval(playTimer);
    playTimer = undefined;
    if (current.play && !runner.reducedMotion) {
      playTimer = setInterval(() => {
        if (hovering || !visible) return;
        playIndex = (playIndex + 1) % PLAY_SEQUENCE.length;
        runner.setState(PLAY_SEQUENCE[playIndex]!);
        refresh();
      }, PLAY_INTERVAL_MS);
    } else {
      runner.setState(current.state);
    }
  };

  const syncStyle = () => {
    for (const name of styled) element.style.removeProperty(name);
    const vars = cssVariables(current.colors, current.stroke);
    for (const [name, value] of Object.entries(vars)) element.style.setProperty(name, value);
    styled = Object.keys(vars);
  };

  const apply = (next: FigureOptions) => {
    merge(current, next, fallback);
    runner.intensity = clamp(finite(current.intensity, 0.5));
    runner.speed = clamp(finite(current.speed, 1), 0, 4);
    const progress = optionalFinite(current.progress);
    runner.progressValue = progress === undefined ? undefined : clamp(progress);
    runner.countValue = optionalFinite(current.count);
    runner.marks = current.marks !== false;
    if (!current.interactive) { hovering = false; runner.pointerLeave(); }
    element.dataset.theme = current.theme;
    svg.setAttribute("aria-label", current.label);
    syncStyle();
    syncPlay();
    refresh();
  };

  apply(options);

  return {
    update: apply,
    destroy() {
      clearInterval(playTimer);
      observer?.disconnect();
      sleep(task);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerleave", onLeave);
      svg.remove();
      for (const name of styled) element.style.removeProperty(name);
      element.classList.remove("momenta");
      delete element.dataset.theme;
    },
  };
}
