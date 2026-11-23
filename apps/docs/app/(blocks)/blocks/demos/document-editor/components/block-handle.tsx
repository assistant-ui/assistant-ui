"use client";

import { Menu as BaseMenu } from "@base-ui/react/menu";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  REDO_COMMAND,
  SKIP_DOM_SELECTION_TAG,
  UNDO_COMMAND,
  type LexicalEditor,
  type NodeKey,
} from "lexical";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  BLOCK_LABELS,
  isListType,
  type BlockType,
  type TextBlockType,
} from "../lib/document";
import {
  $blockKeyOf,
  $blockTypeOf,
  $collectBlockNodes,
  deleteBlock,
  getBlockLink,
  idsOf,
  insertBlock,
  moveBlock,
  saveOpenPage,
  turnBlockInto,
  useEditorAnchor,
  useEditorScroller,
  useIsEditable,
} from "./editor";
import { TEXT_BLOCKS } from "./selection-toolbar";
import {
  focusBorder,
  Icon,
  icons,
  MenuCheckboxItem,
  MenuItem,
  MenuSeparator,
  menuSurfaceClass,
  popupMotion,
  SubMenu,
  SubMenuContent,
  SubMenuTrigger,
} from "./ui";

const GRIP_WIDTH = 18;
const GRIP_HEIGHT = 24;
const GRIP_GAP = 6;
/** How far a press travels before it is a drag and not a click. */
const DRAG_START = 4;
/** How far from a block the pointer still counts as beside it. */
const REACH = 16;
/** The band at the top and bottom of the page that scrolls it during a drag. */
const SCROLL_BAND = 56;
/** How long the menu shows that the link was copied before it closes. */
const COPIED_SHOWN = 1000;

type BlockBox = { key: NodeKey; element: HTMLElement; rect: DOMRect };
type Drop = { key: NodeKey; position: "before" | "after" };
type Line = { top: number; left: number; width: number };

const readBlocks = (editor: LexicalEditor): BlockBox[] =>
  editor
    .getEditorState()
    .read(() => $collectBlockNodes().map(({ node }) => node.getKey()))
    .flatMap((key) => {
      const element = editor.getElementByKey(key);
      return element
        ? [{ key, element, rect: element.getBoundingClientRect() }]
        : [];
    });

// The block nearest a height on screen. A nested block wins over the one
// around it, because it comes later in reading order.
const blockAt = (blocks: readonly BlockBox[], y: number) => {
  let found: BlockBox | null = null;
  let nearest = REACH;
  for (const block of blocks) {
    const distance = Math.max(block.rect.top - y, y - block.rect.bottom, 0);
    if (distance <= nearest) {
      nearest = distance;
      found = block;
    }
  }
  return found;
};

const $caretBlockKey = (): NodeKey | null => {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    return $blockKeyOf(selection.anchor.getNode()) ?? null;
  }
  if ($isNodeSelection(selection)) {
    const node = selection.getNodes()[0];
    return (node && $blockKeyOf(node)) ?? null;
  }
  return null;
};

/**
 * Moves a block one place up or down. False at the end of the page. From the
 * grip the selection is not written back to the page, which would take the
 * keyboard off the grip before the next move.
 */
function shiftBlock(
  editor: LexicalEditor,
  key: NodeKey,
  direction: -1 | 1,
  fromGrip = false,
) {
  const blocks = readBlocks(editor);
  const index = blocks.findIndex((block) => block.key === key);
  const self = blocks[index];
  if (!self) return false;
  const target =
    direction === -1
      ? blocks[index - 1]
      : blocks
          .slice(index + 1)
          .find((block) => !self.element.contains(block.element));
  if (!target) return false;
  moveBlock(
    editor,
    key,
    target.key,
    direction === -1 ? "before" : "after",
    fromGrip ? { tag: SKIP_DOM_SELECTION_TAG } : undefined,
  );
  requestAnimationFrame(() => {
    editor.getElementByKey(key)?.scrollIntoView({ block: "nearest" });
  });
  return true;
}

const coarseQuery = () =>
  typeof window.matchMedia === "function"
    ? window.matchMedia("(pointer: coarse)")
    : null;

const subscribeCoarse = (onChange: () => void) => {
  const query = coarseQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
};

const useCoarsePointer = () =>
  useSyncExternalStore(
    subscribeCoarse,
    () => coarseQuery()?.matches ?? false,
    () => false,
  );

const isMoveKey = (event: {
  key: string;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
}) =>
  event.altKey &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  (event.key === "ArrowUp" || event.key === "ArrowDown");

export function BlockHandle() {
  const [editor] = useLexicalComposerContext();
  const anchor = useEditorAnchor();
  const scroller = useEditorScroller();
  const editable = useIsEditable();
  const coarse = useCoarsePointer();

  const [hoverKey, setHoverKey] = useState<NodeKey | null>(null);
  const [caretKey, setCaretKey] = useState<NodeKey | null>(null);
  // The block the grip stays with while it is focused, pressed or its menu is open.
  const [heldKey, setHeldKey] = useState<NodeKey | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [line, setLine] = useState<Line | null>(null);
  const [dragging, setDragging] = useState(false);
  const [currentType, setCurrentType] = useState<BlockType>("paragraph");
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);

  const grip = useRef<HTMLButtonElement>(null);
  const menuOpenRef = useRef(false);
  const press = useRef<{
    pointerId: number;
    x: number;
    y: number;
    key: NodeKey;
    dragging: boolean;
    element: HTMLElement | null;
  } | null>(null);
  const drop = useRef<Drop | null>(null);
  const skipClick = useRef(false);
  const acted = useRef(false);
  const copyTimer = useRef(0);
  const menuSession = useRef(0);

  const key = heldKey ?? hoverKey ?? caretKey;

  const openMenu = useCallback((open: boolean) => {
    window.clearTimeout(copyTimer.current);
    menuSession.current += 1;
    if (open) setCopied(null);
    menuOpenRef.current = open;
    setMenuOpen(open);
  }, []);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  // The grip is placed by hand, beside the first line of its block, so that
  // a layout change moves it without another render.
  const measure = useCallback(() => {
    const handle = grip.current;
    if (!handle) return;
    const element = key ? editor.getElementByKey(key) : null;
    const root = editor.getRootElement();
    if (!anchor || !element || !root) {
      handle.style.visibility = "hidden";
      return;
    }
    const origin = anchor.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const center =
      element.tagName === "HR" || Number.isNaN(lineHeight)
        ? rect.top + rect.height / 2
        : rect.top +
          (Number.parseFloat(style.paddingTop) || 0) +
          lineHeight / 2;
    const left = root.getBoundingClientRect().left - origin.left;
    handle.style.top = `${Math.round(center - origin.top - GRIP_HEIGHT / 2)}px`;
    handle.style.left = `${Math.max(0, Math.round(left - GRIP_WIDTH - GRIP_GAP))}px`;
    handle.style.visibility = "";
  }, [anchor, editor, key]);

  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    if (!anchor) return;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(anchor);
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      setCaretKey(editorState.read($caretBlockKey));
      measure();
    });
    return () => {
      observer?.disconnect();
      unregister();
    };
  }, [anchor, editor, measure]);

  useEffect(() => {
    if (!scroller || !anchor) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (press.current || menuOpenRef.current) return;
      if (grip.current?.contains(event.target as Node | null)) return;
      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = anchor.getBoundingClientRect();
        const beside = clientX >= bounds.left && clientX <= bounds.right;
        setHoverKey(
          beside ? (blockAt(readBlocks(editor), clientY)?.key ?? null) : null,
        );
        if (document.activeElement !== grip.current) setHeldKey(null);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      if (!press.current && !menuOpenRef.current) setHoverKey(null);
    };
    scroller.addEventListener("pointermove", onMove);
    scroller.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("pointermove", onMove);
      scroller.removeEventListener("pointerleave", onLeave);
    };
  }, [anchor, editor, scroller]);

  // In the page, typing puts the grip away, and Alt with an arrow moves the
  // block the caret is in.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!isMoveKey(event)) {
        if (event.key.length === 1 || event.key === "Enter") setHoverKey(null);
        return;
      }
      if (!editor.isEditable()) return;
      const caret = editor.getEditorState().read($caretBlockKey);
      if (!caret) return;
      event.preventDefault();
      shiftBlock(editor, caret, event.key === "ArrowUp" ? -1 : 1);
    };
    return editor.registerRootListener((root, previous) => {
      previous?.removeEventListener("keydown", onKeyDown);
      root?.addEventListener("keydown", onKeyDown);
    });
  }, [editor]);

  const endDrag = useCallback(
    (commit: boolean) => {
      const pressed = press.current;
      press.current = null;
      if (!pressed?.dragging) return;
      if (pressed.element) pressed.element.style.opacity = "";
      const target = drop.current;
      drop.current = null;
      setLine(null);
      setDragging(false);
      setHeldKey(null);
      if (commit && target) {
        moveBlock(editor, pressed.key, target.key, target.position);
      }
      // Back in the page, the next key press is the editor's: undo, or typing.
      editor.getRootElement()?.focus({ preventScroll: true });
    },
    [editor],
  );

  useEffect(() => {
    if (!dragging) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      endDrag(false);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [dragging, endDrag]);

  if (!anchor || !editable || !key) return null;

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || press.current) return;
    press.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      key,
      dragging: false,
      element: null,
    };
    setHeldKey(key);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pressed = press.current;
    if (pressed?.pointerId !== event.pointerId) return;
    const { clientX, clientY } = event;
    if (!pressed.dragging) {
      if (Math.hypot(clientX - pressed.x, clientY - pressed.y) < DRAG_START) {
        return;
      }
      pressed.dragging = true;
      pressed.element = editor.getElementByKey(pressed.key);
      if (pressed.element) pressed.element.style.opacity = "0.4";
      openMenu(false);
      setDragging(true);
    }

    const root = editor.getRootElement();
    if (!root) return;
    if (scroller) {
      const bounds = scroller.getBoundingClientRect();
      if (clientY < bounds.top + SCROLL_BAND) scroller.scrollBy(0, -14);
      else if (clientY > bounds.bottom - SCROLL_BAND) scroller.scrollBy(0, 14);
    }

    const blocks = readBlocks(editor);
    const self = pressed.element;
    const target =
      blockAt(blocks, clientY) ??
      (clientY < (blocks[0]?.rect.top ?? 0)
        ? blocks[0]
        : blocks[blocks.length - 1]);
    const index = target ? blocks.indexOf(target) : -1;
    if (!target || !self || self.contains(target.element)) {
      drop.current = null;
      setLine(null);
      return;
    }
    const before = clientY < target.rect.top + target.rect.height / 2;
    const neighbor = blocks[index + (before ? -1 : 1)];
    const edge = before ? target.rect.top : target.rect.bottom;
    const y =
      neighbor && !neighbor.element.contains(target.element)
        ? (edge + (before ? neighbor.rect.bottom : neighbor.rect.top)) / 2
        : edge;
    const origin = anchor.getBoundingClientRect();
    const column = root.getBoundingClientRect();
    drop.current = { key: target.key, position: before ? "before" : "after" };
    setLine({
      top: Math.round(y - origin.top - 1),
      left: Math.round(column.left - origin.left),
      width: Math.round(column.width),
    });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (press.current?.pointerId !== event.pointerId) return;
    if (!press.current.dragging) {
      press.current = null;
      return;
    }
    // The click that ends a drag is not a click on the grip.
    skipClick.current = true;
    setTimeout(() => {
      skipClick.current = false;
    }, 0);
    endDrag(true);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (press.current?.pointerId === event.pointerId) endDrag(false);
  };

  const typeOf = () =>
    editor.getEditorState().read((): BlockType => {
      const node = $getNodeByKey(key);
      return node ? $blockTypeOf(node) : "paragraph";
    });

  const onClick = () => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    acted.current = false;
    setHeldKey(key);
    setCurrentType(typeOf());
    openMenu(!menuOpenRef.current);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      editor.dispatchCommand(
        event.shiftKey ? REDO_COMMAND : UNDO_COMMAND,
        undefined,
      );
      return;
    }
    if (!isMoveKey(event)) return;
    event.preventDefault();
    shiftBlock(editor, key, event.key === "ArrowUp" ? -1 : 1, true);
  };

  const turnInto = (type: TextBlockType) => {
    acted.current = true;
    setHeldKey(null);
    setHoverKey(null);
    turnBlockInto(editor, key, type);
    editor.getRootElement()?.focus({ preventScroll: true });
  };

  const insertBelow = () => {
    acted.current = true;
    const type = typeOf();
    setHeldKey(null);
    setHoverKey(null);
    insertBlock(editor, isListType(type) ? type : "paragraph", {
      afterKey: key,
    });
  };

  const copyLink = async () => {
    // A block gets its id, and the store its copy of the block, when the page
    // is saved. The link needs both.
    saveOpenPage();
    const id = idsOf(editor).get(key);
    const session = menuSession.current;
    let result: "done" | "failed" = id ? "done" : "failed";
    try {
      if (id) await navigator.clipboard.writeText(getBlockLink(id));
    } catch {
      result = "failed";
    }
    if (session !== menuSession.current) return;
    setCopied(result);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => openMenu(false), COPIED_SHOWN);
  };

  const remove = () => {
    acted.current = true;
    setHeldKey(null);
    setHoverKey(null);
    deleteBlock(editor, key);
    editor.getRootElement()?.focus({ preventScroll: true });
  };

  const shown = coarse || dragging || heldKey !== null || hoverKey !== null;

  return createPortal(
    <>
      <button
        ref={grip}
        type="button"
        aria-label="Block menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
        data-dragging={dragging || undefined}
        className={cn(
          focusBorder,
          "text-muted-foreground/70 hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground absolute z-10 flex h-6 w-4.5 cursor-grab touch-none items-center justify-center rounded-md opacity-0 transition-[opacity,background-color,color] duration-150 select-none focus-visible:opacity-100 data-dragging:cursor-grabbing motion-reduce:transition-none",
          "pointer-coarse:before:absolute pointer-coarse:before:-inset-y-1.5 pointer-coarse:before:right-0 pointer-coarse:before:-left-3",
          shown && "opacity-100",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onFocus={() => setHeldKey(key)}
        onBlur={() => {
          if (!menuOpenRef.current && !press.current) setHeldKey(null);
        }}
      >
        <Icon {...icons.grip} />
      </button>
      {line ? (
        <div
          aria-hidden
          style={{ top: line.top, left: line.left, width: line.width }}
          className="bg-foreground/45 pointer-events-none absolute z-10 h-0.5 rounded-full"
        />
      ) : null}
      <span role="status" className="sr-only">
        {copied === "done"
          ? "Link copied"
          : copied === "failed"
            ? "Could not copy the link"
            : null}
      </span>
      <BaseMenu.Root
        open={menuOpen}
        modal={false}
        onOpenChange={(open, details) => {
          // A press on the grip closes the menu here, and the click that
          // follows would open it again.
          if (
            !open &&
            details.event.target instanceof Node &&
            grip.current?.contains(details.event.target)
          ) {
            skipClick.current = true;
            setTimeout(() => {
              skipClick.current = false;
            }, 400);
          }
          openMenu(open);
        }}
      >
        <BaseMenu.Portal>
          <BaseMenu.Positioner
            anchor={grip}
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={8}
            className="z-50 outline-none"
          >
            <BaseMenu.Popup
              aria-label="Block"
              finalFocus={() => (acted.current ? false : grip.current)}
              className={cn(menuSurfaceClass, popupMotion)}
            >
              <SubMenu>
                <SubMenuTrigger
                  disabled={
                    currentType === "divider" || currentType === "table"
                  }
                >
                  <Icon {...icons.turnInto} />
                  Turn into
                </SubMenuTrigger>
                <SubMenuContent
                  className="min-w-48"
                  finalFocus={() => !acted.current}
                >
                  {TEXT_BLOCKS.map(({ type, icon }) => (
                    <MenuCheckboxItem
                      key={type}
                      checked={currentType === type}
                      closeOnClick
                      onCheckedChange={() => turnInto(type)}
                    >
                      <Icon {...icon} />
                      {BLOCK_LABELS[type]}
                    </MenuCheckboxItem>
                  ))}
                </SubMenuContent>
              </SubMenu>
              <MenuItem onClick={insertBelow}>
                <Icon {...icons.insertBelow} />
                Insert below
              </MenuItem>
              <MenuItem closeOnClick={false} onClick={() => void copyLink()}>
                <Icon {...(copied === "done" ? icons.tick : icons.link)} />
                {copied === "done"
                  ? "Link copied"
                  : copied === "failed"
                    ? "Could not copy"
                    : "Copy link"}
              </MenuItem>
              <MenuSeparator />
              <MenuItem destructive onClick={remove}>
                <Icon {...icons.delete} />
                Delete
              </MenuItem>
            </BaseMenu.Popup>
          </BaseMenu.Positioner>
        </BaseMenu.Portal>
      </BaseMenu.Root>
    </>,
    anchor,
  );
}
