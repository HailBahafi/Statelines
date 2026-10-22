import type { FigureOptions, FigureState } from "statelines";
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
  if (inline.length <= 72) return `import { ${name} } from "statelines/react";\n\n${inline}`;
  return `import { ${name} } from "statelines/react";\n\n<${name}\n${props.map(p => `  ${p}`).join("\n")}\n/>`;
}

/** The options other than `state` that differ from the defaults, as object entries (`key: value`). */
function extraOptions(entry: Entry, s: Settings): string[] {
  const out: string[] = [];
  if (entry.progress && s.state === "loading" && s.progress !== undefined) out.push(`progress: ${s.progress.toFixed(2)}`);
  if (entry.count && s.count !== undefined) out.push(`count: ${clamp(s.count, entry.count[0], entry.count[1])}`);
  if (s.intensity !== DEFAULTS.intensity) out.push(`intensity: ${s.intensity}`);
  if (s.speed !== DEFAULTS.speed) out.push(`speed: ${s.speed}`);
  if (s.stroke !== DEFAULTS.stroke) out.push(`stroke: ${s.stroke}`);
  if (!s.interactive) out.push("interactive: false");
  const pairs = Object.entries(s.colors).filter(([, v]) => v).map(([k, v]) => `${k}: "${v}"`);
  if (pairs.length) out.push(`colors: { ${pairs.join(", ")} }`);
  return out;
}

/** `{ state: <expr>, ...extras }` on one line. */
const optionObject = (entry: Entry, s: Settings, state: string) => `{ ${[`state: ${state}`, ...extraOptions(entry, s)].join(", ")} }`;

/** One way to set up a figure in an app: the tab label, the file it goes in, and the code. */
export interface Recipe { id: string; label: string; file: string; note: string; code: string }

/** Every supported way to use a figure, with the current playground settings. */
export function recipes(entry: Entry, s: Settings): Recipe[] {
  const name = entry.figure.definition.name, fn = entry.key, tag = `${fn.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}-figure`;
  const props = propsOf(entry, s).filter(p => !p.startsWith("state="));
  const jsxProps = ["state={status}", ...props].join(" ");
  const opts = (state: string) => optionObject(entry, s, state);
  return [
    {
      id: "react", label: "React", file: `${name}Status.tsx`,
      note: "The component mounts on first render, updates when props change and cleans up on unmount.",
      code: `import { useState } from "react";
import type { FigureState } from "statelines";
import { ${name} } from "statelines/react";

export function ${name}Status() {
  const [status, setStatus] = useState<FigureState>("${s.state}");
  // Call setStatus("loading" | "success" | "error" | "empty") as your work runs.
  return <${name} ${jsxProps} />;
}`,
    },
    {
      id: "next", label: "Next.js", file: `app/components/${name}Status.tsx`,
      note: "statelines/react is already a client module, so it works from server and client components alike. Keep the state in a client component.",
      code: `"use client";

import type { FigureState } from "statelines";
import { ${name} } from "statelines/react";

export function ${name}Status({ status }: { status: FigureState }) {
  return <${name} ${jsxProps} />;
}

// In any page or layout:
// <${name}Status status="${s.state}" />`,
    },
    {
      id: "vue", label: "Vue", file: `${name}Figure.vue`,
      note: "A small wrapper: mount on mounted, update when the prop changes, destroy on unmount.",
      code: `<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ${fn}, type FigureInstance, type FigureState } from "statelines";

const props = defineProps<{ status: FigureState }>();
const host = ref<HTMLElement>();
let figure: FigureInstance | undefined;

onMounted(() => { figure = ${fn}(host.value!, ${opts("props.status")}); });
watch(() => props.status, status => figure?.update({ state: status }));
onBeforeUnmount(() => figure?.destroy());
</script>

<template>
  <div ref="host" />
</template>

<!-- Use it: <${name}Figure status="${s.state}" /> -->`,
    },
    {
      id: "svelte", label: "Svelte", file: `${name}Figure.svelte`,
      note: "Works in Svelte 4 and 5. The reactive line keeps the figure in step with the prop.",
      code: `<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { ${fn}, type FigureInstance, type FigureState } from "statelines";

  export let status: FigureState = "${s.state}";
  let host: HTMLDivElement;
  let figure: FigureInstance | undefined;

  onMount(() => { figure = ${fn}(host, ${opts("status")}); });
  $: figure?.update({ state: status });
  onDestroy(() => figure?.destroy());
</script>

<div bind:this={host}></div>

<!-- Use it: <${name}Figure status="${s.state}" /> -->`,
    },
    {
      id: "angular", label: "Angular", file: `${tag}.component.ts`,
      note: "A standalone component. Import it where you need it and bind [status].",
      code: `import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from "@angular/core";
import { ${fn}, type FigureInstance, type FigureState } from "statelines";

@Component({
  selector: "app-${tag}",
  standalone: true,
  template: \`<div #host></div>\`,
})
export class ${name}FigureComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() status: FigureState = "${s.state}";
  @ViewChild("host") host!: ElementRef<HTMLDivElement>;
  private figure?: FigureInstance;

  ngAfterViewInit() { this.figure = ${fn}(this.host.nativeElement, ${opts("this.status")}); }
  ngOnChanges() { this.figure?.update({ state: this.status }); }
  ngOnDestroy() { this.figure?.destroy(); }
}

// Use it: <app-${tag} [status]="status"></app-${tag}>`,
    },
    {
      id: "js", label: "JavaScript", file: "main.ts",
      note: "No framework: mount into any element, then call update as your work runs.",
      code: `import { ${fn} } from "statelines";

const figure = ${fn}(document.getElementById("${tag}")!, ${opts(`"${s.state}"`)});

// Later, as your work runs:
figure.update({ state: "success" });
// figure.destroy() when the element goes away.`,
    },
    {
      id: "html", label: "HTML", file: "index.html",
      note: "No build step: load the package from a CDN as an ES module.",
      code: `<div id="${tag}" style="width: 320px"></div>

<script type="module">
  import { ${fn} } from "https://cdn.jsdelivr.net/npm/statelines/+esm";

  const figure = ${fn}(document.getElementById("${tag}"), ${opts(`"${s.state}"`)});
  // figure.update({ state: "success" });
</script>`,
    },
  ];
}

/** The vanilla usage for a figure, with the current options. */
export function vanillaSnippet(entry: Entry, s: Settings): string {
  const fn = entry.key;
  const opts = toOptions(entry, s);
  const lines = Object.entries(opts)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `  ${k}: ${typeof v === "string" ? `"${v}"` : typeof v === "object" ? JSON.stringify(v) : String(v)},`);
  const body = lines.length ? `{\n${lines.join("\n")}\n}` : "";
  return `import { ${fn} } from "statelines";\n\n${fn}(document.getElementById("figure")${body ? `, ${body}` : ""});`;
}
