import {
  App,
  Keymap,
  MarkdownView,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  SettingDefinitionItem,
  TFile,
  View,
} from "obsidian";

import * as editing from "./src/editing-view";
import { FoldState, foldStateOf, innermostAt, LineRange, toggleSubtree } from "./src/folds";
import { PANE_ARROWS, planPaneToggle } from "./src/panes";
import * as reading from "./src/reading-view";
import { ClickModifier, DEFAULT_SETTINGS, RecursiveFoldSettings } from "./src/settings";

const NOTE_ARROWS = ".heading-collapse-indicator, li > .list-collapse-indicator, .cm-fold-indicator";

type Toggle = () => void;

export default class RecursiveFoldPlugin extends Plugin {
  declare settings: RecursiveFoldSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new RecursiveFoldSettingTab(this.app, this));

    this.registerMarkdownPostProcessor((el, ctx) => reading.rememberSection(el, ctx));

    // Not activeDocument: enabling the plugin from the settings window would
    // otherwise listen on that window instead of the workspace.
    const docs = new Set([this.app.workspace.containerEl.doc]);
    this.app.workspace.iterateAllLeaves((leaf) => docs.add(leaf.view.containerEl.doc));
    for (const doc of docs) this.listenForClicks(doc);
    this.registerEvent(this.app.workspace.on("window-open", (win) => this.listenForClicks(win.doc)));

    this.addCommand({
      id: "toggle-fold-recursively",
      name: "Toggle fold recursively",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        const toggle = view && this.planNoteToggle(view);
        if (!toggle) return false;
        if (!checking) toggle();
        return true;
      },
    });
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<RecursiveFoldSettings>);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private listenForClicks(doc: Document) {
    this.registerDomEvent(doc, "click", this.onClick, { capture: true });
  }

  // Runs in the capture phase so it gets the click before Obsidian's own
  // single-level toggle. Anything it cannot plan is left to Obsidian.
  private onClick = (evt: MouseEvent) => {
    const { modifier } = this.settings;
    if (modifier === "off" || evt.button !== 0 || !Keymap.isModifier(evt, modifier)) return;
    if (!evt.targetNode?.instanceOf(Element)) return;
    const arrow = evt.targetNode.closest<HTMLElement>(`${NOTE_ARROWS}, ${PANE_ARROWS}`);
    const view = arrow && this.viewContaining(arrow);
    if (!arrow || !view) return;

    const toggle = view instanceof MarkdownView ? this.planNoteToggle(view, arrow) : planPaneToggle(view, arrow);
    if (!toggle) return;
    evt.preventDefault();
    evt.stopPropagation();
    toggle();
  };

  private viewContaining(el: HTMLElement): View | null {
    let found: View | null = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!found && leaf.view.containerEl.contains(el)) found = leaf.view;
    });
    return found;
  }

  private planNoteToggle(view: MarkdownView, arrow?: HTMLElement): Toggle | null {
    const state = foldStateOf(view);
    if (!state || !view.file || (arrow && !arrow.matches(NOTE_ARROWS))) return null;
    const subtree = arrow
      ? this.subtreeAtArrow(view, view.file, state, arrow)
      : this.subtreeAtFocus(view, view.file, state);
    return subtree.length > 0 ? () => toggleSubtree(state, subtree) : null;
  }

  private subtreeAtArrow(view: MarkdownView, file: TFile, state: FoldState, arrow: HTMLElement): LineRange[] {
    if (arrow.hasClass("cm-fold-indicator")) {
      const cm = view.getMode() === "source" ? editing.editorOf(view) : undefined;
      return cm ? editing.subtreeAt(cm.state, editing.lineOfIndicator(cm, arrow)) : [];
    }
    if (view.getMode() !== "preview") return [];
    const line = reading.lineOfIndicator(arrow, file.path);
    return line === null ? [] : reading.subtreeAt(this.outlineRanges(file, state), line);
  }

  private subtreeAtFocus(view: MarkdownView, file: TFile, state: FoldState): LineRange[] {
    if (view.getMode() === "source") {
      const cm = editing.editorOf(view);
      return cm ? editing.innermostSubtree(cm.state, view.editor.getCursor().line) : [];
    }
    const ranges = this.outlineRanges(file, state);
    const target = innermostAt(ranges, Math.floor(view.previewMode.getScroll()));
    return target ? reading.subtreeAt(ranges, target.from) : [];
  }

  private outlineRanges(file: TFile, state: FoldState): LineRange[] {
    return reading.outlineRanges(this.app.metadataCache.getFileCache(file), state.mode.getFoldInfo().lines);
  }
}

class RecursiveFoldSettingTab extends PluginSettingTab {
  plugin: RecursiveFoldPlugin;

  constructor(app: App, plugin: RecursiveFoldPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private readonly modifierSetting = {
    name: "Modifier key",
    desc: "Hold it while clicking a fold arrow to fold or unfold everything nested under it.",
    options: {
      Mod: Platform.isMacOS ? "Cmd-click" : "Ctrl-click",
      Alt: Platform.isMacOS ? "Option-click" : "Alt-click",
      Shift: "Shift-click",
      off: "Off",
    } satisfies Record<ClickModifier, string>,
  };

  getSettingDefinitions(): SettingDefinitionItem[] {
    const { name, desc, options } = this.modifierSetting;
    return [{ name, desc, control: { type: "dropdown", key: "modifier", options } }];
  }

  getControlValue(key: string): unknown {
    return this.plugin.settings[key as keyof RecursiveFoldSettings];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    this.plugin.settings[key as keyof RecursiveFoldSettings] = value as ClickModifier;
    await this.plugin.saveSettings();
  }

  // Obsidian before 1.13 has no declarative settings; this draws the same row.
  display(): void {
    const { containerEl } = this;
    const { name, desc, options } = this.modifierSetting;
    containerEl.empty();
    new Setting(containerEl)
      .setName(name)
      .setDesc(desc)
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(options)
          .setValue(this.plugin.settings.modifier)
          .onChange((value) => this.setControlValue("modifier", value)),
      );
  }
}
