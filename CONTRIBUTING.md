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

## Publishing

Set the npm token as the GitHub repository Actions secret `STATELINES`, with npm publishing rights for `statelines` and "bypass two-factor authentication" enabled. The release workflow fails early if it is missing and publishes with npm provenance.

Normally, merging changesets to `main` opens a **Version Packages** pull request. Merging that pull request publishes the new version and creates a GitHub release. With no pending changesets, the workflow runs `pnpm release` directly: Changesets publishes each package version that is not already on npm. This also handles the initial `0.3.0` release without a version bump.

Before releasing, run `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm smoke:pack`. The smoke test uses npm only inside a temporary consumer project to test the packed tarball; use pnpm for repository commands.

For a manual publish, a maintainer must sign in and then run:

```sh
npm login
pnpm release
```

Create or sign in to your npm account and enable two-factor authentication. Create a granular token with read and write access for `statelines`, with "bypass two-factor authentication" enabled, and save it only as the repository secret `STATELINES`. Before the first release, a maintainer must confirm `npm view statelines` returns 404. After merging to `main`, confirm the published version with `npm view statelines version`.

## Code style

- Strict TypeScript. No `any` in figures.
- Constants at the top of each figure, in world units, with names (`GAP`, `HINGE`), not magic numbers inline.
- Create springs in `setup` only.
- Read `ctx.time` only inside the looping state. Reading it anywhere else keeps the figure awake.
- Use the shared objects in `figures/shapes.ts` before inventing new ones.
