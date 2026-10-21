# Anatomy of a figure

```ts
export const upload = defineFigure({
  name: "Upload",                 // the React component name
  label: "A sheet dropping into an upload zone",
  offset: 0,                      // nudge the drawing up (-) or down (+) in its frame
  setup: ({ spring }) => ({ ... }),
  draw(ctx, model) { ... },
});
```

## setup

Runs once. Create every spring here. `spring(initial, stiffness = 170, damping = 26)`.

## draw

Runs every frame while the figure is awake. Decide targets from `ctx.state`, move springs toward them, then draw with what the springs read now.

```ts
const Z = model.z.to(target).value;
```

For loops, drive values directly with `spring.set(value)` so they track time exactly, and let the spring take over again when the state changes.

## The context

| | |
| --- | --- |
| `scene` | Where you draw. |
| `state` | `idle`, `loading`, `success`, `error` or `empty`. |
| `time` | Seconds since mount, scaled by `speed`. **Reading it keeps the figure awake**, so read it only in the looping state. |
| `loop(period)` | A phase 0…1 that repeats every `period` seconds. Keeps the figure awake. |
| `progress(period)` | The user's `progress` when given, otherwise the same phase as `loop(period)`. Write the loading state once against it and both modes work. |
| `determinate` | True when the user passed `progress`. Skip `spring.set()` then, so progress changes ease instead of jumping. |
| `count(fallback, max, min)` | The user's `count`, rounded and clamped. Create springs for `max` items in `setup`. |
| `stateTime` | Seconds since the state changed. Does not keep the figure awake. |
| `hover` | 0 when the pointer is away, up to 1.5 at full intensity. Multiply hover responses by it. |
| `pointer` | `{ x, y, over }`, eased, in the figure's own coordinates. |
| `ground(z)` | The pointer projected onto the plane at height z. Use it to find what the pointer is over. |
| `lean(reach)` | A world offset toward the pointer, `reach` units at full strength. |
| `fade(seconds)` | 0 → 1 after a state change, for marks that draw in. |
| `shake(amplitude)` | A decaying shake on entering `error`, 0 otherwise. |
| `verdict(fallback)` | `"ok"` on success, `"err"` on error, otherwise the fallback tone. |

## The scene

All coordinates are world units. Boxes and cylinders are centred on (x, y) and rest on z.

| | |
| --- | --- |
| `box(x, y, z, w, d, h, tone?, opacity?)` | A solid with one crease. |
| `cylinder(x, y, z, r, h, tone?, opacity?)` | An upright cylinder. |
| `disc(x, y, z, r, tone?, { fill, plate, opacity })` | A flat circle, a dot, or a lens. |
| `rect(x0, y0, x1, y1, z, tone?)` | A flat rectangle outline. |
| `line(a, b, tone?, { bold, opacity })` | A segment between two points. |
| `polyline(points, tone?, { bold, closed, opacity })` | A path through points. |
| `arc(x, y, z, r, a0, a1, tone?, style?)` | Part of a flat circle. |
| `panel(points, tone?, opacity?)` | A filled flat polygon in any plane, for doors and lids. |
| `check(x, y, z, tone?, opacity?)` / `cross(...)` | The verdict marks, drawn flat. |
| `sparkle(x, y, z, size, tone?, opacity?)` | The mark of generated content. |

Tones: `base`, `hi`, `ok`, `err`, `muted`, `faint`, `ghost`.

Shared objects (a sheet, an envelope, a person, a parcel, a tray) live in `src/figures/shapes.ts`. Reuse them so the same object looks the same everywhere.

## Draw order

Later calls cover earlier ones. Draw the floor, then what is further back (smaller `x + y`), then what is nearer. When several objects move, collect them with their depth and sort, as `team` and `calendar` do.
