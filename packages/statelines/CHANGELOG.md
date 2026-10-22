# Changelog

## 0.3.0

- 101 figures in thirteen shelves. New: Creators (10, for creator and influencer platforms: discovery, match scores, audience rings, engagement, audits, outreach, approvals, tracking, payouts, ROI), Media (9), Security (10), Productivity (11), Devices (12), Wellness (10), Travel (9).
- The gallery is generated from the figure sources (`scripts/generate.py`), so flags and use lines cannot drift.
- Every figure answers the pointer. Idle figures stop; only loading loops.
- Every figure is drawn as the real object it names, with its recognisable parts (a camera has a lens barrel, viewfinder and shutter; a radar has a sweeping scope; a receipt prints from a printer), standing on a plate with real depth.
- Every state changes form as well as colour: something is delivered, lifted, opened, dropped, stuck or broken.
- Success and error no longer draw a tick or a cross; the green or red tone and the change of form carry the verdict. `marks` is still accepted but has no effect, and `scene.check` / `scene.cross` are deprecated no-ops.
- Tree-shakeable: importing one figure adds about 8 KB gzipped instead of the whole library, and `statelines/react` reuses the core build. All 101 figures together are about 83 KB gzipped.
- Approval no longer throws on entering error, which used to stop every figure on the page.

## 0.2.0

- New options on every figure: `progress`, `count`, `speed`, `colors`, `stroke`, `marks`, `interactive`.
- Thirteen figures show real progress during loading; nine accept an item count.
- `count` changes the layout where it should: Code becomes a 4-digit PIN, Table grows its sheet, Team spaces its seats.
- The gallery has a customise panel, and each card's code follows it.

## 0.1.0

- Thirty figures across six shelves: files, communication, commerce, account, AI and data, system.
- One `state` prop with five moments: idle, loading, success, error, empty.
- Vanilla, React and server rendering entry points.
- Shared animation frame that sleeps once every figure has settled.
