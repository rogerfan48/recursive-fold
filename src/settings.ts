import { Modifier } from "obsidian";

export type ClickModifier = Extract<Modifier, "Mod" | "Alt" | "Shift"> | "off";

export interface RecursiveFoldSettings {
  modifier: ClickModifier;
}

export const DEFAULT_SETTINGS: RecursiveFoldSettings = {
  modifier: "Mod",
};
