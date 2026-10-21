import { defineConfig, type Plugin } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const page = (name: string) => resolve(here, name);

/**
 * Mirrors vercel.json in development: clean URLs and the figure route.
 * Production uses the rewrites in vercel.json; this keeps `vite` in step with it.
 */
const routes: Plugin = {
  name: "momenta-routes",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const path = (req.url ?? "/").split("?")[0] ?? "/";
      if (path.startsWith("/figures/")) req.url = "/figure.html";
      else if (path === "/figures") req.url = "/figures.html";
      else if (path === "/docs") req.url = "/docs.html";
      next();
    });
  },
};

export default defineConfig({
  root: here,
  plugins: [routes],
  // The library is built from source here, so the site always shows the code in this repository.
  resolve: { alias: { momenta: resolve(repo, "packages/momenta/src/index.ts") } },
  server: { fs: { allow: [repo] } },
  build: {
    target: "es2020",
    rollupOptions: {
      input: {
        index: page("index.html"),
        figures: page("figures.html"),
        figure: page("figure.html"),
        docs: page("docs.html"),
      },
    },
  },
});
