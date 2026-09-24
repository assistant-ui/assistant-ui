import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
} from "lexical";

export function $getCollapsedRuntimeOffset(): number | undefined {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return undefined;
  }
  const anchor = selection.anchor;
  let offset = 0;
  const paragraphs = $getRoot().getChildren();
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (!$isElementNode(paragraph)) continue;
    if (anchor.type === "element" && anchor.key === paragraph.getKey()) {
      const children = paragraph.getChildren();
      const childIndex = Math.min(anchor.offset, children.length);
      for (let c = 0; c < childIndex; c++) {
        offset += children[c]!.getTextContent().length;
      }
      return offset;
    }
    for (const child of paragraph.getChildren()) {
      if (anchor.key === child.getKey()) {
        return offset + (anchor.type === "text" ? anchor.offset : 0);
      }
      offset += child.getTextContent().length;
    }
    if (i < paragraphs.length - 1) offset += 1;
  }
  return undefined;
}
