import { h, svg } from "./dom";

export type Section = "home" | "figures" | "docs";

const THEME_KEY = "statelines-theme";

/** Applies the saved theme before the page paints. Each page calls this from its entry. */
export function applyStoredTheme(): void {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  } catch {
    // Storage can be blocked; the system theme then applies.
  }
}

function toggleTheme(button: HTMLButtonElement): void {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem(THEME_KEY, root.dataset.theme); } catch { /* storage blocked */ }
  button.setAttribute("aria-label", dark ? "Switch to dark theme" : "Switch to light theme");
}

const mark = () => svg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", class: "mark" },
  svg("path", { d: "M12 2.5 21.5 12 12 21.5 2.5 12Z", fill: "none", stroke: "currentColor", "stroke-width": "1.4" }),
  svg("path", { d: "M12 7.2 16.8 12 12 16.8 7.2 12Z", fill: "none", stroke: "currentColor", "stroke-width": "1.1", opacity: "0.6" }));

/** The top bar every page shares. Mounted into `#top`. */
export function mountHeader(active: Section): void {
  const top = document.getElementById("top");
  if (!top) return;
  const link = (section: Section, href: string, text: string) =>
    h("a", { href, class: active === section ? "active" : undefined, "aria-current": active === section ? "page" : undefined }, text);
  const theme = h("button", { class: "icon-btn", type: "button", "aria-label": "Switch theme" }, "◐");
  theme.addEventListener("click", () => toggleTheme(theme));
  top.replaceChildren(h("header", { class: "top" },
    h("div", { class: "wrap top-inner" },
      h("a", { class: "brand", href: "/" }, mark(), h("span", {}, "statelines")),
      h("nav", { class: "top-nav", "aria-label": "Main" },
        link("figures", "/figures", "Figures"),
        link("docs", "/docs", "Docs"),
        h("a", { href: "https://github.com/", target: "_blank", rel: "noopener" }, "GitHub")),
      theme)));
}

/** The footer every page shares. Mounted into `#foot`. */
export function mountFooter(): void {
  const foot = document.getElementById("foot");
  if (!foot) return;
  foot.replaceChildren(h("footer", { class: "foot" },
    h("div", { class: "wrap foot-inner" },
      h("span", {}, "statelines · MIT licensed · zero dependencies"),
      h("span", {}, h("a", { href: "/docs" }, "Docs"), " · ", h("a", { href: "/figures" }, "Figures"), " · ", h("a", { href: "/llms.txt" }, "llms.txt")))));
}
