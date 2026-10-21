# Figure review notes

One line per figure: what changed, and any problem left open. Contact sheets for each batch sit
next to this file (`<shelf>-<batch>.png`, one row per figure, one column per state). They are
rendered from the running site by `apps/site/scripts/review.mjs`, which also checks for console
errors, `NaN`/`undefined` in the markup and drawings that leave the viewBox.

## Shared changes

- No tick or cross in any redrawn figure. Success and error are carried by the ok and err tones
  together with each state's change of form (delivered, lifted, dropped, stuck, slid off). An
  earlier pass put the marks on a token on the floor; they read as squashed and out of place, and
  were removed at the owner's request. The `marks` option is still accepted but has nothing to
  hide in a redrawn figure; `test/options.test.ts` now checks exactly that.

## Creators

- Discover: lens is now a plated glass with a solid handle, and casts its circle onto the card beneath; cards carry a name line; on error the lens sinks low over the wall instead of only turning red; empty is fully dashed, lens included.
- Match: the floating gauge arc now lives on the face of a console standing between brand and creator, with ticks and a pivot; brand block carries its mark; on success the pair step in, on error they step apart; verdict in colour only.
- Audience: crowd now stands on a round plate with faint ring guides; on error the outer rings sink and fade (audience lost) instead of random red dots; creator's stand rises on success; empty draws a dashed stand and creator.
- Engagement: post face now shows a photo (mountain and sun), a like dot and a caption instead of a chart; success raises the bars.
- Audit: belt and a full arch (two posts and a lintel) with a light curtain; fakes are pushed off the belt onto the plate; success shows the real followers through and the fakes set aside; error stops the line with a fake through the gate.
- Outreach: brand stands on its own plate and every creator on a pad; routes start and end clear of the objects; error breaks one route with a gap and turns only that creator red.
- Approval: stations lie on one axis with distinct glyphs (lines, eye, seal); error now holds the post at review instead of sending it back. Fixed a crash: the stage spring overshot below 0 on entering error and indexed past the station list, which threw inside the shared animation frame and froze every figure on the page.
- Tracking: rail moved to the front with a tracker cart riding it and a tether to the post it reads; bars sit behind the posts so nothing crosses them; error stalls on the third post with the remaining bars left flat.
- Payout: the coin stack treasury is now a vault with a round door; creators stand on pads with their stacks beside them and routes run clear of every object; the idle coin is no longer drawn in the loading tone.
- Roi: removed the floating arrow and the sparkle (the generated-content mark, misused here); the campaign is a block with a slot and a trend on its face that rises, or falls on a loss. Open: the face chart is subtle at 200 px because the side face's own slope cancels a gentle rise; the stacks carry the idea without it.

## Files

- Upload: the flat slab is now an open tray (the existing `tray` shape) on a plate, with a dashed landing mark inside; the sheet drops below the rim and lands; error hangs the sheet above the zone; the bar runs on the plate in front.
- Download: storage is a cabinet with three drawers and a slot, on one plate with a rimmed tray; the two were moved apart across the frame so the sheet's arc travels sideways instead of straight down; error leaves the sheet hanging mid-flight.
- Folder: stands on a plate; files carry title lines above the flap; empty shows a dashed file inside the open folder; the error file hangs higher.
- Table: rows were rows of keycaps and read as a keyboard; each row is now one strip with column rules and a value line per cell, a bold header row, and the arriving row in the loading tone.
- Database: stack stands on a plate; each disk has a status light that goes active while loading (a snapshot between lifts read as idle before); the error disk slides further off the stack.

## Communication

- Inbox: blank slabs became letters (the shared `envelope`); a falling letter is drawn in the loading tone; empty shows a dashed letter on the tray floor instead of one floating above.
- Send: the floating dashed arc is gone; the far tray is now a mailbox on a post with a slot and a flag that rises on delivery; success shows the letter standing in the slot; error drops the envelope short onto the plate between the two. Label updated to name the mailbox.
- Chat: the phone was a slab lying flat and read as a board.
- Alerts: stack stands on a plate; each card has an app icon, a bold title on the top card and a detail line; the unread badge sits on the top card's far corner and takes the verdict colour.
- Team: people stand on a round plate with a pad per seat and links that stop short of host and pads; the failing seat's link, pad and person turn red.

## Commerce

- Cart: stands on a plate on four wheels; the bare polyline handle is now two posts and a grip; a dropped item lands on the plate in front instead of floating outside the wall; the arriving item is in the loading tone; empty shows a dashed item on the basket floor.
- Pay: terminal stands on a plate with a set-in screen, keypad and slot; error drops the card onto the keypad; success lifts it away.
- Receipt: sits on a desk plate; gains a torn edge, a bold heading and a bold total; the stamp's imprint stays the verdict; empty is dashed throughout, stamp included.
- Shipping: the route now runs from a depot with a loading door to a home with a pitched roof; passed stops take the route's tone and the stuck stop turns red.
- Wallet: there was no wallet, only coins; the figure now has a wallet with a flap and clasp that lifts toward the pointer, with the coin stack beside it. Open: at 200 px the wallet reads as a lidded case more than a wallet.

## Account

- Code: the strip of keys now sits on a plate with a padlock behind it; the shackle lifts open on success and the keys sink flush in the success tone; error pops the wrong key up out of the row and turns the lock red; the empty cursor is no longer drawn in the loading tone.
- SignIn: the bare frame is now a doorway in a wall with a panelled door, a keypad and a doormat; loading rattles the door on its latch with the handle and keypad active; error drops a bar across the shut door instead of only a cross on the floor.
- Denied: a visitor now stands at the barrier: on success the arm lifts and the visitor walks through to the far side, on error the visitor is turned back with the arm down; loading twitches the arm in the active tone with the light blinking; the open arm no longer leaves the frame.
- Profile: the card sits on a plate with a header rule and labelled fields; the avatar stands on a round pad with a ring that fills while loading and a field line that writes itself; error stops the ring short and slides the photo off its pad.
- Plans: tiers carry their features on the front face and a coin stack for the price; the idle choice is no longer drawn in the loading tone; success lifts the chosen tier, error leaves it down and spills its top coin onto the plate.
