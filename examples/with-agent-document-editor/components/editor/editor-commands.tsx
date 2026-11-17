"use client";

import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from "@lexical/react/LexicalHorizontalRuleNode";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import {
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  TextQuoteIcon,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { BlockIds } from "@/lib/blocks";

export type TextStyle = "paragraph" | "h1" | "h2" | "h3" | "quote";
export type ListStyle = "bullet" | "number";
export type BlockStyle = TextStyle | ListStyle;

export const TEXT_STYLES: readonly {
  style: TextStyle;
  label: string;
  icon: LucideIcon;
}[] = [
  { style: "paragraph", label: "Text", icon: PilcrowIcon },
  { style: "h1", label: "Heading 1", icon: Heading1Icon },
  { style: "h2", label: "Heading 2", icon: Heading2Icon },
  { style: "h3", label: "Heading 3", icon: Heading3Icon },
  { style: "quote", label: "Quote", icon: TextQuoteIcon },
];

export const LIST_STYLES: readonly {
  style: ListStyle;
  label: string;
  icon: LucideIcon;
}[] = [
  { style: "bullet", label: "Bulleted list", icon: ListIcon },
  { style: "number", label: "Numbered list", icon: ListOrderedIcon },
];

export type SelectionFormat = {
  block: BlockStyle;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  highlight: boolean;
  code: boolean;
  /** The address of the link the selection starts in, if it is in one. */
  link: string | null;
};

const NO_FORMAT: SelectionFormat = {
  block: "paragraph",
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  highlight: false,
  code: false,
  link: null,
};

function $blockStyle(node: LexicalNode): BlockStyle {
  for (let current: LexicalNode | null = node; current;) {
    if ($isListNode(current)) {
      return current.getListType() === "number" ? "number" : "bullet";
    }
    if ($isHeadingNode(current)) {
      const tag = current.getTag();
      return tag === "h1" ? "h1" : tag === "h2" ? "h2" : "h3";
    }
    if ($isQuoteNode(current)) return "quote";
    current = current.getParent();
  }
  return "paragraph";
}

function $linkAddress(node: LexicalNode) {
  for (let current: LexicalNode | null = node; current;) {
    if ($isLinkNode(current)) return current.getURL();
    current = current.getParent();
  }
  return null;
}

function $selectionFormat(): SelectionFormat | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  const node = selection.anchor.getNode();
  return {
    block: $blockStyle(node),
    bold: selection.hasFormat("bold"),
    italic: selection.hasFormat("italic"),
    underline: selection.hasFormat("underline"),
    strike: selection.hasFormat("strikethrough"),
    highlight: selection.hasFormat("highlight"),
    code: selection.hasFormat("code"),
    link: $linkAddress(node),
  };
}

const FORMAT_KEYS = Object.keys(NO_FORMAT) as (keyof SelectionFormat)[];

export function useSelectionFormat() {
  const [editor] = useLexicalComposerContext();
  const [format, setFormat] = useState(NO_FORMAT);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const next = editorState.read($selectionFormat);
      if (!next) return;
      setFormat((previous) =>
        FORMAT_KEYS.every((key) => previous[key] === next[key])
          ? previous
          : next,
      );
    });
  }, [editor]);

  return format;
}

/** Whether the document can be changed, which it cannot while the assistant writes. */
export function useIsEditable() {
  const [editor] = useLexicalComposerContext();
  return useSyncExternalStore(
    (onChange) => editor.registerEditableListener(onChange),
    () => editor.isEditable(),
    () => true,
  );
}

const $selectedBlockKeys = () => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return [];
  return [
    ...new Set(
      selection
        .getNodes()
        .map((node) => node.getTopLevelElement()?.getKey())
        .filter((key) => key !== undefined),
    ),
  ];
};

const currentBlockStyle = (editor: LexicalEditor) =>
  editor.read(() => {
    const selection = $getSelection();
    return $isRangeSelection(selection)
      ? $blockStyle(selection.anchor.getNode())
      : "paragraph";
  });

const isList = (style: BlockStyle) => style === "bullet" || style === "number";

export function setTextStyle(
  editor: LexicalEditor,
  style: TextStyle,
  ids: BlockIds,
) {
  if (isList(currentBlockStyle(editor))) {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
  }
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const before = $selectedBlockKeys();
    $setBlocksType(selection, () => {
      if (style === "paragraph") return $createParagraphNode();
      if (style === "quote") return $createQuoteNode();
      return $createHeadingNode(style);
    });
    // The restyled block is a new node. It keeps the id of the one it
    // replaces, which comments and history know it by.
    const after = $selectedBlockKeys();
    if (before.length !== after.length) return;
    before.forEach((key, index) => {
      const id = ids.get(key);
      if (id) ids.set(after[index]!, id);
    });
  });
}

export const insertList = (editor: LexicalEditor, style: ListStyle) =>
  editor.dispatchCommand(
    style === "bullet"
      ? INSERT_UNORDERED_LIST_COMMAND
      : INSERT_ORDERED_LIST_COMMAND,
    undefined,
  );

export function toggleList(editor: LexicalEditor, style: ListStyle) {
  if (currentBlockStyle(editor) === style) {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    return;
  }
  insertList(editor, style);
}

export function insertDivider(editor: LexicalEditor) {
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    const block = selection.anchor.getNode().getTopLevelElement();
    if ($isParagraphNode(block) && block.getTextContentSize() === 0) {
      block.insertBefore($createHorizontalRuleNode());
      return;
    }
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  });
}

export function setLink(editor: LexicalEditor, address: string | null) {
  const url = address?.trim();
  if (!url) {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    return;
  }
  editor.dispatchCommand(
    TOGGLE_LINK_COMMAND,
    /^[a-z][a-z0-9+.-]*:|^[/#]/i.test(url) ? url : `https://${url}`,
  );
}
