The long-term premise is a run through archive statements where each fear domain can introduce its own rules, pacing, and interaction style.

Current playable state:

- `The Web` is the active, implemented case type in the shipped runtime.
- Other fear domains are future expansion targets, not active gameplay in the current build.

## Run

From the project root:

```bash
zsh scripts/use-local-toolchain.sh pnpm install
zsh scripts/use-local-toolchain.sh pnpm dev
```

Then open:

`http://localhost:5173`

The repo includes local copies of `node`, `pnpm`, and `git-lfs` under [`.local`](/Users/masoncaffrey/Library/Mobile%20Documents/com~apple~CloudDocs/Codex/.local), so you do not need a separate Homebrew setup for project work.

## Toolchain

From the project root:

```bash
zsh scripts/use-local-toolchain.sh node --version
zsh scripts/use-local-toolchain.sh pnpm --version
zsh scripts/use-local-toolchain.sh git-lfs version
```

## macOS app

This repo can also be packaged as a native double-clickable macOS app.

From the project root:

```bash
zsh scripts/use-local-toolchain.sh pnpm macos:build
```

That creates:

`build/Archive Survival.app`

After that, open the app from Finder like any other desktop app.

## Controls

- `Mouse`: primary interaction in the current Web build
- `Arrow keys` / `WASD`: move focus where supported
- `Space`: interact where supported
- `Enter`: confirm / advance / validate
- `Shift`: reveal a clue where supported
- `M`: toggle music

## Difficulty

Menu options:

- `Easy`: more forgiving timer and case tuning
- `Normal`: default run
- `Hard`: shorter timer and tighter case tuning

## Prototype scope

- current shipped runtime is Web-first / Web-only in active play
- multi-fear run structure is the intended long-term design
- 3-strike run structure
- item wheel after successful cases
- save current run in `localStorage`
- save best run in `localStorage`
- reset saved run from the menu

## Notes

- Audio starts after the first interaction because the browser requires it.
- The current build uses bundled music tracks plus Web Audio for short SFX.
