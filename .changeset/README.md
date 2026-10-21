# Changesets

This repository versions the `statelines` package with [Changesets](https://github.com/changesets/changesets).

Every change that a user of the library would notice needs a changeset:

```sh
pnpm changeset
```

Pick the bump, then describe the change in one or two sentences. The description becomes the changelog entry.

| Bump | Use it for |
| --- | --- |
| patch | Fixes that do not change what a figure looks like or how it is used. |
| minor | New figures, new options, new states, or visual changes to existing figures. |
| major | Removed or renamed figures or options, or changed defaults that alter existing output. |

The website is private and is not versioned by changesets.
