type Attrs = Record<string, string | number | boolean | EventListener | undefined>;
type Child = Node | string | false | null | undefined;

/**
 * Builds an element. Attributes with an `on` prefix are event listeners (`onClick` → "click").
 * `false`, `null` and `undefined` values are skipped, so conditional attributes stay readable.
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (typeof value === "function") node.addEventListener(key.replace(/^on/, "").toLowerCase(), value);
    else if (key === "class") node.className = String(value);
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }
  for (const child of children) if (child !== false && child != null) node.append(child);
  return node;
}

const SVG = "http://www.w3.org/2000/svg";

/** Builds an SVG element. SVG needs its own namespace, so it cannot use `h`. */
export function svg(tag: string, attrs: Record<string, string> = {}, ...children: Node[]): SVGElement {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  node.append(...children);
  return node;
}

export const $ = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T => {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element: ${selector}`);
  return node;
};

/** Copies text and briefly relabels the button that asked for it. */
export async function copy(text: string, button: HTMLButtonElement): Promise<void> {
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }
  setTimeout(() => { button.textContent = label; }, 1400);
}

/** A code block with a copy button. */
export function codeBlock(code: string, label = ""): HTMLElement {
  const button = h("button", { class: "copy", type: "button", "aria-label": "Copy code" }, "Copy");
  button.addEventListener("click", () => copy(code, button));
  return h("div", { class: "code" },
    h("div", { class: "code-bar" }, h("span", { class: "code-label" }, label), button),
    h("pre", {}, h("code", {}, code)));
}
