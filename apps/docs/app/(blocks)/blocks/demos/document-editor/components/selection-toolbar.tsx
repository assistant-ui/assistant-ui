"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type TextFormatType,
} from "lexical";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { BLOCK_LABELS, useCurrentPage, type BlockType } from "../lib/document";
import {
  commentOnSelection,
  setBlockType,
  useEditorAnchor,
  useEditorScroller,
  useIsEditable,
  useSelectionFormat,
  type SelectionFormat,
} from "./editor";
import {
  denseGlass,
  Icon,
  IconButton,
  icons,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuTrigger,
  Pill,
  textButtonClass,
  type Glyph,
} from "./ui";

const EDGE = 8;
const GAP = 8;

/** Where the selection is on screen. */
type Position = { top: number; bottom: number; center: number };

const FORMATS: readonly {
  format: TextFormatType;
  flag: Exclude<keyof SelectionFormat, "block">;
  label: string;
  icon: Glyph;
}[] = [
  { format: "bold", flag: "bold", label: "Bold", icon: icons.bold },
  { format: "italic", flag: "italic", label: "Italic", icon: icons.italic },
  {
    format: "underline",
    flag: "underline",
    label: "Underline",
    icon: icons.underline,
  },
  {
    format: "strikethrough",
    flag: "strike",
    label: "Strikethrough",
    icon: icons.strike,
  },
  { format: "code", flag: "code", label: "Code", icon: icons.code },
];

type TextBlockType = Exclude<BlockType, "divider">;

const BLOCKS: readonly { type: TextBlockType; icon: Glyph }[] = [
  { type: "paragraph", icon: icons.text },
  { type: "h1", icon: icons.h1 },
  { type: "h2", icon: icons.h2 },
  { type: "h3", icon: icons.h3 },
  { type: "check", icon: icons.check },
  { type: "bullet", icon: icons.bullet },
  { type: "numbered", icon: icons.numbered },
  { type: "quote", icon: icons.quote },
];

const Separator = () => (
  <span aria-hidden className="bg-border mx-1 h-4 w-px shrink-0" />
);

const prefersBelow = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse)").matches;

export function SelectionToolbar() {
  const [editor] = useLexicalComposerContext();
  const page = useCurrentPage();
  const anchor = useEditorAnchor();
  const scroller = useEditorScroller();
  const format = useSelectionFormat();
  const editable = useIsEditable();

  const [position, setPosition] = useState<Position | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const toolbar = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const menuOpenRef = useRef(false);
  // Closed by hand: stays away until the selection is let go.
  const quiet = useRef(false);

  const place = useCallback(
    (selected: Range | null): Position | null => {
      if (!selected) return null;
      const rect = selected.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;
      const bounds = scroller?.getBoundingClientRect();
      if (bounds && (rect.bottom < bounds.top || rect.top > bounds.bottom)) {
        return null;
      }
      return {
        top: Math.max(rect.top, bounds?.top ?? 0),
        bottom: Math.min(rect.bottom, bounds?.bottom ?? window.innerHeight),
        center: rect.left + rect.width / 2,
      };
    },
    [scroller],
  );

  const readSelection = useCallback((): Range | null => {
    const root = editor.getRootElement();
    const selection = window.getSelection();
    if (!root || !selection || selection.isCollapsed || !selection.rangeCount) {
      return null;
    }
    const selected = selection.getRangeAt(0);
    if (!root.contains(selected.commonAncestorContainer)) return null;
    if (!selection.toString().trim()) return null;
    return selected.cloneRange();
  }, [editor]);

  const hide = useCallback(() => {
    range.current = null;
    setPosition(null);
  }, []);

  const sync = useCallback(() => {
    // The keyboard is inside the bar or its menu: the selection is still the
    // editor's, even where the browser has stopped reporting it.
    if (menuOpenRef.current) return;
    if (toolbar.current?.contains(document.activeElement)) return;
    const selected = readSelection();
    if (!selected) quiet.current = false;
    range.current = quiet.current ? null : selected;
    setPosition(place(range.current));
  }, [place, readSelection]);

  useEffect(() => {
    let dragging = false;
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    };
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (toolbar.current?.contains(target)) return;
      if (target?.closest('[role="menu"]')) return;
      dragging = true;
      quiet.current = false;
      hide();
    };
    const onMouseUp = () => {
      dragging = false;
      update();
    };
    const onSelectionChange = () => {
      if (!dragging) update();
    };
    const follow = () => setPosition(place(range.current));

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [hide, place, sync]);

  const visible = position !== null && editable && anchor !== null;
  const visibleRef = useRef(visible);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand(
          KEY_ESCAPE_COMMAND,
          () => {
            if (!visibleRef.current) return false;
            quiet.current = true;
            hide();
            return true;
          },
          COMMAND_PRIORITY_LOW,
        ),
        // Tab steps from the selected text into the bar.
        editor.registerCommand(
          KEY_TAB_COMMAND,
          (event) => {
            if (!visibleRef.current || event.shiftKey) return false;
            const first = toolbar.current?.querySelector<HTMLElement>(
              "button:not(:disabled)",
            );
            if (!first) return false;
            event.preventDefault();
            first.focus();
            return true;
          },
          COMMAND_PRIORITY_LOW,
        ),
      ),
    [editor, hide],
  );

  // Centered on the selection and kept on screen; the bar's size is only
  // known once it has rendered. Above the selection, or below with no room.
  useLayoutEffect(() => {
    const element = toolbar.current;
    if (!element || !position) return;
    const half = element.offsetWidth / 2;
    const height = element.offsetHeight;
    const left = Math.min(
      Math.max(position.center, half + EDGE),
      window.innerWidth - half - EDGE,
    );
    const above = position.top - GAP - height;
    const below = position.bottom + GAP;
    const fitsAbove = above >= EDGE;
    const fitsBelow = below + height <= window.innerHeight - EDGE;
    const top = (prefersBelow() ? !fitsBelow && fitsAbove : fitsAbove)
      ? above
      : below;
    element.style.left = `${left}px`;
    element.style.top = `${Math.max(EDGE, Math.min(top, window.innerHeight - height - EDGE))}px`;
  }, [position, visible, format.block]);

  if (!visible || !anchor) return null;

  const onMenuOpenChange = (open: boolean) => {
    menuOpenRef.current = open;
    setMenuOpen(open);
    if (!open) requestAnimationFrame(sync);
  };

  const comment = () => {
    if (!commentOnSelection(editor, page.id)) return;
    quiet.current = true;
    hide();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      quiet.current = true;
      hide();
      editor.focus();
      return;
    }
    if (event.key === "Tab" && event.shiftKey) {
      event.preventDefault();
      editor.focus();
      return;
    }
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const stops = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(
        "button:not(:disabled)",
      ),
    ];
    const next =
      stops[
        stops.indexOf(document.activeElement as HTMLElement) +
          (event.key === "ArrowRight" ? 1 : -1)
      ];
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  const current = BLOCKS.find(({ type }) => type === format.block);

  return createPortal(
    <Pill
      ref={toolbar}
      role="toolbar"
      aria-label="Format the selected text"
      className={cn(
        denseGlass,
        "fixed z-45 max-w-[calc(100vw-1rem)] -translate-x-1/2 [scrollbar-width:none] overflow-x-auto pointer-coarse:h-11",
      )}
      onMouseDown={(event) => event.preventDefault()}
      onKeyDown={onKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          requestAnimationFrame(sync);
        }
      }}
    >
      {FORMATS.map(({ format: type, flag, label, icon }) => (
        <IconButton
          key={type}
          label={label}
          icon={icon}
          side="top"
          active={format[flag]}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, type)}
        />
      ))}
      <Separator />
      <Menu open={menuOpen} onOpenChange={onMenuOpenChange}>
        <MenuTrigger
          render={
            <button
              type="button"
              aria-label={`Block type: ${BLOCK_LABELS[format.block]}`}
              className={cn(textButtonClass, "gap-1 ps-2 pe-1.5")}
            />
          }
        >
          <Icon
            {...(current?.icon ?? icons.text)}
            className="text-muted-foreground"
          />
          <span className="max-sm:hidden">{BLOCK_LABELS[format.block]}</span>
          <Icon
            {...icons.chevronDown}
            className="text-muted-foreground size-3.5"
          />
        </MenuTrigger>
        <MenuContent
          align="start"
          className="min-w-48"
          finalFocus={() => {
            editor.focus();
            return false;
          }}
        >
          {BLOCKS.map(({ type, icon }) => (
            <MenuCheckboxItem
              key={type}
              checked={format.block === type}
              closeOnClick
              onCheckedChange={() => setBlockType(editor, type)}
            >
              <Icon {...icon} />
              {BLOCK_LABELS[type]}
            </MenuCheckboxItem>
          ))}
        </MenuContent>
      </Menu>
      <Separator />
      <button
        type="button"
        aria-label="Comment"
        className={cn(textButtonClass, "ps-2")}
        onClick={comment}
      >
        <Icon {...icons.commentAdd} />
        <span className="max-sm:hidden">Comment</span>
      </button>
    </Pill>,
    anchor,
  );
}
