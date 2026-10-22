import "../styles/site.css";
import { FIGURE_STATES } from "statelines";
import { findEntry, neighbours, shelfOf, slugOf, type Entry } from "../data";
import { DEFAULTS, recipes, toOptions, type Settings } from "../data/snippets";
import { applyStoredTheme, mountFooter, mountHeader } from "../ui/shell";
import { $, codeBlock, h } from "../ui/dom";

applyStoredTheme();
mountHeader("figures");
mountFooter();

const app = $("#app");
const slug = decodeURIComponent(location.pathname.replace(/\/+$/, "").split("/").pop() ?? "");
const entry = findEntry(slug);

if (!entry) {
  app.replaceChildren(
    h("div", { class: "empty-state" },
      h("h1", { style: "font-size:32px;color:var(--ink)" }, "Figure not found"),
      h("p", { style: "margin:12px 0 24px" }, `There is no figure called “${slug}”.`),
      h("a", { class: "btn", href: "/figures" }, "Browse the figures")));
} else {
  render(entry);
}

function render(figure: Entry): void {
  const shelf = shelfOf(figure);
  const name = figure.figure.definition.name;
  document.title = `${name} · statelines`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", `${name}: ${figure.use}. Every state, every option, and the code to use it.`);
  const settings: Settings = { ...DEFAULTS, colors: {} };

  // ── Header and pager ────────────────────────────────────────
  const { prev, next } = neighbours(figure);
  const pagerLink = (target: Entry | undefined, text: string) => target
    ? h("a", { class: "btn", href: `/figures/${slugOf(target)}`, "aria-label": `${text}: ${target.figure.definition.name}` }, text)
    : null;

  // ── Preview ────────────────────────────────────────────────
  const stage = h("div", { class: "stage" });
  const instance = figure.figure(stage, toOptions(figure, settings));
  const stateButtons = FIGURE_STATES.map(s => {
    const button = h("button", { type: "button", "data-state": s, "aria-pressed": s === settings.state ? "true" : "false" }, s);
    button.addEventListener("click", () => { settings.state = s; refresh(); });
    return button;
  });

  // ── Controls ───────────────────────────────────────────────
  const range = (label: string, min: number, max: number, step: number, value: number,
                 set: (v: number) => void, format: (v: number) => string) => {
    const out = h("output", {}, format(value));
    const input = h("input", { type: "range", min, max, step, value, "aria-label": label }) as HTMLInputElement;
    input.addEventListener("input", () => { const v = Number(input.value); out.textContent = format(v); set(v); refresh(); });
    return h("div", { class: "control" }, h("div", { class: "control-row" }, h("label", {}, label), out), input);
  };
  const toggle = (label: string, initial: boolean, set: (on: boolean) => void) => {
    const button = h("button", { type: "button", class: "toggle", "aria-pressed": String(initial) }, label);
    button.addEventListener("click", () => {
      const on = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(on));
      set(on);
      refresh();
    });
    return button;
  };
  const colorInput = (key: "ok" | "err" | "hi", label: string, fallback: string) => {
    const input = h("input", { type: "color", value: fallback, "aria-label": `${label} colour` }) as HTMLInputElement;
    input.addEventListener("input", () => { settings.colors[key] = input.value; refresh(); });
    return h("label", {}, input, label);
  };
  const colorReset = h("button", { type: "button", class: "btn reset" }, "Reset colours");
  colorReset.addEventListener("click", () => { settings.colors = {}; refresh(); });

  const controls: (Node | string)[] = [
    range("Pointer intensity", 0, 1, 0.05, settings.intensity, v => { settings.intensity = v; }, v => v.toFixed(2)),
    range("Speed", 0, 3, 0.25, settings.speed, v => { settings.speed = v; }, v => `${v}×`),
    range("Stroke", 0.5, 2.5, 0.25, settings.stroke, v => { settings.stroke = v; }, v => `${v}px`),
  ];
  if (figure.progress) {
    const slider = range("Progress", 0, 1, 0.05, 0.6, v => { settings.progress = v; }, v => `${Math.round(v * 100)}%`);
    slider.hidden = true;
    const button = toggle("Real progress", false, v => {
      slider.hidden = !v;
      settings.progress = v ? 0.6 : undefined;
    });
    controls.push(h("div", { class: "control" }, h("span", { class: "label" }, "Progress (loading state)"), button), slider);
  }
  if (figure.count) {
    const [min, max] = figure.count;
    const mid = Math.round((min + max) / 2);
    const slider = range("Count", min, max, 1, mid, v => { settings.count = v; }, v => `${v}`);
    slider.hidden = true;
    const button = toggle("Set count", false, v => {
      slider.hidden = !v; settings.count = v ? mid : undefined;
    });
    controls.push(h("div", { class: "control" }, h("span", { class: "label" }, `Items (${min}–${max})`), button), slider);
  }
  controls.push(
    h("div", { class: "toggles" },
      toggle("Respond to pointer", true, v => { settings.interactive = v; })),
    h("div", { class: "control" }, h("span", { class: "label" }, "Colours for this figure"),
      h("div", { class: "swatches" }, colorInput("ok", "Success", "#12845a"), colorInput("err", "Error", "#cf3b31"), colorInput("hi", "Active", "#111318")),
      colorReset),
  );

  // ── Code ───────────────────────────────────────────────────
  // Tabs that remember the reader's choice across figures.
  const remember = (key: string, fallback: string) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
  const store = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* private mode */ } };
  const tabs = (key: string, ids: { id: string; label: string }[], show: (id: string) => void) => {
    let current = ids.some(t => t.id === remember(key, "")) ? remember(key, "") : ids[0]!.id;
    const buttons = ids.map(t => {
      const button = h("button", { type: "button", role: "tab", "aria-selected": String(t.id === current) }, t.label);
      button.addEventListener("click", () => { current = t.id; store(key, t.id); paint(); });
      return button;
    });
    const paint = () => { buttons.forEach((b, i) => b.setAttribute("aria-selected", String(ids[i]!.id === current))); show(current); };
    return { bar: h("div", { class: "tabs", role: "tablist" }, ...buttons), paint, get current() { return current; } };
  };

  const MANAGERS = [
    { id: "npm", label: "npm", cmd: "npm install statelines" },
    { id: "pnpm", label: "pnpm", cmd: "pnpm add statelines" },
    { id: "yarn", label: "yarn", cmd: "yarn add statelines" },
    { id: "bun", label: "bun", cmd: "bun add statelines" },
  ];
  const installArea = h("div", {});
  const install = tabs("statelines-pm", MANAGERS, id =>
    installArea.replaceChildren(codeBlock(MANAGERS.find(m => m.id === id)!.cmd, "Terminal")));

  const codeArea = h("div", {});
  const frameworks = tabs("statelines-framework", recipes(figure, settings), () => renderCode());
  const renderCode = () => {
    const recipe = recipes(figure, settings).find(r => r.id === frameworks.current)!;
    codeArea.replaceChildren(h("p", { class: "recipe-note" }, recipe.note), codeBlock(recipe.code, recipe.file));
  };
  const showTab = () => { install.paint(); frameworks.paint(); };

  // ── Assemble ───────────────────────────────────────────────
  const preview = h("div", { class: "preview" }, stage);
  app.replaceChildren(
    h("nav", { class: "crumbs", "aria-label": "Breadcrumb" },
      h("a", { href: "/figures" }, "Figures"), h("span", {}, "/"),
      h("a", { href: `/figures?shelf=${shelf.id}` }, shelf.title), h("span", {}, "/"),
      h("span", { style: "color:var(--ink)" }, name)),
    h("div", { class: "detail-head" },
      h("div", {},
        h("h1", {}, name),
        h("p", {}, figure.use)),
      h("div", { class: "pager" }, pagerLink(prev, "← Previous"), pagerLink(next, "Next →"))),
    h("div", { class: "detail" },
      h("div", { class: "panel" },
        h("div", { class: "preview-bar" },
          h("h2", {}, "Preview"),
          h("div", { class: "seg", role: "group", "aria-label": "State" }, ...stateButtons)),
        preview),
      h("div", { class: "panel" },
        h("h2", {}, "Options"),
        h("div", { class: "controls" }, ...controls))),
    h("section", { class: "section", "aria-labelledby": "code-h" },
      h("div", { class: "section-head" }, h("div", {},
        h("h2", { id: "code-h" }, "Use it"),
        h("p", {}, "The code follows the options you set above. No CSS to import: the figure adds its styles on first mount."))),
      h("ol", { class: "steps" },
        h("li", {}, h("h3", {}, "Install the package"), install.bar, installArea),
        h("li", {}, h("h3", {}, "Add it to your page"), frameworks.bar, codeArea),
        h("li", {}, h("h3", {}, "Drive it from your app"),
          h("p", { class: "recipe-note" },
            "Set the state from what your app is doing: ", h("code", {}, "loading"), " while work runs, ",
            h("code", {}, "success"), " or ", h("code", {}, "error"), " when it ends, ", h("code", {}, "empty"),
            " when there is nothing yet, and ", h("code", {}, "idle"), " otherwise. Only loading animates; the other states settle and stop.",
            ...(figure.progress ? [" This figure also takes ", h("code", {}, "progress"), " (0 to 1) to show real progress while loading."] : []),
            ...(figure.count ? [" Use ", h("code", {}, "count"), ` (${figure.count[0]} to ${figure.count[1]}) to set how many items it shows.`] : [])))),
    ),
    h("section", { class: "section", "aria-labelledby": "states-h" },
      h("div", { class: "section-head" }, h("h2", { id: "states-h" }, "Every state")),
      h("div", { class: "states-grid" }, ...FIGURE_STATES.map(s => {
        const cellStage = h("div", { class: "stage" });
        figure.figure(cellStage, { state: s, marks: true, interactive: false });
        return h("div", { class: "state-cell" }, cellStage, h("span", {}, s));
      }))),
    h("section", { class: "section", "aria-labelledby": "props-h" },
      h("div", { class: "section-head" }, h("h2", { id: "props-h" }, "Props")),
      propsTable(figure)),
  );

  function refresh(): void {
    instance.update(toOptions(figure, settings));
    stateButtons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.state === settings.state)));
    renderCode();
  }

  showTab();
}

function propsTable(figure: Entry): HTMLElement {
  const rows: [string, string, string, string][] = [
    ["state", "idle · loading · success · error · empty", "idle", "What the figure shows."],
    ["intensity", "number 0–1", "0.5", "How strongly it answers the pointer."],
    ["speed", "number 0–4", "1", "Animation speed."],
    ["stroke", "number", "1", "Stroke width in CSS pixels."],
    ["marks", "boolean", "true", "Kept for compatibility; figures no longer draw a tick or a cross."],
    ["interactive", "boolean", "true", "Respond to the pointer at all."],
    ["colors", "{ plate, hi, edge, mid, lo, ok, err }", "theme", "Colours for this figure only."],
    ["theme", "auto · light · dark", "auto", "Follows the page by default."],
    ["label", "string", "description", "The accessible name."],
    ["play", "boolean", "false", "Cycles through the states on its own."],
  ];
  if (figure.progress) rows.splice(1, 0, ["progress", "number 0–1", "none", "Real progress during loading, instead of a loop."]);
  if (figure.count) rows.splice(figure.progress ? 2 : 1, 0, ["count", `number ${figure.count[0]}–${figure.count[1]}`, "per figure", "How many items this figure holds."]);
  return h("div", { class: "table-wrap" },
    h("table", {},
      h("thead", {}, h("tr", {}, h("th", {}, "Prop"), h("th", {}, "Type"), h("th", {}, "Default"), h("th", {}, "What it does"))),
      h("tbody", {}, ...rows.map(([prop, type, def, what]) =>
        h("tr", {}, h("td", {}, h("code", {}, prop)), h("td", {}, h("code", {}, type)), h("td", {}, h("code", {}, def)), h("td", {}, what))))));
}

