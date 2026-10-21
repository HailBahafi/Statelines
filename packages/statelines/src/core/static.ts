import { clamp } from "../engine/math";
import { VIEWBOX } from "./constants";
import { cssVariables, optionalFinite } from "./options";
import { Runner } from "./runner";
import type { Figure, FigureDefinition, FigureOptions } from "./types";

export interface RenderOptions extends Omit<FigureOptions, "play" | "interactive" | "speed"> {
  /** Seconds simulated before the frame is taken. Default 1.2, enough for every figure to settle. */
  at?: number;
}

const escape = (value: string) =>
  value.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * Renders one frame of a figure to an HTML string, with no DOM. Use it for server rendering,
 * static exports and snapshots. Include `styles` once on the page for the colours.
 */
export function renderToString(figure: Figure<any> | FigureDefinition<any>, options: RenderOptions = {}): string {
  const definition = "definition" in figure ? figure.definition : figure;
  const runner = new Runner(definition);
  runner.intensity = clamp(options.intensity ?? 0.5);
  const progress = optionalFinite(options.progress);
  runner.progressValue = progress === undefined ? undefined : clamp(progress);
  runner.countValue = optionalFinite(options.count);
  runner.marks = options.marks !== false;
  runner.setState(options.state ?? "idle");

  const steps = Math.max(1, Math.round((options.at ?? 1.2) * 60));
  let markup = "";
  for (let i = 0; i < steps; i++) markup = runner.frame(1 / 60).markup;

  const vars = Object.entries(cssVariables(options.colors, options.stroke)).map(([k, v]) => `${k}:${escape(v)}`).join(";");
  const style = vars ? ` style="${vars}"` : "";
  const label = escape(options.label ?? definition.label);
  return `<div class="statelines" data-theme="${options.theme ?? "auto"}"${style}>` +
    `<svg viewBox="${VIEWBOX}" role="img" aria-label="${label}"><g>${markup}</g></svg></div>`;
}
