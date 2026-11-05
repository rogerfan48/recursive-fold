import { foldable } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { MarkdownView } from "obsidian";

import { LineRange } from "./folds";

export function editorOf(view: MarkdownView): EditorView | undefined {
  return (view.editor as { cm?: EditorView }).cm;
}

export function lineOfIndicator(cm: EditorView, indicator: HTMLElement): number {
  return cm.state.doc.lineAt(cm.posAtDOM(indicator)).number - 1;
}

function foldableAt(state: EditorState, line: number): LineRange | null {
  const { doc } = state;
  const { from, to } = doc.line(line + 1);
  const range = foldable(state, from, to);
  return range && { from: line, to: doc.lineAt(range.to).number - 1 };
}

// Asks CodeMirror rather than the metadata cache, which lags behind typing.
export function subtreeAt(state: EditorState, line: number): LineRange[] {
  const target = foldableAt(state, line);
  if (!target) return [];
  const subtree = [target];
  for (let n = line + 1; n <= target.to; n++) {
    const nested = foldableAt(state, n);
    if (nested) subtree.push(nested);
  }
  return subtree;
}

export function innermostSubtree(state: EditorState, line: number): LineRange[] {
  for (let n = line; n >= 0; n--) {
    const range = foldableAt(state, n);
    if (range && range.to >= line) return subtreeAt(state, n);
  }
  return [];
}
