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

export interface FoldState {
  mode: FoldableMode;
  save(): void;
}

// Null when Obsidian no longer has these methods, so callers fall back
// to its own behavior instead of failing mid-click.
export function foldStateOf(view: MarkdownView): FoldState | null {
  const mode = view.currentMode as unknown as Partial<FoldableMode>;
  const { onMarkdownFold } = view as unknown as { onMarkdownFold?: (this: MarkdownView) => void };
  if (typeof mode.getFoldInfo !== "function" || typeof mode.applyFoldInfo !== "function") return null;
  if (typeof onMarkdownFold !== "function") return null;
  return {
    mode: mode as FoldableMode,
    save: () => {
      onMarkdownFold.call(view);
    },
  };
}

// subtree[0] is the toggled range; the rest lie inside it.
export function toggleSubtree(state: FoldState, subtree: LineRange[]) {
  const [target] = subtree;
  const { mode } = state;
  const info = mode.getFoldInfo();
  const inside = (range: LineRange) => range.from >= target.from && range.from <= target.to;
  const wasFolded = info.folds.some((fold) => fold.from === target.from);
  const folds = info.folds.filter((fold) => !inside(fold));
  if (!wasFolded) folds.push(...subtree);
  mode.applyFoldInfo({ folds, lines: info.lines });
  state.save();
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
