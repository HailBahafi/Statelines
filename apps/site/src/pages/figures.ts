import "../styles/site.css";
import { FIGURE_STATES, type FigureInstance, type FigureState } from "statelines";
import { catalog, type Entry } from "../data/catalog";
import { slugOf } from "../data";
import { applyStoredTheme, mountFooter, mountHeader } from "../ui/shell";
import { $, h } from "../ui/dom";

applyStoredTheme();
mountHeader("figures");
mountFooter();

interface Card { entry: Entry; shelf: string; element: HTMLElement; instance: FigureInstance }

const params = new URLSearchParams(location.search);
let state: FigureState = "idle";
let shelf = catalog.some(s => s.id === params.get("shelf")) ? params.get("shelf") ?? "all" : "all";
let query = "";

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
    cards.push({ entry, shelf: section.id, element, instance });
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
  cards.forEach((card, i) => setTimeout(() => card.instance.update({ state: next }), (i % 10) * 22));
}

// Shelf filter chips.
const chips = $("#chips");
const chip = (id: string, label: string, n: number) => {
  const button = h("button", { type: "button", class: "chip", "data-shelf": id, "aria-pressed": id === shelf ? "true" : "false" }, `${label} · ${n}`);
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

// Search across names and uses.
$<HTMLInputElement>("#search").addEventListener("input", event => {
  query = (event.target as HTMLInputElement).value.trim().toLowerCase();
  apply();
});

function apply(): void {
  let visible = 0;
  for (const card of cards) {
    const haystack = `${card.entry.figure.definition.name} ${card.entry.use} ${card.shelf}`.toLowerCase();
    const match = (shelf === "all" || card.shelf === shelf) && (!query || haystack.includes(query));
    card.element.hidden = !match;
    if (match) visible++;
  }
  $("#count").textContent = `${visible} of ${cards.length} figures`;
  $("#none").hidden = visible > 0;
}

setShelf(shelf);
