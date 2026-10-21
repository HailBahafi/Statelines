import "../styles/site.css";
import { catalog } from "../data/catalog";
import { findEntry, slugOf } from "../data";
import { applyStoredTheme, mountFooter, mountHeader } from "../ui/shell";
import { $, copy, h } from "../ui/dom";
import { attachFlow } from "../ui/flow";

applyStoredTheme();
mountHeader("home");
mountFooter();

// The best figures, big, in loading; hovering a card plays it through to success and error.
const FEATURED = ["Upload", "Send", "Chat", "Pay", "Shipping", "SignIn"];
$("#showcase").replaceChildren(...FEATURED.flatMap(name => {
  const entry = findEntry(name);
  if (!entry) return [];
  const stage = h("div", { class: "stage" });
  const card = h("a", { class: "card", href: `/figures/${slugOf(entry)}` },
    stage,
    h("span", { class: "card-name" }, entry.figure.definition.name),
    h("span", { class: "card-use" }, entry.use));
  attachFlow(card, entry.figure(stage, { state: "loading" }), { progress: entry.progress, state: "loading" });
  return [card];
}));

// Copy buttons in the hero.
document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach(button => {
  button.addEventListener("click", () => copy(button.dataset.copy ?? "", button));
});

// Shelf links, generated from the catalog so the counts are always right.
const shelves = $("#shelves");
shelves.replaceChildren(...catalog.map(shelf =>
  h("a", { class: "shelf-link", href: `/figures?shelf=${shelf.id}` },
    h("span", {}, shelf.title),
    h("span", {}, String(shelf.entries.length)))));
