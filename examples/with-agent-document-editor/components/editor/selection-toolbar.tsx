"use client";

import {
  ComposerPrimitive,
  useAui,
  useAuiEvent,
  useAuiState,
} from "@assistant-ui/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNearestNodeFromDOMNode,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
import {
  ArrowUpIcon,
  BoldIcon,
  ChevronDownIcon,
  CodeIcon,
  HighlighterIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  MessageSquarePlusIcon,
  StrikethroughIcon,
  UnderlineIcon,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommentsState, useWorkspace } from "@/components/workspace-context";
import { $blockKeyOf, type BlockIds } from "@/lib/blocks";
import { initialComments } from "@/lib/document-state";
import { cn } from "@/lib/utils";
import {
  LIST_STYLES,
  setLink,
  setTextStyle,
  TEXT_STYLES,
  toggleList,
  useSelectionFormat,
  type ListStyle,
  type TextStyle,
} from "./editor-commands";

const HIGHLIGHT = "doc-selection";
const MAX_QUOTE_LENGTH = 2000;
const EDGE = 8;

type Captured = {
  blockId: string;
  /** Everything that is highlighted. */
  text: string;
  /** The part of it inside the first block, which is where a comment hangs. */
  quote: string;
  range: Range;
};

type Mode = "actions" | "ask" | "comment" | "link";

type Position = { top: number; center: number; below: boolean };

const place = (range: Range): Position | null => {
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const below = rect.top < 72;
  return {
    top: below ? rect.bottom + 8 : rect.top - 8,
    center: rect.left + rect.width / 2,
    below,
  };
};

const REWRITES = [
  {
    label: "Improve writing",
    prompt: "Improve the writing of this passage. Keep its meaning and length.",
  },
  {
    label: "Fix spelling and grammar",
    prompt:
      "Fix the spelling and grammar of this passage. Change nothing else.",
  },
  {
    label: "Make shorter",
    prompt: "Shorten this passage. Keep its meaning.",
  },
  {
    label: "Make longer",
    prompt: "Expand this passage with a little more detail. Keep its tone.",
  },
  {
    label: "Simplify",
    prompt: "Rewrite this passage in simpler words. Keep its meaning.",
  },
];

const TEXT_FORMATS: readonly {
  format: TextFormatType;
  flag: "bold" | "italic" | "underline" | "strike" | "code" | "highlight";
  label: string;
  icon: LucideIcon;
}[] = [
  { format: "bold", flag: "bold", label: "Bold", icon: BoldIcon },
  { format: "italic", flag: "italic", label: "Italic", icon: ItalicIcon },
  {
    format: "underline",
    flag: "underline",
    label: "Underline",
    icon: UnderlineIcon,
  },
  {
    format: "strikethrough",
    flag: "strike",
    label: "Strikethrough",
    icon: StrikethroughIcon,
  },
  { format: "code", flag: "code", label: "Code", icon: CodeIcon },
  {
    format: "highlight",
    flag: "highlight",
    label: "Highlight",
    icon: HighlighterIcon,
  },
];

const Separator = () => (
  <span aria-hidden className="bg-foreground/10 mx-1 h-4 w-px shrink-0" />
);

const iconButton = "size-7 shrink-0 [&_svg]:size-4";
const menuTrigger =
  "text-muted-foreground hover:text-foreground h-7 shrink-0 gap-0.5 px-1.5 [&_svg]:size-4";
const fieldInput =
  "placeholder:text-muted-foreground/70 h-7 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none";

export function SelectionToolbar({ ids }: { ids: BlockIds }) {
  const [editor] = useLexicalComposerContext();
  const aui = useAui();
  const { setChatOpen, showComment } = useWorkspace();
  const [, { setState: setComments }] = useCommentsState();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const format = useSelectionFormat();

  const [captured, setCaptured] = useState<Captured | null>(null);
  const [mode, setMode] = useState<Mode>("actions");
  const [position, setPosition] = useState<Position | null>(null);
  const [draft, setDraft] = useState("");
  const toolbar = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const close = useCallback(() => {
    setCaptured(null);
    setPosition(null);
    setMode("actions");
    setDraft("");
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
      const target = event.target as Element | null;
      if (toolbar.current?.contains(target)) return;
      // The toolbar's menus open in a portal, outside the toolbar element.
      if (target?.closest('[data-slot^="dropdown-menu"]')) return;
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

  // The toolbar is centered on the selection but must stay on screen, and its
  // width is only known once it has rendered in its current mode.
  useLayoutEffect(() => {
    const element = toolbar.current;
    if (!element || !position) return;
    const half = element.offsetWidth / 2;
    const left = Math.min(
      Math.max(position.center, half + EDGE),
      window.innerWidth - half - EDGE,
    );
    element.style.left = `${left}px`;
  }, [position, mode, isRunning]);

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
    const text = draft.trim();
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

  const applyLink = (event: FormEvent) => {
    event.preventDefault();
    setLink(editor, draft);
    close();
    editor.focus();
  };

  const removeLink = () => {
    setLink(editor, null);
    close();
    editor.focus();
  };

  // A menu hands focus back to its trigger when it closes, so the document
  // takes it once that has happened.
  const afterMenu = (run: () => void) => {
    run();
    setTimeout(() => editor.focus(), 0);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || mode === "actions") return;
    event.preventDefault();
    event.stopPropagation();
    if (mode === "ask") aui.thread.composer().setQuote(undefined);
    close();
    editor.focus();
  };

  const inList = format.block === "bullet" || format.block === "number";
  const textStyle = TEXT_STYLES.find(({ style }) => style === format.block);
  const TextStyleIcon = textStyle?.icon ?? TEXT_STYLES[0]!.icon;

  return createPortal(
    <div
      ref={toolbar}
      role="toolbar"
      aria-label="Selected text"
      style={{
        position: "fixed",
        top: position.top,
        left: position.center,
        transform: position.below
          ? "translate(-50%, 0)"
          : "translate(-50%, -100%)",
      }}
      className="bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in z-40 flex max-w-[calc(100vw-1rem)] items-center gap-0.5 overflow-x-auto rounded-[10px] p-1 text-sm shadow-lg ring-1 duration-100 motion-reduce:animate-none"
      onMouseDown={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest("input, textarea")) event.preventDefault();
      }}
      onKeyDownCapture={onKeyDown}
    >
      {mode === "actions" && (
        <>
          <Button
            size="sm"
            disabled={isRunning}
            onClick={startAsking}
            className="shrink-0"
          >
            Ask AI
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isRunning}
                  className="shrink-0 gap-0.5"
                />
              }
            >
              Rewrite
              <ChevronDownIcon className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              {REWRITES.map((rewrite) => (
                <DropdownMenuItem
                  key={rewrite.label}
                  onClick={() => sendPrompt(rewrite.prompt)}
                >
                  {rewrite.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Separator />
          <TooltipIconButton
            tooltip="Comment"
            side="top"
            className={iconButton}
            onClick={() => setMode("comment")}
          >
            <MessageSquarePlusIcon />
          </TooltipIconButton>
          {!isRunning && (
            <>
              <Separator />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Text style: ${textStyle?.label ?? "List"}`}
                      className={menuTrigger}
                    />
                  }
                >
                  <TextStyleIcon />
                  <ChevronDownIcon className="size-3!" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44">
                  <DropdownMenuRadioGroup
                    value={textStyle?.style ?? ""}
                    onValueChange={(style) =>
                      afterMenu(() => setTextStyle(editor, style as TextStyle))
                    }
                  >
                    {TEXT_STYLES.map(({ style, label, icon: Icon }) => (
                      <DropdownMenuRadioItem key={style} value={style}>
                        <Icon className="text-muted-foreground" />
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {TEXT_FORMATS.map(({ format: type, flag, label, icon: Icon }) => (
                <TooltipIconButton
                  key={type}
                  tooltip={label}
                  side="top"
                  aria-pressed={format[flag]}
                  className={cn(
                    iconButton,
                    format[flag] && "bg-muted text-foreground",
                  )}
                  onClick={() =>
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type)
                  }
                >
                  <Icon />
                </TooltipIconButton>
              ))}
              <Separator />
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="List"
                      className={cn(
                        menuTrigger,
                        inList && "bg-muted text-foreground",
                      )}
                    />
                  }
                >
                  <ListIcon />
                  <ChevronDownIcon className="size-3!" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44">
                  <DropdownMenuRadioGroup
                    value={inList ? format.block : ""}
                    onValueChange={(style) =>
                      afterMenu(() => toggleList(editor, style as ListStyle))
                    }
                  >
                    {LIST_STYLES.map(({ style, label, icon: Icon }) => (
                      <DropdownMenuRadioItem key={style} value={style}>
                        <Icon className="text-muted-foreground" />
                        {label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipIconButton
                tooltip="Link"
                side="top"
                aria-pressed={format.link !== null}
                className={cn(
                  iconButton,
                  format.link !== null && "bg-muted text-foreground",
                )}
                onClick={() => {
                  setDraft(format.link ?? "");
                  setMode("link");
                }}
              >
                <LinkIcon />
              </TooltipIconButton>
            </>
          )}
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
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a comment"
            aria-label="Comment"
            className={fieldInput}
          />
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            Comment
          </Button>
        </form>
      )}

      {mode === "link" && (
        <form onSubmit={applyLink} className="flex w-96 items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="https://example.com"
            aria-label="Link address"
            className={fieldInput}
          />
          {format.link !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeLink}
            >
              Remove
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            Apply
          </Button>
        </form>
      )}
    </div>,
    document.body,
  );
}
