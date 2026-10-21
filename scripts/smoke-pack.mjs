import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const packageDir = join(root, "packages", "statelines");

function run(command, args, cwd) {
  // Run the CLI through Node on Windows; .cmd launchers need a shell otherwise.
  if (process.platform === "win32" && command === "pnpm") {
    assert(process.env.npm_execpath, "Run this script with pnpm smoke:pack");
    args = [process.env.npm_execpath, ...args];
    command = process.execPath;
  } else if (process.platform === "win32" && command === "npm") {
    const launcher = execFileSync("where.exe", ["npm.cmd"], { encoding: "utf8" }).trim().split(/\r?\n/)[0];
    args = [join(dirname(launcher), "node_modules", "npm", "bin", "npm-cli.js"), ...args];
    command = process.execPath;
  }
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed (${result.signal ?? result.status})`);
}

const temporary = await mkdtemp(join(tmpdir(), "statelines-smoke-"));
try {
  run("pnpm", ["--filter", "statelines", "build"], root);
  run("pnpm", ["pack", "--pack-destination", temporary], packageDir);
  const tarballs = (await readdir(temporary)).filter(file => file.endsWith(".tgz"));
  assert.equal(tarballs.length, 1, "Expected exactly one packed tarball");

  // npm is deliberately limited to this isolated consumer; no repository lockfile is created.
  run("npm", ["init", "-y"], temporary);
  run("npm", ["i", join(temporary, tarballs[0])], temporary);
  run("npm", ["i", "react", "react-dom"], temporary);
  await writeFile(
    join(temporary, "smoke.mjs"),
    `
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { upload } from "statelines";
import { Upload } from "statelines/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const packageUrl = new URL("../", import.meta.resolve("statelines"));
const metadata = JSON.parse(readFileSync(new URL("package.json", packageUrl), "utf8"));
for (const file of ["README.md", "LICENSE", "CHANGELOG.md", metadata.main, metadata.module, metadata.types]) {
  assert(readFileSync(new URL(file, packageUrl)).length > 0, file + " is missing or empty");
}
for (const entry of Object.values(metadata.exports)) {
  for (const file of Object.values(entry)) readFileSync(new URL(file, packageUrl));
}

class FakeElement {
  children = [];
  attributes = new Map();
  dataset = {};
  classList = new Set();
  style = { setProperty() {}, removeProperty() {} };
  setAttribute(name, value) { this.attributes.set(name, value); }
  appendChild(child) { this.children.push(child); }
  addEventListener() {}
  removeEventListener() {}
  remove() {}
}
// Set has delete, while DOMTokenList calls it remove.
const element = new FakeElement();
element.classList.remove = element.classList.delete.bind(element.classList);
globalThis.document = {
  head: new FakeElement(),
  getElementById() { return null; },
  createElement() { return new FakeElement(); },
  createElementNS() { return new FakeElement(); },
};
assert.equal(typeof upload, "function");
const instance = upload(element, { state: "loading" });
assert(element.classList.has("statelines"));
assert.equal(element.children[0].attributes.get("role"), "img");
assert.equal(typeof instance.update, "function");
assert.equal(typeof instance.destroy, "function");
instance.destroy();
assert(Upload, "React Upload export is missing");
assert.match(renderToString(createElement(Upload, { state: "loading" })), /<div/);
console.log("Packed statelines and statelines/react imports and mounts passed.");
`,
  );
  run(process.execPath, [join(temporary, "smoke.mjs")], temporary);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
