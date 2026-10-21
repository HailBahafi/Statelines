import { copyFile } from "node:fs/promises";

// Keep the tarball documentation in sync on both pack and publish, on every OS.
for (const file of ["README.md", "LICENSE"]) {
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(`../packages/statelines/${file}`, import.meta.url));
}
