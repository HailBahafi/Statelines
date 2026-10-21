# Figure review notes

One line per figure: what changed, and any problem left open. Contact sheets for each batch sit
next to this file (`<shelf>-<batch>.png`, one row per figure, one column per state). They are
rendered from the running site by `apps/site/scripts/review.mjs`, which also checks for console
errors, `NaN`/`undefined` in the markup and drawings that leave the viewBox.

## Shared changes

- `shapes.ts` gains `badge`: a low token in the verdict tone with the tick or cross on its top
  face. Marks drawn bare on the floor read as scribbles; on a token sized to fit them they read
  as a seal. Built only from existing scene primitives, and it still uses `scene.check` and
  `scene.cross`, so `marks: false` keeps hiding the tick and the cross.

## Creators

- Discover: lens is now a plated glass with a solid handle, and casts its circle onto the card beneath; cards carry a name line; on error the lens sinks low over the wall instead of only turning red; empty is fully dashed, lens included.
- Match: the floating gauge arc now lives on the face of a console standing between brand and creator, with ticks and a pivot; brand block carries its mark; on success the pair step in, on error they step apart; verdict on a token.
- Audience: crowd now stands on a round plate with faint ring guides; on error the outer rings sink and fade (audience lost) instead of random red dots; creator's stand rises on success; empty draws a dashed stand and creator.
- Engagement: post face now shows a photo (mountain and sun), a like dot and a caption instead of a chart; success raises the bars; error cross moved onto a token in front of the post.
- Audit: belt and a full arch (two posts and a lintel) with a light curtain; fakes are pushed off the belt onto the plate; success shows the real followers through and the fakes set aside; error stops the line with a fake through the gate.
- Outreach: brand stands on its own plate and every creator on a pad; routes start and end clear of the objects; error breaks one route with a token in the gap and keeps the other creators neutral.
- Approval: stations lie on one axis with distinct glyphs (lines, eye, seal); error now holds the post at review instead of sending it back. Fixed a crash: the stage spring overshot below 0 on entering error and indexed past the station list, which threw inside the shared animation frame and froze every figure on the page.
- Tracking: rail moved to the front with a tracker cart riding it and a tether to the post it reads; bars sit behind the posts so nothing crosses them; error stalls on the third post with the remaining bars left flat.
- Payout: the coin stack treasury is now a vault with a round door; creators stand on pads with their stacks beside them and routes run clear of every object; the idle coin is no longer drawn in the loading tone; error breaks the longest route with a token in the gap so it hides nothing.
- Roi: removed the floating arrow and the sparkle (the generated-content mark, misused here); the campaign is a block with a slot and a trend on its face that rises, or falls on a loss; the verdict token caps the return stack. Open: the face chart is subtle at 200 px because the side face's own slope cancels a gentle rise; the stacks carry the idea without it.
