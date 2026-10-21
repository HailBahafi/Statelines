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
- Receipt (second pass, at the owner's request): now a receipt printer on a plate with a slot, display and status light; the slip stands out of the slot with a torn top edge and printed lines; loading feeds it out, success shows the full slip with a green paid stamp, error tears it off short and drops the torn piece on the plate. Doc and label updated.

## Security (early fix)

- Fingerprint: the ridges were half circles cut off by their angle range; the print now sits whole on the glass of an upright reader as nested arches; loading sweeps a scan line that lights the ridges below it; success completes them in green; error breaks every other ridge (smudged) in red; empty is a dashed outline. The rest of the shelf is still to be redrawn.
- Radar: the flat rings with a red dot that showed even while loading (red is for errors only) became a radar display: a round scope facing the viewer on a stand, with range rings, crosshairs, and a beam trailing a fading afterglow. Contacts light as the beam passes and fade behind it; error stops the beam on a single ringed red threat; success clears the screen in green; at rest the beam leans toward the pointer.

## Devices (early fix)

- Camera: was a slab with a cylinder on top and read as a box; now a camera body with a viewfinder hump, shutter button, mode dial, flash window and grip, and a ribbed lens barrel of stepped rings ending in glass with an iris. Loading presses the shutter, blinks the flash and pulses the iris; success slides an instant photo out onto the plate; error cracks the lens glass; empty is a dashed body and lens. The rest of the shelf is still to be redrawn.

## AI and data

- Write: the flat page became a clipboard standing on a block, with a board, a metal clip and ring, and a sheet with a folded corner; a pencil writes at the end of the text (active while loading) and lifts on hover; success lays the pencil down on the plate and turns the sheet green; error snaps the pencil's point off onto the plate and reddens the last line. The tick and cross are gone.
- Imagine: the grid of blocks became a canvas on an easel (two legs, back strut, ledge) showing a sun over hills; loading resolves the picture from pixel tiles with the newest tiles outlined in the active tone; idle leaves three sky tiles unresolved; error slips a slice of the picture sideways out of the frame; empty is a dashed canvas with a dashed horizon.
- Analytics: the bars now stand in a chart corner, a back wall and a side wall ruled with gridlines; success raises the series in green; error collapses the bars to stubs and the last column breaks off and lies on the plate; hover lifts the bar under the pointer without the active tone.
- Search: the flat list became a monitor (foot, neck, bezel) showing a search bar and three results with thumbnail, title and snippet; a magnifying glass with a thick rim, ferrule and handle hangs in front and magnifies the title under it; loading scans it across the results, lifting each one it passes; success rests it on the found result in green; error empties the results to dashed slots and drops the glass onto the plate. Open: the glass hangs in the air in front of the screen with nothing holding it.
- Calendar: the flat grid became a desk calendar standing on a foot, with wire binding loops across the top, a header band with the month line, a weekday row and the weekend column dimmed; the picked day lifts off the page; loading lifts the days in turn; success circles the picked day in green; error drops the picked day out of the month onto the plate, leaving a red hole.

## Media

- Play: the flat frame became a television on a stand with a bezel and a paused frame (hills under a sun) on its glass; the play button stands proud of the screen and presses in on hover; loading presses it flush with a buffering ring turning round it while the scrub bar fills; success sinks the button away and brings the picture up in green with the bar full; error tears the picture (the right half slips down with static across it) and stalls the bar in red. The cross is gone.
- Clap: the slate lying flat with a panel standing on it became an upright clapperboard with a striped bar, ruled fields on the slate and a striped clapstick on a hinge pin; idle holds it open (wider on hover), loading snaps it shut over and over, success shuts it in green, error knocks the stick off its pin so it hangs across the slate in red.
- Waveform: the bars stand in a longer track with a ruler along its raised back rim; the playhead is a pin at the front of the track with a cap and a line across the floor; played bars are solid, unplayed ones muted; error flattens everything after the playhead in red; success plays the whole clip in green. The tick is gone. Open: still reads as a bar chart in a tray more than an audio clip at small sizes.
- Gallery: the tiles became prints with a white border, a wider bottom strip and a picture (hills and a sun) inside; success lifts the picked print and stands it up toward the viewer a size larger in green; error slides it off the edge of the table at an angle with its picture torn; empty is a grid of dashed slots. The tick and cross are gone.
- Vinyl: the flat disc became a turntable: a plinth with a start button, speed knob and arm rest, a platter carrying the record with grooves, label and spindle, and a tone arm with base, counterweight, bent arm and headshell; idle parks the arm on its rest (it swings toward the record on hover); loading lowers it onto the spinning record; success rests it in the inner groove in green; error lifts it off with a red scratch across the grooves; empty is a bare platter with a dashed record. The tick and cross are gone.
- Rating: the strip of flat stars became a review card standing in a holder, with an avatar, a name line, the stars and two lines of review; set stars stand out of the card in layers with an inset star, unset ones stay faint outlines; loading sets them one by one in the active tone; success sets them all and outlines the card in green; error sets one in red and the next star drops off the card onto the plate. The cross is gone.
- Like: the flat heart became a thick heart (three layers) standing on its point in the cup of a pedestal, with a highlight on its left lobe; loading beats it in the active tone; success swells it in green; error splits it down a jagged crack and the two halves lean apart in red. The cross and the sparkle are gone.
- Thread: the two slabs became a tablet on a stand showing a comment with an avatar, a reply beneath it joined by a thread line, and a reply field with a send button; the comments are bubbles with tails standing proud of the screen and the top one lifts on hover; loading adds a typing bubble with three dots; success posts the new reply in green and extends the thread line to it; error drops the new reply off the tablet onto the plate in red. The tick and cross are gone.
- Live: the pin and slab became a lattice broadcast mast (tapering legs, rings, cross braces, an aerial with a beacon) and a television on feet showing a presenter and a live badge; loading sends waves out from the beacon on both sides; success holds two green waves and brings the presenter up in green; error bends the aerial over in red and fills the screen with static. The tick and cross are gone.
