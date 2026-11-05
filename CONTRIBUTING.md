# Contributing

Thanks for taking the time. Bug reports, feature ideas and pull requests are all welcome.

## Reporting a bug

Please include:

- Your Obsidian version, operating system, and the plugin version.
- Whether it happens in Reading view, in the editor, or both.
- A **minimal note** that reproduces it, as raw Markdown rather than a screenshot. Folding bugs
  usually come down to a specific structure (a skipped heading level, a list inside a callout, an
  embedded note), so the source text is the useful part.
- Which fold arrow you clicked, what you expected, and what happened instead.

Also worth checking first: whether the problem still occurs with other plugins disabled. Other
plugins that change folding or handle clicks in the editor can interfere.

## Development setup

Requires [Node.js](https://nodejs.org) 18 or newer.

```sh
git clone https://github.com/rogerfan48/recursive-fold.git
cd recursive-fold
npm install
```

The easiest way to test is to work directly inside a real vault. Clone into (or symlink the repo to)
`<test vault>/.obsidian/plugins/recursive-fold/`, then:

```sh
npm run dev     # rebuild main.js on every change
```

Reload Obsidian (`Ctrl`/`Cmd` + `R`) to pick up a rebuild. The
[Hot Reload](https://github.com/pjeby/hot-reload) plugin does this automatically.

### Available scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Watch and rebuild `main.js`. |
| `npm run build` | Type-check and produce a production `main.js`. |
| `npm run lint` | Run ESLint over the TypeScript sources and build scripts. |

Run `npm run build` and `npm run lint` before opening a pull request.

## Project layout

| Path | Purpose |
| --- | --- |
| `main.ts` | Plugin entry point: click handling, the command, and the settings tab. |
| `src/settings.ts` | Settings interface and defaults. |
| `src/folds.ts` | Reads and writes Obsidian's per-note fold state, and toggles a subtree. |
| `src/reading-view.ts` | Maps a Reading view fold arrow to its source line, and builds the outline from the metadata cache. |
| `src/editing-view.ts` | Maps an editor fold arrow to its line, and asks CodeMirror for the fold ranges inside it. |

## Style notes

Follow the [Obsidian plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines).
In particular: sentence case for anything shown in the UI, no plugin name as a settings heading,
and prefer `activeDocument` over `document` when reaching for a global.

Indentation is two spaces, and tabs in JSON files, matching `.editorconfig`.

## Releasing

Maintainers only:

```sh
npm version patch   # or minor / major
git push --follow-tags
```

`npm version` runs `version-bump.mjs`, which syncs `manifest.json` and adds an entry to
`versions.json`. Pushing the tag triggers `.github/workflows/release.yml`, which builds the plugin,
attaches `main.js` and `manifest.json` to a draft GitHub release with notes taken from
`CHANGELOG.md`, and attaches a build provenance attestation to each file.

Review the draft and publish it. Obsidian's plugin directory surfaces release notes to users.
