# Verification

Performed on 26 October 2026.

## Automated

`node --test tests/math.cjs tests/game.cjs`: 16 passing tests. The application tests run the actual data and game scripts in an isolated Node VM with a minimal DOM/storage adapter; they are state-machine integration tests, not browser tests.

Covered: all required calculations, A–Z and space round-trips, rejection of invalid inverses, deterministic scoring and stars, six missions and all stages, locked progression, empty/malformed input, three-heart failure and retry, replay without duplicate rewards, dialogue effects without token farming, corrupted/outdated saves, mid-mission restoration, explicit reset/overwrite confirmation, all three co-op rounds, hidden receiver plaintext, shared health, co-op failure/retry, and separate settings storage.

Syntax checks: `node --check js/data.js`, `node --check js/art.js`, `node --check js/game.js`.

## Browser checks

Used the in-app browser against the local HTTP preview.

- New Game, intro skip, callsign entry, Safehouse hotspot, and mission briefing.
- Completed all six missions, including both stages of missions 03 and 06; reached the campaign ending. One intentional wrong answer in mission 01 produced a final total of 840 points and 17 stars, as expected.
- Submitted an empty answer: no life loss. Submitted an incorrect integer answer: health fell from 3 to 2 and potential score from 150 to 90.
- Refreshed midway through mission 03; Continue restored stage 2 with campaign progress intact.
- Aria dialogue choice displayed a different response and added the internal log to the archive.
- Co-op setup, sender encryption, transmission animation, handoff, receiver view without plaintext, incorrect receiver answer with shared-life deduction, and successful receiver decryption with a 90-point team result.
- Inspected desktop title screen, Safehouse, and puzzle art. At a 390 px viewport, completed mission 02 and checked that document width equalled available viewport width; no horizontal overflow. Also checked the title screen at 320 px and corrected its minimum-width overflow; the final document width equalled available viewport width (305 px after the scrollbar).
- Verified the Reduce motion setting and the in-game reset confirmation. Removed the campaign created during testing so the final menu starts with no saved campaign.
- Browser console log collection returned no entries during these checks.

The entire three-round co-op sequence and invalid-save/failure/replay edge cases were additionally exercised by the automated state-machine tests. They were not all repeated manually in the browser.

Screenshots in `previews/` document representative desktop and mobile layouts. HTTP preview and direct `file://` use different browser storage origins. Direct file opening is supported by relative scripts and local assets without fetch calls; browser QA used the HTTP preview.

## Character and exploration update

`node --test tests/math.cjs tests/game.cjs tests/exploration.cjs tests/controller.cjs`: 26 passing tests, including the previous 16 campaign/math checks. New checks cover collision against desks/crates and room boundaries, normalized movement speed, large-frame-gap handling, routes around obstacles, all four hotspot approaches, E proximity, cancellation by manual movement, invalid starting locations, keyboard scoping away from text fields, modal pause/resume, touch press/release, and listener/animation cleanup.

Browser QA used a separate `localhost` origin, leaving the player's `127.0.0.1` campaign alone. Verified WASD movement (x=476 to x=537), arrow-key collision stopping at y=403 in front of the desk, clicking the floor to reach x=675/y=445, E opening Aria dialogue, and clicking Central Terminal causing an approach followed by its mission briefing. Also verified a held D-pad button moved the character on the 390 px layout. Corrected the mobile canvas scaling so the sprite retains its proportions. At 390 px, document width matched viewport width. Final browser console collection returned no entries.

New screenshots: `previews/interactive-safehouse.png`, `previews/interactive-mobile.png`. `previews/characters.png` is a locally rendered character contact sheet, not a loaded sprite sheet or remote asset.

## Soundtrack and audio update

`node --test tests/math.cjs tests/game.cjs tests/exploration.cjs tests/controller.cjs tests/audio.cjs`: 38 passing tests. Audio coverage includes gesture-gated initialization, one reused AudioContext/scheduler, ambient loop ownership, independent/clamped mixer values, mute/resume, cue envelopes and throttling, quieter puzzle music without the melody, distance-based footsteps, tab visibility suspension, cancellation of pending suspension, unsupported-audio fallback, resource cleanup, legacy mute preferences, and persistent mixer values independent of campaign saves.

The actual Web Audio graph was rendered through a browser OfflineAudioContext using `tests/audio-render.html`: 18 seconds, stereo, 24,000 Hz, 432,000 frames. Peak 0.20513 (−13.76 dBFS), RMS 0.03250, all finite, no clipping. The sample moves through rain, Safehouse, footsteps, terminal access, puzzle, error feedback, completion, transmission, and ending. Saved as `previews/soundcheck.wav`. These measurements verify the rendered signal; no listening assessment is claimed.

Browser checks on the separate localhost QA origin verified `ready` before a gesture and `running` after Continue, scene labels changing to Safehouse / Mission Standby / Terminal Focus / Signal Restored, independent music-slider changes from 36 to 35 and back, Test Sound, mute and unmute, and a wrong/correct puzzle submission with audio enabled. Browser console collection returned no entries. `previews/audio-settings.png` shows the mixer. The old 127.0.0.1 campaign was not used for destructive tests.
