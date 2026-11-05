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
} from "obsidian";

import * as editing from "./src/editing-view";
import { foldInfoOf, innermostAt, LineRange, toggleSubtree } from "./src/folds";
import * as reading from "./src/reading-view";
import { ClickModifier, DEFAULT_SETTINGS, RecursiveFoldSettings } from "./src/settings";

const FOLD_ARROWS = ".heading-collapse-indicator, li > .list-collapse-indicator, .cm-fold-indicator";

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
        const subtree = view?.file ? this.subtreeAtFocus(view, view.file) : [];
        if (!view || subtree.length === 0) return false;
        if (!checking) toggleSubtree(view, subtree);
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
  // single-level toggle, which bails on an event that is already handled.
  private onClick = (evt: MouseEvent) => {
    const { modifier } = this.settings;
    if (modifier === "off" || evt.button !== 0 || !Keymap.isModifier(evt, modifier)) return;
    if (!evt.targetNode?.instanceOf(Element)) return;
    const arrow = evt.targetNode.closest<HTMLElement>(FOLD_ARROWS);
    const view = arrow && this.viewContaining(arrow);
    if (!arrow || !view?.file) return;

    const subtree = this.subtreeAtArrow(view, view.file, arrow);
    if (subtree.length === 0) return;
    evt.preventDefault();
    evt.stopPropagation();
    toggleSubtree(view, subtree);
  };

  private viewContaining(el: HTMLElement): MarkdownView | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.containerEl.contains(el)) return leaf.view;
    }
    return null;
  }

  private subtreeAtArrow(view: MarkdownView, file: TFile, arrow: HTMLElement): LineRange[] {
    if (arrow.hasClass("cm-fold-indicator")) {
      const cm = view.getMode() === "source" ? editing.editorOf(view) : undefined;
      return cm ? editing.subtreeAt(cm.state, editing.lineOfIndicator(cm, arrow)) : [];
    }
    if (view.getMode() !== "preview") return [];
    const line = reading.lineOfIndicator(arrow, file.path);
    return line === null ? [] : reading.subtreeAt(this.outlineRanges(view, file), line);
  }

  private subtreeAtFocus(view: MarkdownView, file: TFile): LineRange[] {
    if (view.getMode() === "source") {
      const cm = editing.editorOf(view);
      return cm ? editing.innermostSubtree(cm.state, view.editor.getCursor().line) : [];
    }
    const ranges = this.outlineRanges(view, file);
    const target = innermostAt(ranges, Math.floor(view.previewMode.getScroll()));
    return target ? reading.subtreeAt(ranges, target.from) : [];
  }

  private outlineRanges(view: MarkdownView, file: TFile): LineRange[] {
    return reading.outlineRanges(this.app.metadataCache.getFileCache(file), foldInfoOf(view).lines);
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
    desc: "Hold it while clicking a fold arrow to fold or unfold everything nested under that heading or list item.",
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
