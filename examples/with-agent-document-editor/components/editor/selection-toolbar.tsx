"use client";

import {
  ComposerPrimitive,
  useAui,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getNearestNodeFromDOMNode, FORMAT_TEXT_COMMAND } from "lexical";
import {
  ArrowUpIcon,
  BoldIcon,
  ItalicIcon,
  MessageSquarePlusIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { useCommentsState, useWorkspace } from "@/components/workspace-context";
import { $blockKeyOf, type BlockIds } from "@/lib/blocks";
import { initialComments } from "@/lib/document-state";

const HIGHLIGHT = "doc-selection";
const MAX_QUOTE_LENGTH = 2000;

type Captured = {
  blockId: string;
  /** Everything that is highlighted. */
  text: string;
  /** The part of it inside the first block, which is where a comment hangs. */
  quote: string;
  range: Range;
};

type Mode = "actions" | "ask" | "comment";

type Position = { top: number; left: number; below: boolean };

const place = (range: Range): Position | null => {
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const below = rect.top < 72;
  return {
    top: below ? rect.bottom + 8 : rect.top - 8,
    left: Math.min(
      Math.max(rect.left + rect.width / 2, 176),
      window.innerWidth - 176,
    ),
    below,
  };
};

const QUICK_ACTIONS = [
  {
    label: "Improve",
    prompt: "Improve the writing of this passage. Keep its meaning and length.",
  },
  {
    label: "Shorten",
    prompt: "Shorten this passage. Keep its meaning.",
  },
];

export function SelectionToolbar({ ids }: { ids: BlockIds }) {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();
  const { setChatOpen, showComment } = useWorkspace();
  const [, { setState: setComments }] = useCommentsState();
  const isRunning = useAuiState((s) => s.thread.isRunning);

  const [captured, setCaptured] = useState<Captured | null>(null);
  const [mode, setMode] = useState<Mode>("actions");
  const [position, setPosition] = useState<Position | null>(null);
  const [comment, setComment] = useState("");
  const toolbar = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const close = useCallback(() => {
    setCaptured(null);
    setPosition(null);
    setMode("actions");
    setComment("");
  }, []);

  const readSelection = useCallback((): Captured | null => {
    const root = editor.getRootElement();
    const selection = window.getSelection();
    if (!root || !selection || selection.isCollapsed || !selection.rangeCount) {
      return null;
    }
    const range = selection.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return null;
    const text = selection.toString().trim();
    if (!text) return null;

    const block = editor.read(() => {
      const node = $getNearestNodeFromDOMNode(range.startContainer);
      const key = node ? $blockKeyOf(node) : undefined;
      const id = key ? ids.get(key) : undefined;
      return key && id ? { key, id } : null;
    });
    if (!block) return null;

    const element = editor.getElementByKey(block.key);
    const inBlock = range.cloneRange();
    if (element && !element.contains(range.endContainer)) {
      inBlock.setEnd(element, element.childNodes.length);
    }
    return {
      blockId: block.id,
      text: text.slice(0, MAX_QUOTE_LENGTH),
      quote: inBlock.toString().trim() || text,
      range: range.cloneRange(),
    };
  }, [editor, ids]);

  useEffect(() => {
    let dragging = false;
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (modeRef.current !== "actions") return;
        const selected = readSelection();
        setCaptured(selected);
        setPosition(selected ? place(selected.range) : null);
      });
    };
    const onMouseDown = (event: MouseEvent) => {
      if (toolbar.current?.contains(event.target as Node)) return;
      dragging = true;
      if (modeRef.current !== "actions") close();
    };
    const onMouseUp = () => {
      dragging = false;
      update();
    };
    const onSelectionChange = () => {
      if (!dragging) update();
    };

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [close, readSelection]);

  useEffect(() => {
    if (!captured) return;
    const follow = () => setPosition(place(captured.range));
    document.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [captured]);

  // Focus leaves the document while an input in the toolbar is open, and the
  // browser stops drawing the selection, so the passage is painted instead.
  useEffect(() => {
    if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
    if (!captured || mode === "actions") return;
    CSS.highlights.set(HIGHLIGHT, new Highlight(captured.range));
    return () => {
      CSS.highlights.delete(HIGHLIGHT);
    };
  }, [captured, mode]);

  useAuiEvent("composer.send", () => {
    if (modeRef.current !== "ask") return;
    close();
    setChatOpen(true);
  });

  if (!captured || !position) return null;

  const quote = { text: captured.text, messageId: captured.blockId };

  const startAsking = () => {
    aui.thread.composer().setQuote(quote);
    setMode("ask");
  };

  const sendPrompt = (prompt: string) => {
    aui.thread.append({
      role: "user",
      content: [{ type: "text", text: prompt }],
      metadata: { custom: { quote } },
    });
    window.getSelection()?.removeAllRanges();
    close();
    setChatOpen(true);
  };

  const saveComment = (event: FormEvent) => {
    event.preventDefault();
    const text = comment.trim();
    if (!text) return;
    const id = `c-${Math.random().toString(36).slice(2, 8)}`;
    setComments((previous) => ({
      comments: [
        ...(previous ?? initialComments).comments,
        {
          id,
          blockId: captured.blockId,
          quote: captured.quote,
          author: "user",
          text,
          resolved: false,
          replyTo: null,
        },
      ],
    }));
    window.getSelection()?.removeAllRanges();
    close();
    showComment(id);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || mode === "actions") return;
    event.preventDefault();
    event.stopPropagation();
    if (mode === "ask") aui.thread.composer().setQuote(undefined);
    close();
    editor.focus();
  };

  return createPortal(
    <div
      ref={toolbar}
      role="toolbar"
      aria-label="Selected text"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        transform: position.below
          ? "translate(-50%, 0)"
          : "translate(-50%, -100%)",
      }}
      className="bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in zoom-in-95 z-50 flex items-center gap-0.5 rounded-[10px] p-1 text-sm shadow-lg ring-1 duration-100 motion-reduce:animate-none"
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest("input, textarea")) event.preventDefault();
      }}
      onKeyDownCapture={onKeyDown}
    >
      {mode === "actions" && (
        <>
          {!isRunning && (
            <>
              <TooltipIconButton
                tooltip="Bold"
                side="top"
                className="size-7 [&_svg]:size-4"
                onClick={() =>
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
                }
              >
                <BoldIcon />
              </TooltipIconButton>
              <TooltipIconButton
                tooltip="Italic"
                side="top"
                className="size-7 [&_svg]:size-4"
                onClick={() =>
                  editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
                }
              >
                <ItalicIcon />
              </TooltipIconButton>
              <span aria-hidden className="bg-foreground/10 mx-1 h-4 w-px" />
            </>
          )}
          <Button size="sm" disabled={isRunning} onClick={startAsking}>
            Ask AI
          </Button>
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              disabled={isRunning}
              onClick={() => sendPrompt(action.prompt)}
            >
              {action.label}
            </Button>
          ))}
          <span aria-hidden className="bg-foreground/10 mx-1 h-4 w-px" />
          <Button variant="ghost" size="sm" onClick={() => setMode("comment")}>
            <MessageSquarePlusIcon data-icon="inline-start" />
            Comment
          </Button>
        </>
      )}

      {mode === "ask" && (
        <ComposerPrimitive.Root className="flex w-80 items-end gap-1">
          <ComposerPrimitive.Input
            autoFocus
            rows={1}
            placeholder="Tell the assistant what to change"
            aria-label="Instruction for the assistant"
            unstable_focusOnRunStart={false}
            unstable_focusOnScrollToBottom={false}
            unstable_focusOnThreadSwitched={false}
            className="placeholder:text-muted-foreground/70 max-h-32 min-h-7 flex-1 resize-none bg-transparent px-2 py-1 text-sm leading-5 outline-none"
          />
          <ComposerPrimitive.Send asChild>
            <TooltipIconButton
              tooltip="Send"
              side="top"
              variant="default"
              className="size-7 rounded-full [&_svg]:size-4"
            >
              <ArrowUpIcon />
            </TooltipIconButton>
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      )}

      {mode === "comment" && (
        <form onSubmit={saveComment} className="flex w-80 items-center gap-1">
          <input
            autoFocus
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add a comment"
            aria-label="Comment"
            className="placeholder:text-muted-foreground/70 h-7 flex-1 bg-transparent px-2 text-sm outline-none"
          />
          <Button type="submit" size="sm" disabled={!comment.trim()}>
            Comment
          </Button>
        </form>
      )}
    </div>,
    document.body,
  );
}
