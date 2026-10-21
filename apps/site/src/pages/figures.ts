import "../styles/site.css";
import { FIGURE_STATES, type FigureInstance, type FigureState } from "statelines";
import { catalog, type Entry } from "../data/catalog";
import { slugOf } from "../data";
import { applyStoredTheme, mountFooter, mountHeader } from "../ui/shell";
import { $, h } from "../ui/dom";
import { attachFlow, type Flow } from "../ui/flow";

applyStoredTheme();
mountHeader("figures");
mountFooter();

interface Card { entry: Entry; shelf: string; element: HTMLElement; instance: FigureInstance; flow: Flow }

const params = new URLSearchParams(location.search);
// The page opens in loading: every figure runs slowly, and hovering a card plays its whole story.
let state: FigureState = "loading";
let shelf = catalog.some(s => s.id === params.get("shelf")) ? params.get("shelf") ?? "all" : "all";

const cards: Card[] = [];

// Every card, built once. Filtering only toggles `hidden`, so instances keep running.
for (const section of catalog) {
  for (const entry of section.entries) {
    const stage = h("div", { class: "stage" });
    const tags = [
      entry.progress ? h("span", { class: "tag" }, "progress") : null,
      entry.count ? h("span", { class: "tag" }, `count ${entry.count[0]}–${entry.count[1]}`) : null,
    ];
    const element = h("a", { class: "card", href: `/figures/${slugOf(entry)}`, "data-shelf": section.id },
      stage,
      h("span", { class: "card-name" }, entry.figure.definition.name),
      h("span", { class: "card-use" }, entry.use),
      h("span", { class: "tags" }, ...tags));
    const instance = entry.figure(stage, { state });
    const flow = attachFlow(element, instance, { progress: entry.progress, state });
    cards.push({ entry, shelf: section.id, element, instance, flow });
  }
}
$("#cards").replaceChildren(...cards.map(c => c.element));

// State switch: every figure moves together, staggered so the page breathes.
const stateGroup = $("#states");
for (const s of FIGURE_STATES) {
  const button = h("button", { type: "button", "data-state": s, "aria-pressed": s === state ? "true" : "false" }, s);
  button.addEventListener("click", () => setState(s));
  stateGroup.append(button);
}

function setState(next: FigureState): void {
  state = next;
  stateGroup.querySelectorAll<HTMLButtonElement>("button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.state === next)));
  cards.forEach((card, i) => setTimeout(() => card.flow.setState(next), (i % 10) * 22));
}

// Shelf filter, one row per shelf in the side panel.
const chips = $("#chips");
const chip = (id: string, label: string, n: number) => {
  const button = h("button", { type: "button", class: "chip", "data-shelf": id, "aria-pressed": id === shelf ? "true" : "false" },
    h("span", {}, label), h("span", { class: "chip-n" }, String(n)));
  button.addEventListener("click", () => setShelf(id));
  return button;
};
chips.append(chip("all", "All", cards.length), ...catalog.map(s => chip(s.id, s.title, s.entries.length)));

function setShelf(id: string): void {
  shelf = id;
  chips.querySelectorAll<HTMLButtonElement>("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.shelf === id)));
  const url = new URL(location.href);
  if (id === "all") url.searchParams.delete("shelf"); else url.searchParams.set("shelf", id);
  history.replaceState(null, "", url);
  apply();
}

function apply(): void {
  let visible = 0;
  for (const card of cards) {
    const match = shelf === "all" || card.shelf === shelf;
    card.element.hidden = !match;
    if (match) visible++;
  }
  $("#count").textContent = `${visible} of ${cards.length} figures`;
  $("#none").hidden = visible > 0;
}

setShelf(shelf);
