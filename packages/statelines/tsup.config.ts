import { defineConfig } from "tsup";
import type { Plugin } from "esbuild";

/** The React entry reuses the core build instead of bundling a second copy of every figure. */
const shareCore: Plugin = {
  name: "share-core",
  setup(build) {
    build.onResolve({ filter: /^\.\.\/index$/ }, () => ({ path: "../index.js", external: true }));
  },
};

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    dts: true,
    clean: true,
    treeshake: true,
    // Not minified: minifying strips the /*#__PURE__*/ marks on each figure, and without them an
    // app that imports one figure would bundle all of them. Apps minify their own bundles.
    minify: false,
    target: "es2020",
  },
  {
    entry: { "react/index": "src/react/index.ts" },
    format: ["esm"],
    dts: true,
    minify: false,
    target: "es2020",
    external: ["react"],
    esbuildPlugins: [shareCore],
    banner: { js: '"use client";' },
  },
]);
