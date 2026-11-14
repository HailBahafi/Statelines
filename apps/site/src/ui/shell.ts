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

export const GITHUB_URL = "https://github.com/HailBahafi/Statelines";

/** The GitHub mark, drawn in the current text colour. */
export const githubMark = () => svg("svg", { viewBox: "0 0 16 16", "aria-hidden": "true", class: "gh-mark", width: "16", height: "16" },
  svg("path", { fill: "currentColor", d: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" }));

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
  const github = h("a", { class: "icon-btn gh-btn", href: GITHUB_URL, target: "_blank", rel: "noopener", "aria-label": "statelines on GitHub", title: "Star statelines on GitHub" });
  github.append(githubMark());
  top.replaceChildren(h("header", { class: "top" },
    h("div", { class: "wrap top-inner" },
      h("a", { class: "brand", href: "/" }, mark(), h("span", {}, "statelines"), h("span", { class: "version" }, `v${__STATELINES_VERSION__}`)),
      h("nav", { class: "top-nav", "aria-label": "Main" },
        link("figures", "/figures", "Figures"),
        link("docs", "/docs", "Docs"),
        h("a", { href: GITHUB_URL, target: "_blank", rel: "noopener" }, "GitHub")),
      h("div", { class: "top-actions" }, github, theme))));
  trackNavigation();
}

/**
 * Shows a progress bar at the top as soon as a link to another page is followed, so the wait
 * for the next page never looks like nothing happened. Cleared when the page is shown again
 * from the back/forward cache.
 */
function trackNavigation(): void {
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    document.documentElement.classList.add("navigating");
  });
  addEventListener("pageshow", () => document.documentElement.classList.remove("navigating"));
}

/** The footer every page shares. Mounted into `#foot`. */
export function mountFooter(): void {
  const foot = document.getElementById("foot");
  if (!foot) return;
  foot.replaceChildren(h("footer", { class: "foot" },
    h("div", { class: "wrap foot-inner" },
      h("span", {}, h("a", { href: "https://statelines.vercel.app" }, `statelines v${__STATELINES_VERSION__}`), " · MIT licensed · zero dependencies"),
      h("span", {}, h("a", { href: "/docs" }, "Docs"), " · ", h("a", { href: "/figures" }, "Figures"), " · ",
        h("a", { href: GITHUB_URL, target: "_blank", rel: "noopener" }, "GitHub"), " · ",
        h("a", { href: `${GITHUB_URL}/issues`, target: "_blank", rel: "noopener" }, "Issues"), " · ",
        h("a", { href: "/llms.txt" }, "llms.txt")))));
}
