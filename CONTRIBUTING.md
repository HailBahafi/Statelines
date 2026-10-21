# Contributing

Thanks for helping. The bar for a new figure is simple to state and hard to meet: **it draws a moment that many real apps have, and it reads without words at 200 px.**

## Setup

```sh
pnpm install
pnpm dev        # the site at http://localhost:5173
pnpm test       # every figure, every state, every option
pnpm typecheck
pnpm build      # library and site
```

## Building a figure

1. Read [docs/RULES.md](docs/RULES.md) and [docs/ANATOMY.md](docs/ANATOMY.md).
2. Add `packages/statelines/src/figures/<shelf>/<name>.ts` with `defineFigure`, and export it from the shelf's `index.ts`.
3. Run `pnpm generate`. It rebuilds the React exports, the site catalog, and the test lists from your source. Commit what it changes.
4. Run `pnpm test`. The sweep checks that every state draws, idle comes to rest, loading keeps moving, and the pointer is answered.
5. Run `pnpm dev` and look at your figure in every state, in both themes, at 200 px and at full width.

The generated files are checked in CI. If `pnpm generate` changes anything, the build fails until you commit the result.

## Versioning

The library follows semantic versioning, managed with [Changesets](https://github.com/changesets/changesets). Every change a user would notice needs a changeset:

```sh
pnpm changeset
```

Choose patch, minor or major, and write one or two sentences. The pull request check fails if a library change has no changeset. When your pull request merges, the release workflow opens a "Version Packages" pull request. Merging that publishes the new version to npm.

## Code style

- Strict TypeScript. No `any` in figures.
- Constants at the top of each figure, in world units, with names (`GAP`, `HINGE`), not magic numbers inline.
- Create springs in `setup` only.
- Read `ctx.time` only inside the looping state. Reading it anywhere else keeps the figure awake.
- Use the shared objects in `figures/shapes.ts` before inventing new ones.
