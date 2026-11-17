import type { LexicalEditor } from "lexical";
import { $blockKeys, type BlockIds } from "@/lib/blocks";
import type { StreamMarks } from "@/lib/streaming";

const LIVE = "doc-live";
const LIVE_SOFT = "doc-live-soft";
const GHOST = "doc-ghost";
const ATTRIBUTE = "data-doc-stream";

// A new block with nothing to show yet is drawn as a shimmering bar. The
// shimmer's background mode is keyed on these classes, so a stylesheet rule
// for the attribute cannot stand in for them.
const EMPTY_BLOCK = [
  "shimmer",
  "shimmer-bg",
  "bg-muted",
  "min-h-[1lh]",
  "w-2/3",
  "rounded-md",
];

const supportsHighlights = () =>
  typeof CSS !== "undefined" && "highlights" in CSS;

// A block that holds only a <br> is empty; any other <br> is a line break,
// which the block's text counts as one character.
const isLineBreak = (node: Node) =>
  node.nodeName === "BR" && !!(node.previousSibling || node.nextSibling);

export function textOf(root: HTMLElement) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  let text = "";
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) text += (node as Text).data;
    else if (isLineBreak(node)) text += "\n";
  }
  return text;
}

export function textRange(root: HTMLElement, start: number, end: number) {
  if (start >= end) return null;
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  const range = document.createRange();
  let offset = 0;
  let started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node as Text;
      const next = offset + text.data.length;
      if (!started && start < next) {
        range.setStart(text, start - offset);
        started = true;
      }
      if (started && end <= next) {
        range.setEnd(text, end - offset);
        return range;
      }
      offset = next;
    } else if (isLineBreak(node)) {
      if (!started && start <= offset) {
        range.setStartBefore(node);
        started = true;
      }
      offset += 1;
      if (started && end <= offset) {
        range.setEndAfter(node);
        return range;
      }
    }
  }
  if (!started) return null;
  range.setEnd(root, root.childNodes.length);
  return range;
}

/** Where the last `count` words before `end` begin. */
function wordsBack(text: string, end: number, count: number) {
  let index = end;
  for (let word = 0; word < count && index > 0; word++) {
    while (index > 0 && /\s/.test(text[index - 1]!)) index--;
    while (index > 0 && !/\s/.test(text[index - 1]!)) index--;
  }
  return index;
}

const highlight = (name: string, range: Range | null) => {
  if (range) CSS.highlights.set(name, new Highlight(range));
  else CSS.highlights.delete(name);
};

/**
 * Draws the assistant's activity over the document without changing it: a
 * shimmer on the blocks it is working on, the live color on the words it has
 * just typed, the old text it has not overwritten yet dimmed, and a caret
 * where it is typing.
 */
export function createStreamPainter(
  editor: LexicalEditor,
  ids: BlockIds,
  getCaret: () => HTMLElement | null,
) {
  let marked = new Map<HTMLElement, string>();
  let typingId: string | undefined;

  const paint = (marks: StreamMarks) => {
    const keys = editor.getEditorState().read(() => $blockKeys(ids));
    const elementOf = (id: string) => {
      const key = keys.get(id);
      return key ? editor.getElementByKey(key) : null;
    };

    const wanted = new Map<HTMLElement, string>();
    for (const id of marks.working) {
      const element = elementOf(id);
      if (element) wanted.set(element, "working");
    }
    for (const id of marks.empty) {
      const element = elementOf(id);
      if (element) wanted.set(element, "empty");
    }
    for (const element of marked.keys()) {
      if (wanted.has(element)) continue;
      element.removeAttribute(ATTRIBUTE);
      element.classList.remove(...EMPTY_BLOCK);
    }
    for (const [element, kind] of wanted) {
      if (element.getAttribute(ATTRIBUTE) === kind) continue;
      element.setAttribute(ATTRIBUTE, kind);
      if (kind === "empty") element.classList.add(...EMPTY_BLOCK);
      else element.classList.remove(...EMPTY_BLOCK);
    }
    marked = wanted;

    const caret = getCaret();
    const element = marks.typing ? elementOf(marks.typing.id) : null;
    if (!marks.typing || !element) {
      if (supportsHighlights()) {
        highlight(LIVE, null);
        highlight(LIVE_SOFT, null);
        highlight(GHOST, null);
      }
      if (caret) caret.hidden = true;
      typingId = undefined;
      return;
    }

    const { typed } = marks.typing;
    const text = textOf(element);
    if (supportsHighlights()) {
      const fresh = wordsBack(text, typed, 2);
      const fading = wordsBack(text, fresh, 3);
      highlight(LIVE, textRange(element, fresh, typed));
      highlight(LIVE_SOFT, textRange(element, fading, fresh));
      highlight(GHOST, textRange(element, typed, text.length));
    }

    const paper = caret?.parentElement?.getBoundingClientRect();
    if (caret && paper) {
      const last = typed > 0 ? textRange(element, typed - 1, typed) : null;
      const rects = last?.getClientRects();
      const letter = rects?.length ? rects[rects.length - 1]! : undefined;
      const fallback = element.getBoundingClientRect();
      const lineHeight =
        Number.parseFloat(getComputedStyle(element).lineHeight) ||
        fallback.height;
      caret.hidden = false;
      caret.style.left = `${(letter ? letter.right : fallback.left) - paper.left}px`;
      caret.style.top = `${(letter ? letter.top : fallback.top) - paper.top}px`;
      caret.style.height = `${letter ? letter.height : lineHeight}px`;
    }

    if (typingId !== marks.typing.id) {
      typingId = marks.typing.id;
      element.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  const clear = () => paint({ working: [], empty: [] });

  return { paint, clear };
}
