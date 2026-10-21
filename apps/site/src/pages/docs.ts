import "../styles/site.css";
import { catalog } from "../data/catalog";
import { applyStoredTheme, mountFooter, mountHeader } from "../ui/shell";
import { $, copy, h } from "../ui/dom";

applyStoredTheme();
document.querySelectorAll("[data-version]").forEach(el => { el.textContent = `v${__STATELINES_VERSION__}`; });
mountHeader("docs");
mountFooter();

/** Tabs switch a group of panels or a single command. `data-tabs` names the group. */
function wireTabs(group: string, onSelect: (value: string) => void): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>(`[data-tabs="${group}"] button`)];
  buttons.forEach(button => button.addEventListener("click", () => {
    buttons.forEach(b => b.setAttribute("aria-selected", String(b === button)));
    onSelect(button.dataset.value ?? "");
  }));
}

// Install: the command follows the package manager.
const commands: Record<string, string> = { npm: "npm i statelines", pnpm: "pnpm add statelines", yarn: "yarn add statelines", bun: "bun add statelines" };
wireTabs("pm", value => { $("#pm-command").textContent = commands[value] ?? commands.npm ?? ""; });

// Quick start: React, vanilla and CDN panels.
wireTabs("qs", value => {
  document.querySelectorAll<HTMLElement>("[data-panel]").forEach(panel => {
    panel.hidden = panel.dataset.panel !== value;
  });
});

// Copy the install command.
document.querySelectorAll<HTMLButtonElement>("[data-copy-from]").forEach(button => {
  button.addEventListener("click", () => copy($("#pm-command").textContent ?? "", button));
});

// Figures, grouped by shelf with counts.
$("#shelf-list").replaceChildren(...catalog.map(shelf =>
  h("a", { href: `/figures?shelf=${shelf.id}` }, shelf.title, h("span", {}, String(shelf.entries.length)))));

// Highlight the section in view in the side navigation.
const links = [...document.querySelectorAll<HTMLAnchorElement>("#side a")];
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    links.forEach(a => a.removeAttribute("aria-current"));
    links.find(a => a.getAttribute("href") === `#${entry.target.id}`)?.setAttribute("aria-current", "true");
  }
}, { rootMargin: "-20% 0px -70% 0px" });
document.querySelectorAll("article.doc section[id]").forEach(section => observer.observe(section));
