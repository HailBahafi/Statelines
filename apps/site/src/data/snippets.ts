import type { FigureOptions, FigureState } from "momenta";
import type { Entry } from "./catalog";

/** What the playground controls set. `undefined` means "use the default". */
export interface Settings {
  state: FigureState;
  intensity: number;
  speed: number;
  stroke: number;
  marks: boolean;
  interactive: boolean;
  progress?: number;
  count?: number;
  colors: { plate?: string; hi?: string; ok?: string; err?: string; mid?: string; edge?: string };
}

export const DEFAULTS: Settings = {
  state: "idle", intensity: 0.5, speed: 1, stroke: 1, marks: true, interactive: true, colors: {},
};

/** The options a figure receives for these settings. Progress and count apply only where the figure supports them. */
export function toOptions(entry: Entry, s: Settings): FigureOptions {
  const colors = Object.fromEntries(Object.entries(s.colors).filter(([, v]) => v)) as FigureOptions["colors"];
  const hasColors = colors && Object.keys(colors).length > 0;
  return {
    state: s.state,
    intensity: s.intensity,
    speed: s.speed,
    stroke: s.stroke,
    marks: s.marks,
    interactive: s.interactive,
    progress: entry.progress && s.state === "loading" ? s.progress : undefined,
    count: entry.count && s.count !== undefined ? clamp(s.count, entry.count[0], entry.count[1]) : undefined,
    colors: hasColors ? colors : undefined,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The props that differ from the defaults, as they would be written in JSX. */
export function propsOf(entry: Entry, s: Settings): string[] {
  const props = [`state="${s.state}"`];
  if (entry.progress && s.state === "loading" && s.progress !== undefined) props.push(`progress={${s.progress.toFixed(2)}}`);
  if (entry.count && s.count !== undefined) props.push(`count={${clamp(s.count, entry.count[0], entry.count[1])}}`);
  if (s.intensity !== DEFAULTS.intensity) props.push(`intensity={${s.intensity}}`);
  if (s.speed !== DEFAULTS.speed) props.push(`speed={${s.speed}}`);
  if (s.stroke !== DEFAULTS.stroke) props.push(`stroke={${s.stroke}}`);
  if (!s.marks) props.push("marks={false}");
  if (!s.interactive) props.push("interactive={false}");
  const pairs = Object.entries(s.colors).filter(([, v]) => v).map(([k, v]) => `${k}: "${v}"`);
  if (pairs.length) props.push(`colors={{ ${pairs.join(", ")} }}`);
  return props;
}

/** The React usage for a figure, with the current props. */
export function reactSnippet(entry: Entry, s: Settings): string {
  const name = entry.figure.definition.name;
  const props = propsOf(entry, s);
  const inline = `<${name} ${props.join(" ")} />`;
  if (inline.length <= 72) return `import { ${name} } from "momenta/react";\n\n${inline}`;
  return `import { ${name} } from "momenta/react";\n\n<${name}\n${props.map(p => `  ${p}`).join("\n")}\n/>`;
}

/** The vanilla usage for a figure, with the current options. */
export function vanillaSnippet(entry: Entry, s: Settings): string {
  const fn = entry.key;
  const opts = toOptions(entry, s);
  const lines = Object.entries(opts)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `  ${k}: ${typeof v === "string" ? `"${v}"` : typeof v === "object" ? JSON.stringify(v) : String(v)},`);
  const body = lines.length ? `{\n${lines.join("\n")}\n}` : "";
  return `import { ${fn} } from "momenta";\n\n${fn}(document.getElementById("figure")${body ? `, ${body}` : ""});`;
}
