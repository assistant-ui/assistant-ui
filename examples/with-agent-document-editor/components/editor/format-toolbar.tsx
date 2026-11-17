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
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
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
  type LexicalNode,
} from "lexical";
import {
  BoldIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  RedoIcon,
  TextQuoteIcon,
  UndoIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { cn } from "@/lib/utils";

type BlockKind =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "quote"
  | "bullet"
  | "number";

type ToolbarState = {
  block: BlockKind;
  bold: boolean;
  italic: boolean;
  code: boolean;
  link: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

const INITIAL: ToolbarState = {
  block: "paragraph",
  bold: false,
  italic: false,
  code: false,
  link: false,
  canUndo: false,
  canRedo: false,
};

function $selectedBlockKind(node: LexicalNode): BlockKind {
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

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <TooltipIconButton
      tooltip={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:text-foreground size-7 [&_svg]:size-4",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </TooltipIconButton>
  );
}

const Divider = () => (
  <span aria-hidden className="bg-foreground/10 mx-1 h-4 w-px" />
);

export function FormatToolbar() {
  const [editor] = useLexicalComposerContext();
  const [state, setState] = useState(INITIAL);

  useEffect(() => {
    const unregisterUpdate = editor.registerUpdateListener(
      ({ editorState }) => {
        editorState.read(() => {
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) return;
          const node = selection.anchor.getNode();
          const selected = {
            block: $selectedBlockKind(node),
            bold: selection.hasFormat("bold"),
            italic: selection.hasFormat("italic"),
            code: selection.hasFormat("code"),
            link: $isLinkNode(node) || $isLinkNode(node.getParent()),
          };
          setState((previous) => ({ ...previous, ...selected }));
        });
      },
    );
    const unregisterUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (canUndo) => {
        setState((previous) => ({ ...previous, canUndo }));
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const unregisterRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (canRedo) => {
        setState((previous) => ({ ...previous, canRedo }));
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      unregisterUpdate();
      unregisterUndo();
      unregisterRedo();
    };
  }, [editor]);

  const setBlock = (kind: "paragraph" | "h1" | "h2" | "h3" | "quote") => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const next = state.block === kind ? "paragraph" : kind;
      $setBlocksType(selection, () => {
        if (next === "paragraph") return $createParagraphNode();
        if (next === "quote") return $createQuoteNode();
        return $createHeadingNode(next);
      });
    });
  };

  const toggleList = (kind: "bullet" | "number") => {
    if (state.block === kind) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      return;
    }
    editor.dispatchCommand(
      kind === "bullet"
        ? INSERT_UNORDERED_LIST_COMMAND
        : INSERT_ORDERED_LIST_COMMAND,
      undefined,
    );
  };

  const toggleLink = () => {
    if (state.link) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      return;
    }
    const url = window.prompt("Link address");
    if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="border-foreground/10 bg-background flex h-11 shrink-0 items-center gap-0.5 overflow-x-auto border-b px-3"
    >
      <ToolbarButton
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        <RedoIcon />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Text"
        active={state.block === "paragraph"}
        onClick={() => setBlock("paragraph")}
      >
        <PilcrowIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 1"
        active={state.block === "h1"}
        onClick={() => setBlock("h1")}
      >
        <Heading1Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={state.block === "h2"}
        onClick={() => setBlock("h2")}
      >
        <Heading2Icon />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={state.block === "h3"}
        onClick={() => setBlock("h3")}
      >
        <Heading3Icon />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Bold"
        active={state.bold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={state.italic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Code"
        active={state.code}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
      >
        <CodeIcon />
      </ToolbarButton>
      <ToolbarButton label="Link" active={state.link} onClick={toggleLink}>
        <LinkIcon />
      </ToolbarButton>
      <Divider />
      <ToolbarButton
        label="Bulleted list"
        active={state.block === "bullet"}
        onClick={() => toggleList("bullet")}
      >
        <ListIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.block === "number"}
        onClick={() => toggleList("number")}
      >
        <ListOrderedIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={state.block === "quote"}
        onClick={() => setBlock("quote")}
      >
        <TextQuoteIcon />
      </ToolbarButton>
    </div>
  );
}
