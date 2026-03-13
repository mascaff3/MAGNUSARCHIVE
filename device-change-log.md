# Device Change Log

Date: 2026-03-12
Project: Archive Survival Prototype (Magnus Archives-inspired)

## Scope

This repo does not have a tracked git baseline yet. `git status` shows the project as untracked and `HEAD` does not exist, so this log is based on filesystem timestamps plus code review of the most recently modified files.

This file should be updated after substantive responses in this thread so recent state survives context loss.

## Most Recent Local Code Changes

- `src/run-game.js` last modified `2026-03-12 09:36:15`
- `src/templates.js` last modified `2026-03-12 09:36:27`
- `src/run-data.js` last modified `2026-03-12 09:30:18`
- `src/sound.js` last modified `2026-03-12 09:35:51`
- `styles.css` last modified `2026-03-12 09:37:10`
- `device-change-log.md` last modified `2026-03-12 09:01:06`

## Current State Summary

### Gameplay flow

- Run persistence and high score storage are present through `localStorage`.
- The Web minigame now uses plain left click selection for fragments instead of drag-select behavior.
- Stability is surfaced as an explicit meter with direct rules in the live UI and case instructions.
- The decorative spider has calmer motion and now moves toward clicked nodes instead of looking erratic.

### Web case variety

- Web cases are no longer hardcoded to `Borrowed Key`.
- Added a Web case pool:
  - `Borrowed Key`
  - `Courtesy Lift`
  - `Shared Password`
  - `Committee Note`
- Runs now use a shuffled bag so the same case does not always open first and cases do not immediately repeat until the bag refills.

### Audio and music

- Background audio is no longer just a sparse noise bed.
- Added a procedural music transport with multiple theme sets in `src/sound.js`.
- Current music coverage:
  - menu theme
  - Web mundane theme
  - Web distorted theme
  - Web domain theme
- Interaction SFX are still present for node select/release/reject and case feedback.
- Added dedicated wheel spin ticking and wheel reveal audio.

### Visual feedback

- Added Web interaction VFX:
  - node cast pulse
  - node release pulse
  - node reject flash
  - field thread pulse
  - field fail pulse
  - field success pulse
- Added wheel VFX:
  - animated rotation state
  - halo effects
  - rune flicker
  - spark bursts on reveal
- Eye-band animation now uses desynced blink profiles with longer closed holds, double-blinks, twitch patterns, and iris drift.

### Desktop packaging

- macOS packaging work from the earlier session is still present:
  - app bundle build script
  - icon generation
  - `WKWebView` wrapper app

## Known Issues / Follow-Ups

1. `nextWheelChoice` still appears unimplemented.
   - The item remains in `src/run-data.js`.
   - The modifier still exists in `src/run-game.js`.
   - No confirmed reward-selection behavior uses it yet.

2. `build/` output is still noisy in git.
   - `.gitignore` ignores `dist/` and `build/swift-module-cache/`, but not the full generated `build/` tree.

3. Live browser verification is still only partial.
   - Local builds pass.
   - Safari automation is blocked on this machine unless Safari settings enable remote automation / JavaScript from Apple Events.

## Verification

- Repeated `zsh scripts/use-local-toolchain.sh pnpm build`
- Current result: success

## Suggested Next Steps

- Add more Web cases if more statement variety is wanted.
- Either implement `nextWheelChoice` or remove it from the reward pool.
- Clean up `.gitignore` for generated `build/` artifacts.
- Add an initial commit so future reviews can use a real diff instead of filesystem scans.
## 2026-03-12 10:20 - User-Reported Web Regressions / Repair Plan

Current reported issues from in-device testing:
- Web sequence still behaves like keyboard-first interaction; user wants direct left-click selection on words/fragments.
- Spider visuals are still broken; legs do not appear to walk.
- Eye band is no longer visible.
- Text contrast/readability is poor across multiple screens due to inappropriate backgrounds.
- Desolation and Lonely should remain removed from active play/UI until further notice.

Planned repair sequence:
1. Re-audit the Web interaction path in `src/run-game.js` so fragment selection is handled entirely by left-click with immediate visual state updates and no dependency on focus/keyboard controls.
2. Rework spider animation and leg timing in `styles.css` and related markup/state so leg motion reads clearly instead of subtle transform noise.
3. Restore eye-band visibility by fixing stacking, contrast, opacity, and layout interactions in `styles.css` / `src/templates.js`.
4. Normalize text contrast across panels, overlays, cards, and case screens so all text sits on readable surfaces.
5. Confirm Desolation/Lonely are removed from rotation, UI copy, and any remaining surfaced references until explicitly re-enabled.
6. Rebuild and then do a targeted runtime pass against the Web flow only before touching any other fear.

## 2026-03-12 10:24 - Music Licensing Direction

User reported that the in-game music still does not sound changed enough.

Licensing check:
- UNDERTALE / DELTARUNE music is not a safe drop-in game soundtrack choice. Materia Music Publishing's published YouTube FAQ says use in videos is allowed only when done non-commercially, with credit, and under their rights administration; that is not the same as shipping it inside this project as game music.
- For replacement music, prefer genuinely reusable tracks under CC0 or similarly clear game-safe licenses instead of relying on fandom assumptions.

Planned soundtrack correction:
1. Stop trying to sell procedural synth texture as the final answer.
2. Replace or supplement the generated score with actual licensed tracks from clearly reusable sources.
3. Prefer CC0 game-safe music libraries first; avoid anything with ambiguous reuse terms or Content ID risk unless explicitly accepted.

## 2026-03-12 10:29 - Candidate Replacement Music Shortlist

Shortlisted game-safe options with clear reuse terms:
- `Mandatory Overtime` by Joth on OpenGameArt: CC0. Good fit for oppressive menu / low-intensity dread.
- `Haunting Chiptune Loop [Void Estate]` by Zane Little Music on OpenGameArt: CC0. Strong fit for Web baseline tension.
- `The 9th Circle` by Joth on OpenGameArt: CC0. Stronger escalation / reward / high-intensity phase option.
- `Night of the Streets [Horror/Suspense]` by nene on OpenGameArt: CC0. More cinematic horror option if the Web needs less chip and more pressure.
- `Fakebit / Chiptune Music Pack` by Ragnar Random on OpenGameArt: CC0 pack with many tracks, useful if a broader Undertale-adjacent retro palette is needed without licensing risk.

Supporting license notes:
- Pixabay FAQ states music is free to use under the Pixabay License, including commercial use, but track provenance can still vary and some items are AI-generated. For this project, OpenGameArt CC0 is the safer first choice.

## 2026-03-12 10:33 - Chosen Music Direction

Chosen scene mapping:
- Menu / title: `Mandatory Overtime` by Joth
- Web baseline casework: `Haunting Chiptune Loop [Void Estate]` by Zane Little Music
- Web escalation / pressure state: `Night of the Streets [Horror/Suspense]` by nene
- Wheel / reward / ritual spike: `The 9th Circle` by Joth

Reasoning:
- `Mandatory Overtime` fits the bureaucratic dread tone better than pure horror right at the front door.
- `Haunting Chiptune Loop [Void Estate]` carries the uneasy retro-game feel closest to the target mood without sounding like white noise.
- `Night of the Streets` gives the Web a stronger danger state when the run starts slipping.
- `The 9th Circle` is the cleanest fit for dramatic reward/spin escalation.

## 2026-03-12 10:36 - Visual Bug Status

Status at this point:
- The visual bugs reported in the latest user feedback have not yet been repaired in code.
- Work completed since that report has been limited to soundtrack licensing verification, source selection, and planning/logging.

Outstanding visual issues still to fix:
- Web sequence selection should be direct left-click on the words/fragments with no keyboard-first dependency.
- Spider leg animation needs to visibly read as walking.
- Eye band needs to be visible again.
- Text/background contrast needs a full pass for readability.
- Desolation/Lonely removal needs to be re-checked across surfaced UI/state.

## 2026-03-12 10:46 - Web Repair Pass And Music Replacement

Implemented:
- Reworded the Web instructions and controls so left-click is the primary interaction path again.
- Added explicit `type="button"` on Web fragment tablets and prevented default pointer-focus drift on left click.
- Fixed the main tablet glitch source in `styles.css`: generic `button:hover` transforms were overriding the absolute-positioned Web node transform, which could make tablets snap/jitter off-center. Web nodes now keep a stable `translate(-50%, -50%)` transform in all interaction states.
- Removed the tablet tilt/perspective treatment that was making the Web nodes feel unstable and hard to read.
- Increased contrast across panels, rules cards, helper text, and Web status panels.
- Restored eye-band visibility with stronger stacking, opacity, border, and header spacing.
- Reworked spider motion so the body orientation follows movement and each leg has a larger alternating stride instead of tiny near-static rotation changes.

Music replacement:
- Downloaded licensed replacement tracks into `assets/audio/music/`:
  - `mandatory-overtime.mp3`
  - `void-estate.ogg`
  - `night-of-the-streets.mp3`
  - `the-9th-circle.mp3`
- Replaced the procedural background soundtrack path with file-backed scene music:
  - Menu: `Mandatory Overtime`
  - Web baseline: `Void Estate`
  - Web distorted/domain: `Night of the Streets`
  - Wheel: `The 9th Circle`
- Kept the existing WebAudio interaction SFX for clicks, failures, fear cue, and wheel ticks/reveal.

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed after the repair pass.

Lonely/Desolation status:
- No active gameplay/UI references remain in `src` or `styles.css`.
- Remaining references are only in asset/reference documentation files under `assets/`.

## 2026-03-12 10:56 - Literal Lonely/Desolation Purge And Audio Startup Fix

Follow-up after user escalation:
- Previous interpretation was too narrow. User wanted Lonely/Desolation scrapped, not merely left inactive.

Changes made:
- Removed Lonely/Desolation documentation references from:
  - `assets/audio/fears/README.md`
  - `assets/stock/SOURCES.md`
  - `assets/fanart-references/LINKS.md`
- Deleted stale local assets for those fears:
  - `assets/audio/fears/lonely.wav`
  - `assets/audio/fears/desolation.wav`
  - `assets/stock/lonely-hallway.jpg`
  - `assets/stock/desolation-fire-building.jpg`
- Deleted the stale `build/` output that still contained old Lonely/Desolation code and references.

Audio corrections:
- Switched Web baseline music from `void-estate.ogg` to `void-estate.mp3` for better browser compatibility.
- Forced `music.enable()` + `music.unlock()` on gameplay/menu action clicks so music startup happens on a direct user gesture instead of depending on later scene changes.

Verification:
- `rg -n "lonely|desolation" .` returned no remaining matches in the working tree after the purge.
- `zsh scripts/use-local-toolchain.sh pnpm build` passed after the audio/startup changes.

## 2026-03-12 11:02 - macOS App Bundle Restored

Issue:
- Deleting the stale `build/` output also removed the packaged macOS app bundle.

Fix:
- Patched `macos/build-macos-app.sh` to add `setopt null_glob` so the script can rebuild cleanly from an empty `build/` directory without failing on `"$WWW_DIR"/*` when no files exist yet.
- Re-ran the macOS packaging script successfully.

Result:
- Restored app bundle at `build/Archive Survival.app`

## 2026-03-12 11:08 - Scroll Performance Pass

User reported heavy lag when scrolling.

Likely causes removed from `styles.css`:
- Removed `fixed` attachment from the large body background layers.
- Removed large-surface `backdrop-filter` usage from the top bar and panel shells.
- Reduced or removed several expensive blend/filter layers:
  - archive shell overlays
  - hero overlay intensity
  - cathedral light rays blur/blend
  - living-web header overlay intensity
  - rose window drop shadow
  - incense blur
  - active web line glow
  - silk trail glow
  - spider multi-drop-shadow stack
- Added a `prefers-reduced-motion` clamp for users/system settings that request lower motion.

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- `zsh macos/build-macos-app.sh` passed and regenerated the macOS app bundle.

## 2026-03-12 11:12 - Eye Lid Texture Pass

User reported that some blinking eyes were closing into a flat black band.

Change made in `styles.css`:
- Replaced the flat dark eyelid fill with a mottled green lid treatment using layered green gradients plus `cathedral-eye-mosaic.svg`.
- Added subtle inset texture/shaping so closed eyes read like flesh/lid material rather than a black stripe.

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- `zsh macos/build-macos-app.sh` passed and regenerated the macOS app bundle.

## 2026-03-12 11:16 - Eye Blink Geometry Fix

User provided screenshot showing the blink half-state collapsing into a horizontal band across the iris.

Fix made in `styles.css`:
- Reworked eyelid animation from center-scaled closure to top-and-bottom closure using `clip-path` animation.
- Updated all blink profiles (`linger`, `double`, `twitch`, `doze`) so intermediate states narrow from the edges instead of pinching through the middle.

Result:
- Half-closed eyes should now read like eyelids descending and rising, not a black or green band slicing through the eye.

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- `zsh macos/build-macos-app.sh` passed and regenerated the macOS app bundle.

## 2026-03-12 11:19 - Eye Band Visual Diagnosis

User provided a full-window screenshot showing the remaining eye issue.

Confirmed issue:
- The problematic half-close state is not just a texture issue.
- The eyelid is still reading as a narrow horizontal strip suspended across the middle of the eye capsule, instead of a top lid and bottom lid meeting.
- In practice, the current eye markup only has one lid element, so even with improved clipping it still cannot fully sell a real upper-and-lower blink shape.

Likely next correction:
- Split the eyelid into separate upper and lower lid elements and animate them independently so partial closes look anatomical instead of like a band overlay.

## 2026-03-12 11:28 - Pause State / Polish Pass Handoff

User asked to pause the active polish pass and resume later.

What I was doing:
- Built a native WebKit capture script at `.codex-debug/capture-flow.swift` to run an automated playthrough and capture actual rendered screens.
- The `file://` load path rendered blank in the harness, so I switched the capture flow to use `vite preview` over `http://127.0.0.1:4173/`.
- Successfully captured these screens from a real playthrough:
  - `01-menu`
  - `02-case-intro`
  - `03-web-game`
  - `04-web-selected`
  - `05-wheel`
  - `06-wheel-spin`
- `07-wheel-result` failed because the window/image capture step missed that final state.

Visual/runtime issues confirmed from my own pass:
- JS-driven asset paths are broken in preview/build:
  - menu hero image broken
  - case intro image broken
  - wheel image broken
  - likely also affects music pathing in browser/web build
- Eye band is still structurally wrong:
  - partial blinks still read like a band across the eye rather than upper/lower lids meeting
- Layout density is poor in normal window height:
  - menu CTA is pushed below the fold
  - giant decorative/empty panel areas waste vertical space
  - control panel is noisy and overexplains on every screen
- Web play screen still feels cramped vertically.

Code changes already started for the next pass:
- Added `src/assets.js` to centralize bundler-safe image/music/fear-cue URLs for JS code.
- This asset refactor is not yet wired through `src/run-data.js`, `src/templates.js`, `src/run-game.js`, and `src/sound.js`.

Planned next steps when resuming:
1. Finish the asset URL refactor so preview/build/app all render the same images and music.
2. Replace the single eye-lid structure with separate upper/lower lids and rework the blink animation.
3. Compress the menu/Web layouts so they fit a normal window height without feeling padded-out or scroll-heavy.
4. After polish is stable, rewrite all instructional/game text in a more deliberate, non-generic voice as requested by the user.

## 2026-03-12 13:26 - Music Swap Locked In / Copy Pass Finished

Gameplay/audio state:
- The procedural background bed is no longer the primary soundtrack path in `src/sound.js`.
- Menu, Web, distorted Web/domain, and wheel screens now map to file-backed licensed tracks from `assets/audio/music/`.
- The scene switch remains:
  - menu -> `Mandatory Overtime`
  - Web mundane -> `Void Estate`
  - Web distorted/domain -> `Night of the Streets`
  - wheel -> `The 9th Circle`
- WebAudio is now only used for interaction SFX and short cues.

Copy/text pass completed:
- Rewrote the remaining visible UI copy in `src/templates.js` and `src/run-game.js` to be shorter and more direct.
- Updated:
  - menu section labels and difficulty copy
  - case intro instructions/button copy
  - reward wheel labels/helper text
  - result / eyepocalypse / game-over screens
  - Web screen helper text, controls wording, status labels, clue/ledger labels
  - sidebar labels (`Run Log`, `Run Time`, `Eye Pressure`)

## 2026-03-12 13:29 - Dead Reward Removed

Cleanup:
- Removed `Leitner Fragment` from `src/run-data.js`.
- Removed the unused `nextWheelChoice` modifier stub from `src/run-game.js`.
- Future runs can no longer receive a no-effect wheel reward.

## 2026-03-12 13:32 - Automated Capture Tool Fix And Verification

Debug tool repair:
- `.codex-debug/capture-flow.swift` no longer depends on `/usr/sbin/screencapture`.
- It now snapshots the `WKWebView` directly, which avoids macOS screen-capture permission failures and makes automated verification reliable again.

Verification run:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- `zsh macos/build-macos-app.sh` passed and rebuilt `build/Archive Survival.app`.
- Automated preview capture completed successfully against `vite preview` at `http://127.0.0.1:4174/`.
- Current capture set:
  - `.codex-debug/flow-captures-http-6/01-menu.png`
  - `.codex-debug/flow-captures-http-6/02-case-intro.png`
  - `.codex-debug/flow-captures-http-6/03-web-game.png`
  - `.codex-debug/flow-captures-http-6/04-web-selected.png`
- `.codex-debug/flow-captures-http-6/05-wheel.png`
- `.codex-debug/flow-captures-http-6/06-wheel-spin.png`
- `.codex-debug/flow-captures-http-6/07-wheel-result.png`

## 2026-03-12 15:04 - Full Polish Pass / Screen Flow Overhaul

Major UI flow changes:
- Menu is now a compact landing screen instead of a padded three-column scroll.
- Added a prominent `Start Run` button plus a `?` help button on the menu.
- Added a reusable help modal with short bullet explanations for:
  - goal
  - stability
  - controls
  - fragment ordering
  - wheel mechanics
  - run progression
  - spider cursor behaviour
  - eye band / stability meter
- Non-gameplay screens (`case-intro`, `item-wheel`, `result`, `eyepocalypse`, `game-over`) now hide the sidebars and center the main stage.
- The Web screen now behaves as a cleaner top / center / bottom layout:
  - top: case title + vitals
  - center: investigation field
  - bottom: selected read, controls, clue / failed read ledger

Interaction / feedback changes:
- Strengthened Web tablet hover, glow, ripple, and selected-order visibility.
- Active thread links now animate while a read is being built.
- Success/failure transitions are delayed slightly so field VFX and audio can actually land before the screen changes.
- Result cards now have distinct success / failure overlays.
- Wheel tick cadence now accelerates through the spin instead of firing at one flat interval.

Spider cursor overhaul:
- Downloaded and integrated `Spider 3` from OpenGameArt.
- Source recorded in `assets/stock/SOURCES.md`.
- License confirmed from the OpenGameArt page as `CC0`.
- Extracted idle and walk frames into `assets/images/spider/`.
- Added sprite-backed spider cursor playback:
  - crawls toward pointer / hovered fragments
  - rotates into direction of travel
  - pauses briefly over selectable fragments
  - twitches on rejected / wrong Web reads

Asset refactor status:
- `src/assets.js` now also exports `SPIDER_FRAME_URLS`, so the spider frames are bundled and survive preview / browser / macOS packaging paths.
- Preview build and macOS package both include the image/audio assets correctly after this pass.

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- `zsh macos/build-macos-app.sh` passed and rebuilt `build/Archive Survival.app`.

## 2026-03-12 16:06 - Loading Screen Contrast Pass

Issue:
- The startup boot screen was technically present, but in the packaged app it still read like a nearly blank dark frame because the panel contrast was too close to the archive-wall background and the loader could disappear too quickly.

Fix:
- Updated `src/main.js` so the boot screen now stays up for a short minimum duration before fading out, instead of vanishing as soon as the first render callback lands.
- Brightened the boot screen backdrop in `styles.css` with a softer green overhead glow and less crushing black overlay.
- Increased `boot-shell` contrast with a lighter panel gradient, stronger border definition, and a clearer inner frame.
- Brightened and enlarged the load meter so the loader reads immediately against the background.

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- `zsh macos/build-macos-app.sh` passed and rebuilt `build/Archive Survival.app`.

## 2026-03-12 15:42 - Visual-First UI Pass

Goal of this pass:
- Reduce dependence on explanation text and move more of the Web experience into visual HUD, motion, and sound feedback.

Implemented:
- Replaced the text-heavy top HUD with an icon-first strip in `src/templates.js`.
  - cleared -> `🕸`
  - log count -> `📜`
  - strikes -> `✕`
  - inventory count -> `🗝`
  - best run -> `★`
  - run time -> `⏱`
  - music/help buttons -> icon buttons
- Removed sidebar panels from the active rendered shell and pushed the run toward a cleaner overlay presentation.
- Reduced case intro copy density by replacing the explanatory rules card with compact cue chips for:
  - stability
  - clues
  - chain length
- Reduced wheel copy density to a shorter, more visual reward stage.

Web presentation changes:
- The selected read is now shown as a visual chain, not just a text list:
  - chips connected by animated links
  - empty chain slots when nothing is selected
- Added `hinted` next-fragment pulsing when the current read matches the correct prefix, so the game teaches the sequence language more visually.
- Converted the Web footer into lighter floating overlays:
  - eye icon + stability meter
  - shorter status line
  - compact `Seal` / `Clue` actions
  - previous failed reads shown as chained attempts instead of long ledger copy

Visual stability system:
- Added explicit `stable`, `unstable`, and `critical` screen states in the rendered shell.
- These now drive:
  - thread shiver / vibration
  - stronger vignette / field flicker at critical pressure
  - fragment flicker at critical pressure
  - faster eye blink timing at critical pressure
  - spider movement drag / hesitation as pressure rises

Audio / feedback changes:
- Added a thread-snap SFX for rejected / wrong reads in `src/sound.js`.
- Added a low critical rumble cue when the case drops into the critical state.
- Correct reads still use the existing brighter confirmation cue and bloom.

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- `zsh macos/build-macos-app.sh` passed and rebuilt `build/Archive Survival.app`.
- Automated preview capture completed successfully for this pass.
- Current capture set:
  - `.codex-debug/flow-captures-http-8/01-menu.png`
  - `.codex-debug/flow-captures-http-8/02-case-intro.png`
  - `.codex-debug/flow-captures-http-8/03-web-game.png`
  - `.codex-debug/flow-captures-http-8/04-web-selected.png`
  - `.codex-debug/flow-captures-http-8/05-wheel.png`
  - `.codex-debug/flow-captures-http-8/06-wheel-spin.png`
  - `.codex-debug/flow-captures-http-8/07-wheel-result.png`

Remaining follow-up:
- If the user wants to push the text reduction further, the next step is replacing more button copy (`Seal`, `Clue`, reward-stage labels) with icon-only controls plus hover tooltips.
- Eye animation may still want one more final art pass if live testing shows any remaining unnatural half-blink states.
- Automated preview capture completed successfully against the polished build.
- Current capture set:
  - `.codex-debug/flow-captures-http-7/01-menu.png`
  - `.codex-debug/flow-captures-http-7/02-case-intro.png`
  - `.codex-debug/flow-captures-http-7/03-web-game.png`
  - `.codex-debug/flow-captures-http-7/04-web-selected.png`
  - `.codex-debug/flow-captures-http-7/05-wheel.png`
  - `.codex-debug/flow-captures-http-7/06-wheel-spin.png`
  - `.codex-debug/flow-captures-http-7/07-wheel-result.png`

Remaining follow-up:
- Eye blink structure still needs one more visual pass if the upper/lower lid motion still reads unnaturally in live play.
- Asset refactor for JS-driven media is now effectively complete for shipped runtime paths; the remaining direct asset references are CSS-side decorative backgrounds, which already bundle correctly.

## 2026-03-12 15:18 - Startup Loading Screen Fix

Issue:
- The app could open to a blank screen during initial boot because `index.html` still mounted into an empty `#app` while JS and assets initialized.

Fix:
- Added a branded boot screen directly in `index.html`.
- Added boot-state styles and a moving load meter in `styles.css`.
- Updated `src/main.js` so the boot screen:
  - stays visible until the game mounts
  - fades out after first render
  - shows an explicit failure message instead of a blank page if startup throws

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- `zsh macos/build-macos-app.sh` passed and rebuilt `build/Archive Survival.app`.

## 2026-03-12 18:09 - Boot Hang Fix And Packaging Parity

Issue:
- In later verification, the app could remain on the loading screen even though the game mounted.
- The automated WebKit playthrough stalled at startup, matching the user report that the app stayed on the loader.
- The macOS app packager was also generating its own separate `index.html`, which risked boot-path drift between browser and packaged app.

Fix:
- Updated `src/main.js` so boot teardown no longer depends on a single `requestAnimationFrame` callback after mount.
- Boot release now:
  - checks whether `#app` has rendered content
  - retries on short timers
  - still uses animation frames when available
  - hard-falls back after a maximum timeout so the loader cannot deadlock
  - throws a clearer startup error if the mount root is missing
- Updated `macos/build-macos-app.sh` so the packaged app ships the same boot-screen markup as the browser/web entrypoint instead of a stripped alternate HTML shell.

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- Automated preview/WebKit playthrough completed successfully after the boot fix.
- Capture set written to `.codex-debug/flow-captures-live-2/`:
  - `01-menu.png`
  - `02-case-intro.png`
  - `03-web-game.png`
  - `04-web-selected.png`
  - `05-wheel.png`
  - `06-wheel-spin.png`
  - `07-wheel-result.png`
- `zsh macos/build-macos-app.sh` passed and rebuilt `build/Archive Survival.app`.

## 2026-03-12 18:22 - Eye Cleanup / Performance Trim / Tutorial And Jumpscares

Goal of this pass:
- Fix the remaining eye-read issues.
- Trim avoidable runtime overhead in the Web scene.
- Turn onboarding into a more useful in-run tutorial.
- Add controlled Web-themed jumpscares without making the game noisy or unreadable.

Implemented:
- Eye pass in `styles.css`:
  - reduced the heaviest glow/filter usage in the eye band
  - adjusted lid height and resting offsets so upper/lower lids read more like closing surfaces and less like a center band
  - softened iris drift and blink travel so partial closes look less harsh
- Performance trim in `src/run-game.js` and `styles.css`:
  - throttled spider trail updates and shortened stored trail history
  - stopped reassigning the spider sprite image every frame when the frame has not changed
  - reduced critical-state jitter intensity
  - replaced whole-field critical filter flicker with a lighter pulse treatment
  - slowed thread-shiver cadence
  - removed stale pre-sprite spider CSS and unused related keyframes
  - added layout/paint containment to the main Web stage/footer containers
- Tutorial/onboarding:
  - added a contextual first-run tutorial panel during the Web minigame
  - tutorial copy changes as the player starts selecting fragments and building a full read
  - tutorial can be dismissed manually and auto-completes once the player meaningfully interacts with the read/submit flow
- Clue interaction fix:
  - clue can now always be closed again, even after the last clue charge has been spent
- Jumpscare layer:
  - added a dedicated jumpscare overlay in `src/templates.js`
  - added cooldown-gated jumpscare triggers in `src/run-game.js`
  - added short jumpscare stings in `src/sound.js`
  - current triggers:
    - entering critical pressure
    - severe bad reads / low-stability wrong reads
    - full case collapse
  - jumpscares respect `prefers-reduced-motion`

Verification:
- `zsh scripts/use-local-toolchain.sh pnpm build` passed.
- Automated preview/WebKit playthrough completed successfully after the pass.
- Capture set written to `.codex-debug/flow-captures-live-3/`:
  - `01-menu.png`
  - `02-case-intro.png`
  - `03-web-game.png`
  - `04-web-selected.png`
  - `05-wheel.png`
  - `06-wheel-spin.png`
  - `07-wheel-result.png`
- `zsh macos/build-macos-app.sh` passed and rebuilt `build/Archive Survival.app`.

Current state after this pass:
- Boot path is now verified in both preview and packaged app builds.
- The eye band is materially improved, though it may still deserve one more art-directed pass if live testing shows any remaining uncanny half-close states.
- The Web scene should be cheaper to run under pressure than the prior critical-effects pass.
- Tutorial/onboarding is no longer just the help modal; first-time play now has an in-context guide.
- Jumpscares are present, but intentionally restrained and attached to real gameplay states rather than random timers.
