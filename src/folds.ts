import { MarkdownView } from "obsidian";

// Zero-based, inclusive source lines, the format Obsidian stores folds in.
export interface LineRange {
  from: number;
  to: number;
}

interface FoldInfo {
  folds: LineRange[];
  lines: number;
}

// Undocumented: Obsidian uses these same methods to carry folds between
// reading and editing view and to persist them per note.
interface FoldableMode {
  getFoldInfo(): FoldInfo;
  applyFoldInfo(info: FoldInfo): void;
}

export function foldInfoOf(view: MarkdownView): FoldInfo {
  return (view.currentMode as unknown as FoldableMode).getFoldInfo();
}

// subtree[0] is the toggled range; the rest lie inside it.
export function toggleSubtree(view: MarkdownView, subtree: LineRange[]) {
  const [target] = subtree;
  const mode = view.currentMode as unknown as FoldableMode;
  const info = mode.getFoldInfo();
  const inside = (range: LineRange) => range.from >= target.from && range.from <= target.to;
  const wasFolded = info.folds.some((fold) => fold.from === target.from);
  const folds = info.folds.filter((fold) => !inside(fold));
  if (!wasFolded) folds.push(...subtree);
  mode.applyFoldInfo({ folds, lines: info.lines });
  (view as unknown as { onMarkdownFold(): void }).onMarkdownFold();
}

export function innermostAt(ranges: LineRange[], line: number): LineRange | undefined {
  let innermost: LineRange | undefined;
  for (const range of ranges) {
    if (range.from <= line && line <= range.to && (!innermost || range.from > innermost.from)) {
      innermost = range;
    }
  }
  return innermost;
}
