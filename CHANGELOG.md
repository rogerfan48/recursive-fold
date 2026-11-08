# Changelog

This project follows [Semantic Versioning](https://semver.org/).

## 1.1.0

### Added

- Modifier-click also works on fold arrows in the File explorer, Bookmarks, Tags and Outline panes.

### Fixed

- If a future Obsidian update changes what the plugin relies on, modifier-clicks now fall back to
  the default single-level toggle instead of doing nothing.

## 1.0.0

Initial release.

- Modifier-click a fold arrow to fold or unfold a heading or list item together with everything
  nested under it, in Reading view, Live Preview and Source mode.
- *Modifier key* setting: `Cmd`/`Ctrl` (default), `Option`/`Alt`, `Shift`, or off.
- *Toggle fold recursively* command, for use with a hotkey.
