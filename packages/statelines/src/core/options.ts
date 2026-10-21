import { clamp } from "../engine/math";
import type { FigureColors, FigureDefinition, FigureOptions } from "./types";

export type Resolved = Required<Omit<FigureOptions, "progress" | "count" | "colors" | "stroke">> &
  Pick<FigureOptions, "progress" | "count" | "colors" | "stroke">;

export const defaults = (definition: FigureDefinition<any>): Resolved => ({
  state: "idle",
  intensity: 0.5,
  theme: "auto",
  label: definition.label,
  play: false,
  speed: 1,
  progress: undefined,
  count: undefined,
  interactive: true,
  marks: true,
  colors: undefined,
  stroke: undefined,
});

/** Merges `next` into `current`: a key set to undefined returns to its default, a key left out stays. */
export function merge(current: Resolved, next: FigureOptions, fallback: Resolved): void {
  for (const key of Object.keys(fallback) as (keyof Resolved)[]) {
    if (key in next) (current as Record<string, unknown>)[key] = next[key] ?? fallback[key];
  }
}

export const finite = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export const optionalFinite = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const COLOR_KEYS: (keyof FigureColors)[] = ["plate", "hi", "edge", "mid", "lo", "ok", "err"];

/** The custom properties a figure's own colours and stroke set on its element. */
export function cssVariables(colors?: FigureColors, stroke?: number): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of COLOR_KEYS) {
    const value = colors?.[key];
    if (value) vars[`--statelines-${key}`] = value;
  }
  const width = optionalFinite(stroke);
  if (width !== undefined) vars["--statelines-stroke"] = String(clamp(width, 0.25, 4));
  return vars;
}
