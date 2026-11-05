# Recursive Fold

An [Obsidian](https://obsidian.md) plugin that folds or unfolds a heading or list item together with
everything nested under it, in one click.

## Usage

Hold `Cmd` (macOS) or `Ctrl` (Windows, Linux) and click a fold arrow:

- **Folded item:** it and everything inside unfold.
- **Unfolded item:** it and everything inside fold.

Works for headings and lists in Reading view, Live Preview and Source mode. A plain click still
toggles a single level.

For the keyboard, assign a hotkey to **Toggle fold recursively**. It acts on the section at the
cursor, or at the top of the page in Reading view.

## Settings

**Modifier key:** `Cmd`/`Ctrl` (default), `Option`/`Alt`, `Shift`, or off.

## Installation

### From Obsidian (recommended)

**Settings → Community plugins → Browse**, search for *Recursive Fold*, then install and enable it.
Or open [the plugin page](https://obsidian.md/plugins?id=recursive-fold) and click
**Add to Obsidian**.

### Manually

Download `main.js` and `manifest.json` from the
[latest release](https://github.com/rogerfan48/recursive-fold/releases/latest) and place them in
`<your vault>/.obsidian/plugins/recursive-fold/`, then reload Obsidian and enable the plugin.

## Notes

- Embedded notes, hover previews and Canvas cards keep the default single-level behavior.
- Mobile devices have no modifier keys; use the command instead.
- The plugin relies on parts of Obsidian outside its public API, so a future Obsidian update may
  break modifier-clicks until the plugin catches up.

## Related

Also by me: [Better Heading Hierarchy](https://github.com/rogerfan48/better-heading-hierarchy),
which draws guide lines that make the nesting of headings visible at a glance.

## Contributing

Bug reports and pull requests are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © rogerfan48
