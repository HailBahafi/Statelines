# Changelog

## 0.3.0

- 101 figures in thirteen shelves. New: Creators (10, for creator and influencer platforms: discovery, match scores, audience rings, engagement, audits, outreach, approvals, tracking, payouts, ROI), Media (9), Security (10), Productivity (11), Devices (12), Wellness (10), Travel (9).
- The gallery is generated from the figure sources (`scripts/generate.py`), so flags and use lines cannot drift.
- Every figure answers the pointer. Idle figures stop; only loading loops.

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
