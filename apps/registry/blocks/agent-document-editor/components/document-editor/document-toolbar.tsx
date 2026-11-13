"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createHeadingNode,
  $isHeadingNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  mergeRegister,
} from "lexical";
import {
  BoldIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  Heading1Icon,
  Heading2Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  Redo2Icon,
  Undo2Icon,
} from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useDocument, useDocumentStore } from "@/hooks/use-document";
import { documentTitle } from "@/lib/document-editor/document";
import { cn } from "@/lib/utils";

type Block = "paragraph" | HeadingTagType | "bullet" | "number" | "other";

type ToolbarState = {
  block: Block;
  bold: boolean;
  italic: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

const fileName = (title: string) =>
  `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "document"
  }.md`;

function download(content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/markdown;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(documentTitle(content));
  link.click();
  URL.revokeObjectURL(url);
}

const $readBlock = (): Block | null => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;
  const node = selection.anchor.getNode();
  const block = node.getKey() === "root" ? node : node.getTopLevelElement();
  if ($isHeadingNode(block)) return block.getTag();
  if ($isListNode(block)) {
    return block.getListType() === "number" ? "number" : "bullet";
  }
  return block?.getType() === "paragraph" ? "paragraph" : "other";
};

function useToolbarState(): ToolbarState {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState<ToolbarState>({
    block: "paragraph",
    bold: false,
    italic: false,
    canUndo: false,
    canRedo: false,
  });

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => {
          editorState.read(() => {
            const selection = $getSelection();
            const block = $readBlock();
            if (!$isRangeSelection(selection) || block === null) return;
            const bold = selection.hasFormat("bold");
            const italic = selection.hasFormat("italic");
            setState((previous) =>
              previous.block === block &&
              previous.bold === bold &&
              previous.italic === italic
                ? previous
                : { ...previous, block, bold, italic },
            );
          });
        }),
        editor.registerCommand(
          CAN_UNDO_COMMAND,
          (canUndo) => {
            setState((previous) => ({ ...previous, canUndo }));
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
        editor.registerCommand(
          CAN_REDO_COMMAND,
          (canRedo) => {
            setState((previous) => ({ ...previous, canRedo }));
            return false;
          },
          COMMAND_PRIORITY_LOW,
        ),
      ),
    [editor],
  );

  return state;
}

function ToolbarButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <TooltipIconButton
      tooltip={label}
      disabled={disabled}
      onClick={onClick}
      {...(pressed === undefined ? {} : { "aria-pressed": pressed })}
      className={cn("size-7", pressed && "bg-accent text-accent-foreground")}
    >
      {children}
    </TooltipIconButton>
  );
}

const Separator = () => (
  <span aria-hidden className="bg-border mx-1 h-4 w-px shrink-0" />
);

export function DocumentToolbar() {
  const [editor] = useLexicalComposerContext();
  const store = useDocumentStore();
  const isEmpty = useDocument((state) => state.content.trim() === "");
  const { block, bold, italic, canUndo, canRedo } = useToolbarState();
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const toggleHeading = (tag: HeadingTagType) =>
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () =>
        block === tag ? $createParagraphNode() : $createHeadingNode(tag),
      );
    });

  const toggleList = (type: "bullet" | "number") =>
    editor.dispatchCommand(
      block === type
        ? REMOVE_LIST_COMMAND
        : type === "bullet"
          ? INSERT_UNORDERED_LIST_COMMAND
          : INSERT_ORDERED_LIST_COMMAND,
      undefined,
    );

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b px-3 py-1.5"
    >
      <ToolbarButton
        label="Heading 1"
        pressed={block === "h1"}
        onClick={() => toggleHeading("h1")}
      >
        <Heading1Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        pressed={block === "h2"}
        onClick={() => toggleHeading("h2")}
      >
        <Heading2Icon />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        label="Bold"
        pressed={bold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        pressed={italic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <ItalicIcon />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        label="Bulleted list"
        pressed={block === "bullet"}
        onClick={() => toggleList("bullet")}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        pressed={block === "number"}
        onClick={() => toggleList("number")}
      >
        <ListOrderedIcon />
      </ToolbarButton>
      <span className="flex-1" />
      <ToolbarButton
        label="Undo"
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <Undo2Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        <Redo2Icon />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        label={isCopied ? "Copied" : "Copy as Markdown"}
        disabled={isEmpty}
        onClick={() => copyToClipboard(store.getState().content)}
      >
        {isCopied ? <CheckIcon /> : <CopyIcon />}
      </ToolbarButton>
      <ToolbarButton
        label="Download as Markdown"
        disabled={isEmpty}
        onClick={() => download(store.getState().content)}
      >
        <DownloadIcon />
      </ToolbarButton>
    </div>
  );
}
