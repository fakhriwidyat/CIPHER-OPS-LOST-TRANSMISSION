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

## Multiplayer / four separate sessions

52 automated tests pass, including 14 room/API tests: four-player capacity, unique seats, readiness and host permissions, all eight stages across six missions, malformed answers, idempotent submissions, shared hint penalties, failure/retry, stale-stage rejection, disconnect/pause/reconnect, host migration, removing disconnected members, two-player minimum, session secrecy, expiry, and concurrent updates against both memory and a real SQLite D1 adapter.

The built production Worker was started locally with its D1 binding. tests/smoke-online.mjs used four independent HTTP bearer sessions to complete all six missions and eight stages for 900 team points, then left the QA room. This exercises the real HTTP routes and Worker/D1 runtime, not just mocks.

Browser QA used four independent tabs (ECHO, NOVA, VEGA, LUNA): invitation join, ready/start, four distinct packets (HI/GO/UP/OK), empty-answer validation without lost hearts, automatic waiting at 1/4 through 3/4, and synchronized completion at 4/4 for 150 points. Refresh restored the same player and result. Screenshot: previews/multiplayer-four-players.png. These are independent browser sessions on one computer; no claim of a physical four-device test is made.


Published version 1 at https://cipher-ops-lost-transmission.wavycat8.chatgpt.site, source 406805c29416b777ec1f104322a9b0410f408bf8. Hosting returned succeeded. The same real HTTP smoke test passed on the public URL: four bearer sessions completed all six missions / eight stages for 900 points, then left the QA room. Public browser loaded the title menu and Main Bareng entry successfully. At 390 px width, document clientWidth and scrollWidth both measured 375 px (no horizontal overflow). Browser warning/error log collection was empty. Added previews/online-multiplayer.png and previews/multiplayer-mobile.png.


## Unique operator and asymmetric mission update

59 automated tests pass. New checks cover unique role selection, readiness reset, active-mission role locking, simultaneous claims with both memory and SQLite/D1 CAS, four distinct task kinds in every stage, one shared objective, deterministic reconnect/retry, regenerated new sessions, 30 seeded campaigns with valid unique choices, hidden calibration coefficients, and active legacy-room compatibility.

Four real HTTP sessions on the local server completed all six missions / eight stages with distinct operator identities and task kinds at every stage, for 900 team points. Browser QA selected BOLT, joined a second player who received the free KAI role, verified the occupied BOLT card was unavailable, and completed a repair task and encryption task toward the same 150-point result. Continued through mission 2 (repair versus packet selection), then validated mission 3 calibration with samples (2,18) and (4,28), accepting a=5 and b=8. Personalized debrief displayed the actual repair calculation. The four sprites have distinct equipment and silhouettes, with idle/blink/wave animation and cached portraits. Screenshots: operator-selection.png and operator-calibration.png.


Operator update deployed as version 2, source 2f0f0cdc69f4cff87b8a3aaf5d21a949a0050d59. Hosting returned succeeded. The real public HTTP test passed: four distinct operator identities and four distinct challenge kinds at every stage, all six missions / eight stages complete for 900 points; QA clients left afterward. The final hosted-browser reload encountered a browser DNS error, so no hosted visual verification is claimed for version 2; local browser visuals and live public API behavior were verified separately. The attempted viewport override did not change the QA tab width (1265 px), so mobile visual verification is not claimed for this update.

## Vercel missing room API fix

Reproduced on the user's Vercel branch URL: the page returned 200 HTML while /api/health returned 404 text, explaining the misleading server-not-active message. Added a zero-dependency Node Vercel Function and explicit health/room rewrites. The function uses the existing persistent D1-backed service, validates routes/origins/JSON/body size, forwards bearer sessions without cookies, and returns JSON for upstream failures/timeouts. Client diagnostics now distinguish an undeployed API from a local-file launch.

64 automated tests pass, including five gateway/config checks for path routing, live room-rule integration through a fetch adapter, auth/origin handling, session/status preservation, streamed and pre-parsed bodies, request limits, rejected routes/methods, HTML upstream errors, timeouts and network failure. Official Vercel configuration schema confirms nullable build/install commands. The release archive includes api/ and Vercel config.


2026-10-30: Main Bareng v3 menambah 30 tahap dan pengacakan enam jenis tugas. 66 tes lulus, termasuk seluruh 30 tahap empat pemain, perbedaan empat tugas tiap tahap, tidak ada jenis berulang berturut-turut, 80 seed, dan kompatibilitas v2.
