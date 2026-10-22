import { chromium } from "playwright"; import { writeFileSync } from "node:fs";
const [out, state = "idle", from = "0", to = "999"] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1.5 });
await p.goto("http://localhost:5173/figures", { waitUntil: "networkidle" });
await p.click(`#states button[data-state="${state}"]`); await p.waitForTimeout(500);
const cards = await p.locator(".card").all(); const tiles = [];
for (const c of cards.slice(+from, +to)) {
  await c.evaluate(el => el.scrollIntoView({ block: "center" })); await p.mouse.move(0, 0); await p.waitForTimeout(250);
  tiles.push([await c.locator(".card-name").innerText(), (await c.locator(".stage").screenshot()).toString("base64")]);
}
const s = await b.newPage({ viewport: { width: 1400, height: 400 } });
await s.setContent(`<body style="margin:0;padding:10px;background:#eee;font:12px sans-serif;display:grid;grid-template-columns:repeat(8,1fr);gap:6px">${tiles.map(([n, i]) => `<div style="background:#fff;border-radius:6px;padding:2px"><img style="width:100%" src="data:image/png;base64,${i}"><div style="padding:0 4px 3px">${n}</div></div>`).join("")}</body>`);
writeFileSync(out, await s.screenshot({ fullPage: true })); await b.close(); console.log(tiles.length, "tiles");
