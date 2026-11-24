"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $findCellNode,
  $insertTableColumnAtNode,
  $insertTableRowAtNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  $isTableSelection,
  $moveTableColumn,
  $moveTableRow,
  type TableCellNode,
} from "@lexical/table";
import {
  $createParagraphNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_DOWN_COMMAND,
  type NodeKey,
} from "lexical";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useEditorAnchor, useEditorScroller, useIsEditable } from "./editor";
import {
  Icon,
  icons,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Tooltip,
  type Glyph,
} from "./ui";

type Axis = "row" | "column";

type Action =
  | "row-above"
  | "row-below"
  | "row-up"
  | "row-down"
  | "row-delete"
  | "column-left"
  | "column-right"
  | "column-move-left"
  | "column-move-right"
  | "column-delete";

/** The cell the handles belong to, and where it sits in its table. */
type Target = {
  cell: NodeKey;
  table: NodeKey;
  row: number;
  column: number;
  rows: number;
  columns: number;
};

type MenuSpec = {
  name: string;
  /** The key that opens the menu from a cell, with Alt and Shift held. */
  code: string;
  shortcut: string;
  items: readonly {
    action: Action;
    label: string;
    icon: Glyph;
    blocked?: (target: Target) => boolean;
  }[];
  remove: { action: Action; label: string; count: "rows" | "columns" };
};

const AXES = ["column", "row"] as const;

const MENUS: Record<Axis, MenuSpec> = {
  row: {
    name: "Row menu",
    code: "KeyR",
    shortcut: "Alt+Shift+R",
    items: [
      { action: "row-above", label: "Insert row above", icon: icons.rowAbove },
      {
        action: "row-below",
        label: "Insert row below",
        icon: icons.insertBelow,
      },
      {
        action: "row-up",
        label: "Move row up",
        icon: icons.arrowUp,
        blocked: (target) => target.row === 0,
      },
      {
        action: "row-down",
        label: "Move row down",
        icon: icons.arrowDown,
        blocked: (target) => target.row === target.rows - 1,
      },
    ],
    remove: { action: "row-delete", label: "Delete row", count: "rows" },
  },
  column: {
    name: "Column menu",
    code: "KeyC",
    shortcut: "Alt+Shift+C",
    items: [
      {
        action: "column-left",
        label: "Insert column left",
        icon: icons.columnLeft,
      },
      {
        action: "column-right",
        label: "Insert column right",
        icon: icons.columnRight,
      },
      {
        action: "column-move-left",
        label: "Move column left",
        icon: icons.arrowLeft,
        blocked: (target) => target.column === 0,
      },
      {
        action: "column-move-right",
        label: "Move column right",
        icon: icons.arrowRight,
        blocked: (target) => target.column === target.columns - 1,
      },
    ],
    remove: {
      action: "column-delete",
      label: "Delete column",
      count: "columns",
    },
  },
};

/** The room the block grip takes at the left edge of a narrow page. */
const GRIP_ROOM = 20;

const $targetOf = (key: NodeKey | null): Target | null => {
  const cell = key ? $getNodeByKey(key) : null;
  if (!$isTableCellNode(cell)) return null;
  const row = cell.getParent();
  const table = row?.getParent();
  if (!$isTableRowNode(row) || !$isTableNode(table)) return null;
  return {
    cell: cell.getKey(),
    table: table.getKey(),
    row: row.getIndexWithinParent(),
    column: cell.getIndexWithinParent(),
    rows: table.getChildrenSize(),
    columns: row.getChildrenSize(),
  };
};

const $caretCellKey = (): NodeKey | null => {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) && !$isTableSelection(selection)) {
    return null;
  }
  return $findCellNode(selection.anchor.getNode())?.getKey() ?? null;
};

// Each case leaves the caret in the row or column it acted on. Deleting the
// last row or column takes the table with it.
function $apply(action: Action, cell: TableCellNode) {
  const row = cell.getParent();
  const table = row?.getParent();
  if (!$isTableRowNode(row) || !$isTableNode(table)) return;
  const rowIndex = row.getIndexWithinParent();
  const columnIndex = cell.getIndexWithinParent();

  switch (action) {
    case "row-above":
    case "row-below": {
      const added = $insertTableRowAtNode(cell, action === "row-below");
      const first = added?.getChildAtIndex(columnIndex);
      if ($isTableCellNode(first)) first.selectStart();
      return;
    }
    case "row-up":
    case "row-down":
      $moveTableRow(table, rowIndex, rowIndex + (action === "row-up" ? -1 : 1));
      cell.selectStart();
      return;
    case "row-delete":
      cell.selectStart();
      $deleteTableRowAtSelection();
      return;
    case "column-left":
    case "column-right": {
      const after = action === "column-right";
      $insertTableColumnAtNode(cell, after, false);
      const added = after ? cell.getNextSibling() : cell.getPreviousSibling();
      if ($isTableCellNode(added)) added.selectStart();
      return;
    }
    case "column-move-left":
    case "column-move-right":
      $moveTableColumn(
        table,
        columnIndex,
        columnIndex + (action === "column-move-left" ? -1 : 1),
      );
      cell.selectStart();
      return;
    case "column-delete":
      cell.selectStart();
      $deleteTableColumnAtSelection();
      return;
  }
}

const handleClass =
  "bg-background text-muted-foreground border-border hover:bg-accent hover:border-ring hover:text-foreground focus-visible:border-ring data-popup-open:bg-accent data-popup-open:border-ring data-popup-open:text-foreground relative flex items-center justify-center rounded-full border opacity-0 outline-none transition-[opacity,background-color,border-color,color] duration-150 before:absolute focus-visible:opacity-100 data-popup-open:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100";

const axisClass: Record<Axis, string> = {
  row: "h-6 w-3 before:-inset-y-1 before:-right-2 before:left-0 pointer-coarse:before:-inset-y-1.5 pointer-coarse:before:-right-4",
  column:
    "h-3 w-6 before:-inset-x-1 before:-top-2 before:-bottom-1 pointer-coarse:before:-inset-x-1.5 pointer-coarse:before:-top-4 pointer-coarse:before:-bottom-2",
};

function Handle({
  axis,
  label,
  shown,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  axis: Axis;
  label: string;
  shown: boolean;
}) {
  return (
    <Tooltip label={label} side={axis === "row" ? "left" : "top"}>
      <button
        type="button"
        aria-label={label}
        className={cn(
          handleClass,
          axisClass[axis],
          shown
            ? "opacity-100"
            : "pointer-events-none focus-visible:pointer-events-auto pointer-coarse:pointer-events-auto",
          className,
        )}
        {...props}
      >
        <Icon
          {...(axis === "row" ? icons.moreVertical : icons.more)}
          strokeWidth={2}
          className="size-3"
        />
      </button>
    </Tooltip>
  );
}

type Keys = {
  /** The cell the handles stay with while one is focused or its menu is open. */
  held: NodeKey | null;
  hover: NodeKey | null;
  caret: NodeKey | null;
  /** Whether the keyboard is in the page. */
  focused: boolean;
};

type View = {
  target: Target | null;
  /** The pointer or the keyboard is on the table, so the handles show. */
  engaged: boolean;
};

const IDLE: View = { target: null, engaged: false };

/**
 * The handles on a table: one on the top edge of a column and one on the left
 * edge of a row, each with a menu that inserts, moves and deletes. They follow
 * the cell under the pointer, or the cell that holds the caret.
 */
export function TableControls() {
  const [editor] = useLexicalComposerContext();
  const anchor = useEditorAnchor();
  const scroller = useEditorScroller();
  const editable = useIsEditable();

  const [view, setView] = useState(IDLE);
  const [open, setOpen] = useState<Axis | null>(null);

  const keys = useRef<Keys>({
    held: null,
    hover: null,
    caret: null,
    focused: false,
  });
  const target = useRef<Target | null>(null);
  const ringed = useRef<HTMLElement | null>(null);
  const slots = useRef<Record<Axis, HTMLDivElement | null>>({
    row: null,
    column: null,
  });
  const openRef = useRef<Axis | null>(null);
  const acted = useRef(false);
  // A menu is fading out after its action: the handles wait where they were.
  const settling = useRef(false);

  // The handles are placed by hand, so that a layout change moves them
  // without another render.
  const measure = useCallback(() => {
    const { row, column } = slots.current;
    if (!row || !column || settling.current) return;
    const current = target.current;
    const cell = current ? editor.getElementByKey(current.cell) : null;
    const frame = current ? editor.getElementByKey(current.table) : null;
    if (!anchor || !cell || !frame) {
      row.style.visibility = "hidden";
      column.style.visibility = "hidden";
      return;
    }
    const origin = anchor.getBoundingClientRect();
    const bounds = frame.getBoundingClientRect();
    const box = cell.getBoundingClientRect();
    const middle = box.left + box.width / 2;

    row.style.top = `${Math.round(box.top + box.height / 2 - row.offsetHeight / 2 - origin.top)}px`;
    row.style.left = `${Math.max(GRIP_ROOM, Math.round(bounds.left - row.offsetWidth / 2 - origin.left))}px`;
    row.style.visibility = "";
    column.style.top = `${Math.round(bounds.top - column.offsetHeight / 2 - origin.top)}px`;
    column.style.left = `${Math.round(middle - column.offsetWidth / 2 - origin.left)}px`;
    // A wide table scrolls sideways, and its column can be out of sight.
    column.style.visibility =
      middle < bounds.left || middle > bounds.right ? "hidden" : "";
  }, [anchor, editor]);

  const sync = useCallback(() => {
    const { held, hover, caret, focused } = keys.current;
    const next = editor.getEditorState().read((): View => {
      const engaged = $targetOf(held) ?? $targetOf(hover);
      return {
        target: engaged ?? $targetOf(caret),
        engaged: engaged !== null,
      };
    });
    target.current = next.target;
    setView((previous) =>
      JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
    );

    const ring = held ?? (focused ? caret : null);
    const cell = ring ? editor.getElementByKey(ring) : null;
    if (ringed.current !== cell) ringed.current?.removeAttribute("data-active");
    cell?.setAttribute("data-active", "");
    ringed.current = cell;
  }, [editor]);

  const set = useCallback(
    (patch: Partial<Keys>) => {
      Object.assign(keys.current, patch);
      sync();
    },
    [sync],
  );

  const show = useCallback(
    (axis: Axis | null) => {
      if (axis) {
        acted.current = false;
        set({ held: target.current?.cell ?? null });
      }
      openRef.current = axis;
      setOpen(axis);
    },
    [set],
  );

  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const onFocus = (event: FocusEvent) => {
      const to = event.type === "focusin" ? event.target : event.relatedTarget;
      set({
        focused: to instanceof Node && !!editor.getRootElement()?.contains(to),
      });
    };
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        set({ caret: editorState.read($caretCellKey) });
        measure();
      }),
      editor.registerRootListener((root, previous) => {
        previous?.removeEventListener("focusin", onFocus);
        previous?.removeEventListener("focusout", onFocus);
        root?.addEventListener("focusin", onFocus);
        root?.addEventListener("focusout", onFocus);
        set({
          caret: editor.getEditorState().read($caretCellKey),
          focused: !!root?.contains(document.activeElement),
        });
      }),
      // Typing puts the handles away, and Alt+Shift with R or C opens the
      // menu of the row or the column the caret is in.
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        (event) => {
          const axis =
            event.altKey && event.shiftKey && !event.metaKey && !event.ctrlKey
              ? AXES.find((item) => MENUS[item].code === event.code)
              : undefined;
          if (!axis) {
            if (event.key.length === 1 || event.key === "Enter") {
              set({ hover: null });
            }
            return false;
          }
          const caret = $caretCellKey();
          if (!caret) return false;
          event.preventDefault();
          set({ held: caret, hover: null });
          show(axis);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      // The assistant starting to write takes the handles away, and a menu
      // that was open with them.
      editor.registerEditableListener((writable) => {
        if (!writable) show(null);
      }),
      () => {
        ringed.current?.removeAttribute("data-active");
        ringed.current = null;
      },
    );
  }, [editor, measure, set, show]);

  useEffect(() => {
    if (!anchor) return;
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(anchor);
    anchor.addEventListener("scroll", measure, true);
    return () => {
      observer?.disconnect();
      anchor.removeEventListener("scroll", measure, true);
    };
  }, [anchor, measure]);

  useEffect(() => {
    if (!scroller) return;
    let frame = 0;
    const onHandle = (node: Node | null) =>
      !!node &&
      (!!slots.current.row?.contains(node) ||
        !!slots.current.column?.contains(node));
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || openRef.current) return;
      const over = event.target instanceof Element ? event.target : null;
      if (!over || onHandle(over)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (openRef.current) return;
        const cell = over.closest(".doc-td");
        // Between two cells, on a border, the handles stay as they are.
        if (!cell && over.closest(".doc-table-wrap")) return;
        const hover = cell
          ? editor.read(
              () => $getNearestNodeFromDOMNode(cell)?.getKey() ?? null,
            )
          : null;
        set(
          onHandle(document.activeElement) ? { hover } : { hover, held: null },
        );
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      if (!openRef.current) set({ hover: null });
    };
    scroller.addEventListener("pointermove", onMove);
    scroller.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("pointermove", onMove);
      scroller.removeEventListener("pointerleave", onLeave);
    };
  }, [editor, scroller, set]);

  if (!anchor || !editable) return null;

  const run = (action: Action) => {
    const cellKey = target.current?.cell;
    if (!cellKey) return;
    acted.current = true;
    settling.current = true;
    editor.update(() => {
      const cell = $getNodeByKey(cellKey);
      if (!$isTableCellNode(cell)) return;
      $apply(action, cell);
      const root = $getRoot();
      if (root.getChildrenSize() === 0) {
        root.append($createParagraphNode());
        root.selectStart();
      }
    });
    set({ held: null, hover: null });
  };

  const shown = view.engaged || open !== null;

  return createPortal(
    AXES.map((axis) => {
      const menu = MENUS[axis];
      const last = view.target?.[menu.remove.count] === 1;
      return (
        <div
          key={axis}
          ref={(element) => {
            slots.current[axis] = element;
          }}
          className="absolute z-10 flex"
        >
          <Menu
            open={open === axis}
            onOpenChange={(next) => show(next ? axis : null)}
            onOpenChangeComplete={(next) => {
              if (next) return;
              settling.current = false;
              measure();
            }}
          >
            <MenuTrigger
              render={
                <Handle
                  axis={axis}
                  label={menu.name}
                  shown={shown}
                  aria-keyshortcuts={menu.shortcut}
                  onFocus={() => set({ held: target.current?.cell ?? null })}
                  onBlur={() => {
                    if (!openRef.current) set({ held: null });
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" || openRef.current) return;
                    event.preventDefault();
                    editor.focus();
                  }}
                />
              }
            />
            <MenuContent
              sideOffset={6}
              className="min-w-48"
              finalFocus={() => {
                if (!acted.current) return true;
                editor.focus();
                return false;
              }}
            >
              {menu.items.map(({ action, label, icon, blocked }) => (
                <MenuItem
                  key={action}
                  disabled={!view.target || (blocked?.(view.target) ?? false)}
                  onClick={() => run(action)}
                >
                  <Icon {...icon} />
                  {label}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem destructive onClick={() => run(menu.remove.action)}>
                <Icon {...icons.delete} />
                {last ? "Delete table" : menu.remove.label}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      );
    }),
    anchor,
  );
}
