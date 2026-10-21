import "../styles/site.css";
import { catalog } from "../data/catalog";
import { findEntry } from "../data";
import { applyStoredTheme, mountFooter, mountHeader } from "../ui/shell";
import { $, copy, h } from "../ui/dom";

applyStoredTheme();
mountHeader("home");
mountFooter();

// Live example figures in the hero.
document.querySelectorAll<HTMLElement>("[data-figure]").forEach(stage => {
  const entry = findEntry(stage.dataset.figure ?? "");
  if (!entry) return;
  entry.figure(stage, { state: (stage.dataset.state as "idle" | "loading" | "success") ?? "idle" });
});

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
