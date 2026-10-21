import type { Scene, Tone } from "../engine/scene";
import type { Spring } from "../engine/spring";

/** The five moments every figure can show. */
export type FigureState = "idle" | "loading" | "success" | "error" | "empty";

export const FIGURE_STATES: readonly FigureState[] = ["idle", "loading", "success", "error", "empty"];

export type Theme = "auto" | "light" | "dark";

/** Colours a single figure can override. Anything left out follows the page theme. */
export interface FigureColors {
  plate?: string;
  hi?: string;
  edge?: string;
  mid?: string;
  lo?: string;
  ok?: string;
  err?: string;
}

export interface FigureOptions {
  /** What the figure shows. Default "idle". */
  state?: FigureState;
  /** How strongly the figure answers the pointer, 0…1. Default 0.5. */
  intensity?: number;
  /** "auto" follows the page. Default "auto". */
  theme?: Theme;
  /** The accessible name. Defaults to a description of the figure. */
  label?: string;
  /** Walks through every state on its own until the pointer arrives. Default false. */
  play?: boolean;
  /** Animation speed multiplier, 0…4. Default 1. */
  speed?: number;
  /**
   * Real progress, 0…1, shown during "loading" instead of a loop. Leave undefined for an
   * indeterminate loop. Figures that can't show progress ignore it.
   */
  progress?: number;
  /** How many items the figure holds: rows, cards, coins, keys, seats. Each figure clamps it. */
  count?: number;
  /** Answer the pointer. Default true. */
  interactive?: boolean;
  /** Kept for compatibility. Figures no longer draw a tick or a cross, so this has no effect. */
  marks?: boolean;
  /** Per-figure colours, on top of the theme. */
  colors?: FigureColors;
  /** Stroke width in CSS pixels. Default 1. */
  stroke?: number;
}

export interface SetupContext {
  /** A spring the runner steps after every frame. Create springs here, never in `draw`. */
  spring(initial?: number, stiffness?: number, damping?: number): Spring;
}

export interface DrawContext {
  readonly scene: Scene;
  readonly state: FigureState;
  /** Seconds since mount, scaled by `speed`. Reading it keeps the figure animating, so read it only in looping states. */
  readonly time: number;
  /** True when the user passed `progress`, so "loading" should show it rather than loop. */
  readonly determinate: boolean;
  /** Seconds since the state last changed. Does not keep the figure awake. */
  readonly stateTime: number;
  readonly intensity: number;
  /** The pointer in the figure's own coordinates, eased; `over` eases between 0 and 1. */
  readonly pointer: { readonly x: number; readonly y: number; readonly over: number };
  /** `pointer.over` scaled by intensity: multiply hover responses by it. */
  readonly hover: number;
  /** 0 → 1 over `duration` seconds after a state change, for marks that draw in. */
  fade(duration?: number): number;
  /** A looping phase 0…1 with the given period in seconds. Keeps the figure awake. */
  loop(period: number): number;
  /** The user's `progress` when given; otherwise the same looping phase as `loop(period)`. */
  progress(period: number): number;
  /** The user's `count`, rounded and clamped to min…max, or `fallback`. */
  count(fallback: number, max: number, min?: number): number;
  /** A decaying shake on entering "error"; 0 in every other state. */
  shake(amplitude?: number): number;
  /** A world-space offset toward the pointer, `reach` units at full strength. */
  lean(reach: number): { x: number; y: number };
  /** The pointer projected back onto the horizontal plane at height z. */
  ground(z?: number): { x: number; y: number };
  /** "ok" on success, "err" on error, otherwise `fallback`. */
  verdict(fallback?: Tone): Tone;
}

export interface FigureDefinition<Model = unknown> {
  /** PascalCase name, used for the React component. */
  name: string;
  /** Default accessible description. */
  label: string;
  /** Moves the drawing up (negative) or down (positive) inside the frame. */
  offset?: number;
  setup(ctx: SetupContext): Model;
  draw(ctx: DrawContext, model: Model): void;
}

export interface FigureInstance {
  /** A key set to `undefined` returns to its default; a key left out keeps its value. */
  update(options: FigureOptions): void;
  destroy(): void;
}

export interface Figure<Model = unknown> {
  (element: HTMLElement, options?: FigureOptions): FigureInstance;
  readonly definition: FigureDefinition<Model>;
}
