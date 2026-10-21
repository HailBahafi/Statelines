// Renders figures in every state from the running site and assembles a contact sheet.
//
//   node apps/site/scripts/review.mjs <out.png> <shelf> <Name> [<Name> ...]
//
// Expects `pnpm dev` on BASE (default http://localhost:5173). For each state it clicks the
// state switch on /figures, scrolls each card into view, waits, and screenshots its `.stage`.
// It also reports console errors, NaN/undefined in the markup, and drawings that leave the
// viewBox. Exit code 1 when any check fails.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:5173";
const WAIT = Number(process.env.WAIT ?? 1000);
const STATES = (process.env.STATES ?? "idle,loading,success,error,empty").split(",");
const IMG = Number(process.env.IMG ?? 240);
const [out, shelf, ...names] = process.argv.slice(2);
if (!out || !shelf || !names.length) {
  console.error("usage: review.mjs <out.png> <shelf> <Name> [<Name> ...]");
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" });
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push(e.stack ?? String(e)));
await page.goto(`${BASE}/figures?shelf=${shelf}`, { waitUntil: "networkidle" });

const shots = {}, problems = [];
for (const state of STATES) {
  await page.click(`#states button[data-state="${state}"]`);
  await page.waitForTimeout(400);
  for (const name of names) {
    const card = page.locator(".card", { has: page.locator(".card-name", { hasText: new RegExp(`^${name}$`) }) }).first();
    if (!(await card.count())) { problems.push(`${name}: no card`); continue; }
    await card.evaluate(el => el.scrollIntoView({ block: "center" }));
    await page.mouse.move(0, 0);
    await page.waitForTimeout(WAIT);
    const stage = card.locator(".stage");
    const check = await stage.evaluate(el => {
      const svg = el.querySelector("svg"), g = svg?.querySelector(":scope > g");
      if (!svg || !g) return { missing: true };
      const [vx, vy, vw, vh] = svg.getAttribute("viewBox").split(/\s+/).map(Number);
      const b = g.getBBox();
      return {
        bad: /NaN|undefined|Infinity/.test(svg.innerHTML),
        out: b.x < vx - 0.5 || b.y < vy - 0.5 || b.x + b.width > vx + vw + 0.5 || b.y + b.height > vy + vh + 0.5,
        box: [b.x, b.y, b.x + b.width, b.y + b.height].map(v => Math.round(v)),
      };
    });
    if (check.missing) problems.push(`${name}/${state}: no svg`);
    if (check.bad) problems.push(`${name}/${state}: NaN or undefined in markup`);
    if (check.out) problems.push(`${name}/${state}: outside viewBox ${JSON.stringify(check.box)}`);
    (shots[name] ??= {})[state] = (await stage.screenshot()).toString("base64");
  }
}

// One row per figure, one column per state.
const cell = s => `<td>${s ? `<img src="data:image/png;base64,${s}">` : ""}</td>`;
const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;padding:16px;background:#f4f5f7;font:13px system-ui,sans-serif;color:#1c2130}
  table{border-collapse:separate;border-spacing:8px} th{font-weight:600;text-align:left;padding:2px 4px}
  td{background:#fff;border:1px solid #e4e7ec;border-radius:8px;padding:4px;vertical-align:top}
  td.n{background:none;border:0;font-weight:600;width:110px} img{display:block;width:${IMG}px}
</style><table><tr><th></th>${STATES.map(s => `<th>${s}</th>`).join("")}</tr>
${names.map(n => `<tr><td class="n">${n}</td>${STATES.map(s => cell(shots[n]?.[s])).join("")}</tr>`).join("\n")}
</table>`;
const sheet = await browser.newPage({ viewport: { width: 200 + STATES.length * (IMG + 18), height: 400 }, deviceScaleFactor: 1 });
await sheet.setContent(html);
writeFileSync(out, await sheet.screenshot({ fullPage: true }));
await browser.close();

for (const e of errors) console.log("console:", e);
for (const p of problems) console.log("problem:", p);
console.log(`${names.length} figures, ${errors.length} console errors, ${problems.length} problems -> ${out}`);
process.exit(errors.length || problems.length ? 1 : 0);
