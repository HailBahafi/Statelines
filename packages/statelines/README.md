# statelines

Figures for the moments every app has.

[Website](https://statelines.vercel.app) · [GitHub](https://github.com/HailBahafi/Statelines)

Uploading a file, paying, typing a verification code, waiting on an AI reply, matching a creator to a brand. statelines is 101 isometric line drawings that show what your app is doing through a single `state` prop, and lean toward the pointer while they rest.

- **One prop that means something.** `idle`, `loading`, `success`, `error`, `empty`. Wire it to your app's real state and the figure tells the story.
- **Colour only when it matters.** Everything is grey line until a state means something: green for success, red for error.
- **Yours to adjust.** Real progress, item counts, speed, colours, stroke and pointer, all as options. For deeper changes, copy a figure's file: every one is a short, readable TypeScript module.
- **Light.** Zero dependencies. Importing one figure adds about 8 KB gzipped; all 101 together are about 83 KB.
- **Idle means idle.** Every figure on the page shares one animation frame, and it stops when they have all settled. Off-screen figures cost nothing.
- **Accessible.** Each figure is an image with a description you can replace, and `prefers-reduced-motion` is respected.

## Install

```sh
npm i statelines
```

For React:

```tsx
import { Upload } from "statelines/react";
```

## Use

### React

```tsx
import { Upload } from "statelines/react";

export function Dropzone({ status }: { status: "idle" | "uploading" | "done" | "failed" }) {
  const state = { idle: "idle", uploading: "loading", done: "success", failed: "error" }[status];
  return <Upload state={state} style={{ width: 240 }} />;
}
```

Each component renders a `<div>`, forwards its ref, and accepts any `<div>` attribute. The entry is a client module, so you can render it from a Server Component directly.

### Vanilla

```ts
import { pay } from "statelines";

const figure = pay(document.getElementById("checkout")!, { state: "loading" });
figure.update({ state: "success" });
figure.destroy();
```

In `update`, a key set to `undefined` returns to its default; a key left out keeps its value.

### Server and static export

```ts
import { renderToString, styles, search } from "statelines";

const html = `<style>${styles}</style>` + renderToString(search, { state: "empty" });
```

### As an empty state

A figure fills its element's width at 5:4. At 160 to 240px it sits well above a heading and one action:

```tsx
import { Search } from "statelines/react";

export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 12, padding: 48 }}>
      <Search state="empty" style={{ width: 200 }} label="No results" />
      <h2>No results match these filters</h2>
      <button onClick={onClear}>Clear filters</button>
    </div>
  );
}
```

## Options

| Option | Type | Default | |
| --- | --- | --- | --- |
| `state` | `"idle" \| "loading" \| "success" \| "error" \| "empty"` | `"idle"` | What the figure shows. `loading` loops; every other state comes to rest. |
| `intensity` | `number` 0…1 | `0.5` | How strongly the figure answers the pointer. |
| `theme` | `"auto" \| "light" \| "dark"` | `"auto"` | `auto` follows an ancestor with class `dark` or `data-theme="dark"`, then the system. |
| `label` | `string` | a description | The accessible name. |
| `play` | `boolean` | `false` | Walks through every state on its own until the pointer arrives. For landing pages. |
| `progress` | `number` 0…1 | — | Real progress during `loading`, instead of a loop. See which figures below. |
| `count` | `number` | per figure | How many items the figure holds: rows, cards, coins, keys, seats. Clamped to each figure's range. |
| `speed` | `number` 0…4 | `1` | Animation speed. |
| `colors` | `{ plate, hi, edge, mid, lo, ok, err }` | — | Colours for this figure only, on top of the theme. |
| `stroke` | `number` | `1` | Stroke width in CSS pixels. |
| `marks` | `boolean` | `true` | Kept for compatibility. Figures no longer draw a tick or a cross, so it has no effect. |
| `interactive` | `boolean` | `true` | Answer the pointer. |

### Real progress

```tsx
<Upload state="loading" progress={uploaded / total} />
```

Figures that show progress: `Upload` `Download` `Table` `Folder` `Send` `Inbox` `Cart` `Wallet` `Shipping` `Write` `Imagine` `Code` `Session`. Leave `progress` out for an indeterminate loop.

### Item count

```tsx
<Code count={4} />          {/* a 4-digit PIN */}
<Wallet count={9} />        {/* nine coins */}
<Analytics count={12} />    {/* clamped to 10 bars */}
```

| Figure | `count` means | Range | Default |
| --- | --- | --- | --- |
| `Table` | rows | 1–8 | 5 |
| `Inbox` | cards at rest | 0–6 | 3 |
| `Alerts` | cards at rest | 0–4 | 2 |
| `Team` | seats | 2–8 | 5 |
| `Cart` | items | 1–5 | 4 |
| `Wallet` | coins | 1–10 | 6 |
| `Code` | digits | 4–8 | 6 |
| `Analytics` | bars | 3–10 | 7 |
| `Deploy` | layers | 2–6 | 4 |

### Brand colours on one figure

```tsx
<Pay state="success" colors={{ ok: "#635bff", hi: "#0a2540" }} stroke={1.25} />
```

## Figures

| Shelf | Figures |
| --- | --- |
| Files | `Upload` `Download` `Table` `Folder` `Database` |
| Communication | `Send` `Inbox` `Chat` `Alerts` `Team` |
| Commerce | `Pay` `Cart` `Shipping` `Receipt` `Wallet` |
| Account | `Code` `SignIn` `Denied` `Profile` `Plans` |
| AI and data | `Write` `Imagine` `Analytics` `Search` `Calendar` |
| System | `Connection` `NotFound` `Deploy` `Connect` `Session` |

React components use PascalCase; the vanilla functions use camelCase (`signIn`, `notFound`).

## Theme

Set any of these on the figure or an ancestor:

| Property | |
| --- | --- |
| `--statelines-plate` | The colour the figure sits on. Plates are filled with it to hide what is behind, so match your background. |
| `--statelines-hi` | The thing that is acting right now. |
| `--statelines-edge` | Silhouettes. |
| `--statelines-mid` | Creases and secondary lines. |
| `--statelines-lo` | Guides and what recedes. |
| `--statelines-ok` | Success. |
| `--statelines-err` | Error. |
| `--statelines-stroke` | Stroke width in CSS pixels, at any size. |

## Make your own

A figure is a `setup` that creates springs and a `draw` that describes one frame. See [docs/ANATOMY.md](docs/ANATOMY.md), the ten rules in [docs/RULES.md](docs/RULES.md), and the `statelines-create` skill in [skills/](skills/statelines-create/SKILL.md), which lets a coding agent draw a new figure to the same rules.

```ts
import { defineFigure } from "statelines";

export const beacon = defineFigure({
  name: "Beacon",
  label: "A beacon on a plinth",
  setup: ({ spring }) => ({ lift: spring(0) }),
  draw(ctx, m) {
    const { scene, state } = ctx;
    // Success lifts the beacon clear of its plinth: a change of form, not only of colour.
    const lift = m.lift.to(state === "success" ? 14 : ctx.hover * 10).value;
    scene.box(0, 0, 0, 80, 80, 6);
    scene.cylinder(0, 0, 6 + lift, 14, 40, state === "loading" ? "hi" : ctx.verdict());
  },
});
```

## Repository

```
packages/statelines      the library (ESM, zero dependencies)
  src/engine          projection, springs, scene, the shared frame loop, styles
  src/core            types, the runner, DOM mounting, static rendering
  src/figures         101 figures in thirteen shelves, plus shared shapes
  src/react           the React wrapper (generated)
  test                engine tests and a sweep over every figure, state and option
apps/site             the website: home, figures, one page per figure, docs
  src/pages           one entry per page
  src/data            the catalog (generated) and lookups
  src/ui              shared shell and DOM helpers
scripts/generate.py   rebuilds the generated files from the figure sources
skills/statelines-create the agent skill for drawing new figures
docs                  rules and anatomy of a figure, for contributors
```

```sh
pnpm install
pnpm dev         # the site, at http://localhost:5173
pnpm test        # every figure, every state and every option
pnpm typecheck
pnpm build       # the library and the site
pnpm generate    # after changing a figure: rebuild the generated files
```

## The website

The site has four pages:

| Path | What it is |
| --- | --- |
| `/` | Home: the library in brief, live examples, the shelves. |
| `/figures` | Every figure. Search, filter by shelf, and switch the whole page between states. |
| `/figures/<name>` | One figure: every state, every option with live code, the props, and the code to use it. |
| `/docs` | Install, usage, options, theme, accessibility, and how to make your own figure. |

## Release

statelines follows semantic versioning. Each change to the library includes a changeset (`pnpm changeset`), which sets its bump and its changelog entry. Merging to `main` opens a release pull request, and merging that publishes to npm and creates a GitHub release. The full history is in [packages/statelines/CHANGELOG.md](packages/statelines/CHANGELOG.md).

See [Publishing in CONTRIBUTING.md](CONTRIBUTING.md#publishing) for release setup and the initial release.

## Deploy on Vercel

The repository is ready for Vercel as it is:

1. Push it to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository. Leave the root directory at the top level.
3. Vercel reads `vercel.json`: it runs `pnpm install`, builds with `pnpm --filter statelines-site build`, serves `apps/site/dist`, and rewrites `/figures/<name>` to the figure page.

Nothing else is needed. Pull requests get preview deployments automatically.

## Contributing

New figures are welcome when they draw a moment real apps have. Read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

MIT
