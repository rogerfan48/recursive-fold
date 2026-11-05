import { CachedMetadata, MarkdownPostProcessorContext } from "obsidian";

import { LineRange } from "./folds";

const sectionContexts = new WeakMap<HTMLElement, MarkdownPostProcessorContext>();

export function rememberSection(el: HTMLElement, ctx: MarkdownPostProcessorContext) {
  sectionContexts.set(el, ctx);
}

export function lineOfIndicator(indicator: HTMLElement, path: string): number | null {
  // The innermost section wins, so an arrow inside an embedded note never
  // resolves against the host note's lines.
  let sectionEl: HTMLElement | null = indicator;
  while (sectionEl && !sectionContexts.has(sectionEl)) sectionEl = sectionEl.parentElement;
  const ctx = sectionEl && sectionContexts.get(sectionEl);
  if (!sectionEl || !ctx || ctx.sourcePath !== path) return null;

  const section = ctx.getSectionInfo(sectionEl);
  if (!section) return null;
  if (indicator.hasClass("heading-collapse-indicator")) return section.lineStart;
  const offset = parseInt(indicator.parentElement?.getAttribute("data-line") ?? "");
  return isNaN(offset) ? null : section.lineStart + offset;
}

export function outlineRanges(cache: CachedMetadata | null, lineCount: number): LineRange[] {
  const ranges: LineRange[] = [];

  const headings = cache?.headings ?? [];
  headings.forEach((heading, i) => {
    const next = headings.slice(i + 1).find((other) => other.level <= heading.level);
    const from = heading.position.start.line;
    const to = next ? next.position.start.line - 1 : lineCount - 1;
    if (to > from) ranges.push({ from, to });
  });

  // Children come after their parent, so one backward pass carries every
  // descendant's last line up to its ancestors.
  const items = cache?.listItems ?? [];
  const childrenEnd = new Map<number, number>();
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const from = item.position.start.line;
    const nestedEnd = childrenEnd.get(from);
    const to = Math.max(item.position.end.line, nestedEnd ?? -1);
    if (nestedEnd !== undefined) ranges.push({ from, to });
    if (item.parent >= 0) childrenEnd.set(item.parent, Math.max(childrenEnd.get(item.parent) ?? -1, to));
  }

  return ranges;
}

export function subtreeAt(ranges: LineRange[], line: number): LineRange[] {
  const target = ranges.find((range) => range.from === line);
  if (!target) return [];
  const nested = ranges.filter((range) => range !== target && range.from >= target.from && range.from <= target.to);
  return [target, ...nested];
}
