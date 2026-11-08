import { View } from "obsidian";

// Search keeps its own Mod-click, which collapses every result.
const PANES = new Set(["file-explorer", "bookmarks", "tag", "outline"]);

export const PANE_ARROWS = ".tree-item-self > .collapse-icon";

// Undocumented: the tree component these panes share. Every member is
// checked before use, so a change in Obsidian falls back to its own click.
interface TreeItem {
  collapsed: boolean;
  collapseEl: HTMLElement | null;
  vChildren: { children: unknown[] };
  setCollapsed(collapsed: boolean, animate: boolean): unknown;
}

interface Tree {
  root: unknown;
  requestSaveFolds(): void;
}

function childrenOf(node: unknown): unknown[] {
  const children = (node as { vChildren?: { children?: unknown } } | null)?.vChildren?.children;
  return Array.isArray(children) ? children : [];
}

function isFoldable(node: unknown): node is TreeItem {
  const item = node as Partial<TreeItem>;
  return typeof item.collapsed === "boolean" && typeof item.setCollapsed === "function" && "childrenEl" in item;
}

function treeOf(view: View): Tree | null {
  if (!PANES.has(view.getViewType())) return null;
  const tree = (view as { tree?: Partial<Tree> }).tree;
  return tree?.root && typeof tree.requestSaveFolds === "function" ? (tree as Tree) : null;
}

function itemWithArrow(node: unknown, arrow: HTMLElement): TreeItem | null {
  for (const child of childrenOf(node)) {
    if (isFoldable(child) && child.collapseEl === arrow) return child;
    const found = itemWithArrow(child, arrow);
    if (found) return found;
  }
  return null;
}

function foldableSubtree(item: TreeItem): TreeItem[] {
  const subtree = [item];
  for (const child of childrenOf(item)) {
    if (isFoldable(child)) subtree.push(...foldableSubtree(child));
  }
  return subtree;
}

export function planPaneToggle(view: View, arrow: HTMLElement): (() => void) | null {
  const tree = treeOf(view);
  const item = tree && itemWithArrow(tree.root, arrow);
  if (!tree || !item) return null;
  const subtree = foldableSubtree(item);
  const collapse = !item.collapsed;
  return () => {
    for (const node of subtree) void node.setCollapsed(collapse, false);
    tree.requestSaveFolds();
  };
}
