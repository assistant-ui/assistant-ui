"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  type MenuTextMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import {
  $createTextNode,
  $insertNodes,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
  type TextNode,
} from "lexical";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  BLOCK_LABELS,
  documentActions,
  pageTree,
  useCurrentPage,
  useDocumentStore,
  type BlockType,
  type Page,
} from "../lib/document";
import { $createPageLinkNode, insertBlock } from "./editor";
import {
  Icon,
  icons,
  menuRowClass,
  menuSurfaceClass,
  PageGlyph,
  text,
  type Glyph,
} from "./ui";

/** One row of a menu that opens at the caret. */
type Row = {
  label: string;
  group: string;
  icon: ReactNode;
  description?: string;
  /** Draws the label in the muted color, as for a page with no title. */
  muted?: boolean;
};

class RowOption<T extends Row> extends MenuOption {
  readonly row: T;

  constructor(key: string, row: T) {
    super(key);
    this.row = row;
  }
}

type Insert = Row & {
  keywords: string;
  run: (editor: LexicalEditor) => void;
  /** Leaves the editor, so it waits for the menu's own editor update to end. */
  leaves?: true;
};

type PageRow = Row & { page: Page };

const BASIC: readonly {
  type: BlockType;
  icon: Glyph;
  description: string;
  keywords: string;
}[] = [
  {
    type: "paragraph",
    icon: icons.text,
    description: "Plain writing",
    keywords: "paragraph plain body",
  },
  {
    type: "h1",
    icon: icons.h1,
    description: "Large section heading",
    keywords: "title h1 large #",
  },
  {
    type: "h2",
    icon: icons.h2,
    description: "Medium section heading",
    keywords: "subtitle h2 medium ##",
  },
  {
    type: "h3",
    icon: icons.h3,
    description: "Small section heading",
    keywords: "h3 small ###",
  },
  {
    type: "check",
    icon: icons.check,
    description: "Tasks you can tick off",
    keywords: "todo to-do task checkbox",
  },
  {
    type: "bullet",
    icon: icons.bullet,
    description: "A simple list",
    keywords: "unordered ul points",
  },
  {
    type: "numbered",
    icon: icons.numbered,
    description: "A list in order",
    keywords: "ordered ol steps number",
  },
  {
    type: "quote",
    icon: icons.quote,
    description: "A passage set apart",
    keywords: "blockquote citation",
  },
  {
    type: "table",
    icon: icons.table,
    description: "Rows and columns",
    keywords: "grid rows columns cells",
  },
  {
    type: "divider",
    icon: icons.divider,
    description: "A line between sections",
    keywords: "horizontal rule line separator hr",
  },
];

const matcher =
  (pattern: RegExp) =>
  (typed: string): MenuTextMatch | null => {
    const match = pattern.exec(typed);
    const replaceableString = match?.[1];
    if (!match || replaceableString === undefined) return null;
    return {
      leadOffset: match.index + match[0].length - replaceableString.length,
      matchingString: match[2] ?? "",
      replaceableString,
    };
  };

// A "/" at the start of a line or after a space, then what was typed after
// it. Spaces are let through so that "/heading 1" finds its row.
const matchSlash = matcher(/(?:^|\s)(\/((?:[^\s/]+(?: |$)){0,3}))$/);

// An "@" in the same places, then the words of a page title.
const matchAt = matcher(/(?:^|\s)(@((?:[^\s@]+(?: |$)){0,4}))$/);

const EDGE = 12;
const SHORTEST = 176;
const TALLEST = 352;
/** The height the pills take at the top of the page. */
const TOP_BAR = 56;

const clampHeight = (room: number) =>
  Math.min(TALLEST, Math.max(SHORTEST, room));

// The room the list has, so it never runs off the screen. Lexical opens it
// under the caret, and above it when it is too tall for the room below and
// fits between the caret and the top of the page content.
const roomAtCaret = (editor: LexicalEditor) => {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return TALLEST;
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  if (rect.height === 0) return TALLEST;
  const below = window.innerHeight - rect.bottom - EDGE;
  const contentTop =
    editor.getRootElement()?.getBoundingClientRect().top ?? rect.top;
  const above = Math.min(
    rect.top - EDGE - TOP_BAR,
    rect.top - contentTop - rect.height - EDGE,
  );
  return clampHeight(below >= 240 || below >= above ? below : above);
};

/** The rows of a menu at the caret, in groups. Lexical owns its keyboard. */
function TypeaheadList<T extends Row>({
  options,
  selectedIndex,
  maxHeight,
  className,
  onHighlight,
  onSelect,
}: {
  options: readonly RowOption<T>[];
  selectedIndex: number | null;
  maxHeight: number;
  className: string;
  onHighlight: (index: number) => void;
  onSelect: (option: RowOption<T>) => void;
}) {
  return (
    <ul
      // Lexical makes the element around this list the listbox.
      role="presentation"
      style={{ maxHeight }}
      className={cn(
        menuSurfaceClass,
        "max-w-[calc(100vw-1.5rem)] overflow-y-auto",
        className,
      )}
    >
      {options.map((option, index) => {
        const { label, description, group, icon, muted } = option.row;
        const startsGroup = group !== options[index - 1]?.row.group;
        return (
          <Fragment key={option.key}>
            {startsGroup && index > 0 ? (
              <li
                role="presentation"
                className="bg-border/60 mx-2 my-1 h-px shrink-0"
              />
            ) : null}
            {startsGroup ? (
              <li
                role="presentation"
                className={cn(
                  "text-muted-foreground flex h-7 shrink-0 items-center px-2",
                  text.small,
                )}
              >
                {group}
              </li>
            ) : null}
            <li
              role="option"
              // Lexical points the editor's aria-activedescendant at this id.
              id={`typeahead-item-${index}`}
              aria-selected={selectedIndex === index}
              tabIndex={-1}
              ref={option.setRefElement}
              onMouseMove={() => {
                if (selectedIndex !== index) onHighlight(index);
              }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onHighlight(index);
                onSelect(option);
              }}
              className={cn(menuRowClass, "aria-selected:bg-accent")}
            >
              {icon}
              <span
                className={cn(
                  description ? "shrink-0" : "min-w-0 truncate",
                  muted && "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {description ? (
                <span
                  className={cn(
                    "text-muted-foreground ms-auto truncate ps-3",
                    text.bodySm,
                  )}
                >
                  {description}
                </span>
              ) : null}
            </li>
          </Fragment>
        );
      })}
    </ul>
  );
}

/** The menu that typing "/" opens: the blocks, a subpage and the assistant. */
function BlockMenu() {
  const [editor] = useLexicalComposerContext();
  const page = useCurrentPage();
  const [query, setQuery] = useState<string | null>(null);
  const [maxHeight, setMaxHeight] = useState(TALLEST);

  const options = useMemo(() => {
    const inserts: (Insert & { id: string })[] = [
      {
        id: "assistant",
        label: "Ask the assistant",
        description: "Write or edit this page",
        group: "Assistant",
        icon: <Icon {...icons.assistant} />,
        keywords: "ai chat write generate edit",
        run: () => documentActions.askAssistant(),
        leaves: true,
      },
      {
        id: "page",
        label: "Page",
        description: "A new page inside this one",
        group: "Pages",
        icon: <Icon {...icons.pageAdd} />,
        keywords: "subpage sub-page new nested",
        run: () => {
          documentActions.addPage(page.id);
        },
        leaves: true,
      },
      ...BASIC.map(({ type, icon, description, keywords }) => ({
        id: type,
        label: BLOCK_LABELS[type],
        description,
        group: "Basic",
        icon: <Icon {...icon} />,
        keywords,
        run: (target: LexicalEditor) => insertBlock(target, type),
      })),
    ];
    const search = query?.trim().toLowerCase() ?? "";
    return inserts
      .filter(
        (insert) =>
          !search ||
          insert.label.toLowerCase().includes(search) ||
          insert.keywords.includes(search),
      )
      .map(({ id, ...insert }) => new RowOption<Insert>(id, insert));
  }, [query, page.id]);

  const onSelectOption = useCallback(
    (
      option: RowOption<Insert>,
      typed: TextNode | null,
      closeMenu: () => void,
    ) => {
      typed?.remove();
      closeMenu();
      const { leaves, run } = option.row;
      // The menu calls this inside its own editor update. A block insert
      // queues behind that update, so it lands before the next key typed.
      if (leaves) setTimeout(() => run(editor), 0);
      else run(editor);
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<RowOption<Insert>>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      onOpen={() => setMaxHeight(roomAtCaret(editor))}
      triggerFn={matchSlash}
      options={options}
      anchorClassName="z-50"
      // Lexical passes the arrow and Escape keys on to the editor for an empty
      // list only when the menu has its default renderer.
      {...(options.length > 0
        ? {
            menuRenderFn: (
              anchor,
              { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
            ) =>
              anchor.current
                ? createPortal(
                    <TypeaheadList
                      options={options}
                      selectedIndex={selectedIndex}
                      maxHeight={maxHeight}
                      className="w-80"
                      onHighlight={setHighlightedIndex}
                      onSelect={selectOptionAndCleanUp}
                    />,
                    anchor.current,
                  )
                : null,
          }
        : {})}
    />
  );
}

/**
 * The menu that typing "@" opens: the other pages. Picking one puts a link to
 * it in the text, which opens that page.
 */
function PageMenu() {
  const [editor] = useLexicalComposerContext();
  const pages = useDocumentStore((state) => state.pages);
  const current = useCurrentPage();
  const [query, setQuery] = useState<string | null>(null);
  const [maxHeight, setMaxHeight] = useState(TALLEST);

  const options = useMemo(() => {
    if (query === null) return [];
    const search = query.trim().toLowerCase();
    return pageTree(pages)
      .filter(
        ({ page }) =>
          page.id !== current.id && page.title.toLowerCase().includes(search),
      )
      .map(
        ({ page }) =>
          new RowOption<PageRow>(page.id, {
            label: page.title || "Untitled",
            group: "Link to page",
            icon: <PageGlyph icon={page.icon} />,
            muted: !page.title,
            page,
          }),
      );
  }, [query, pages, current.id]);

  const onSelectOption = useCallback(
    (
      option: RowOption<PageRow>,
      typed: TextNode | null,
      closeMenu: () => void,
    ) => {
      const { page } = option.row;
      const link = $createPageLinkNode(page.id, page.title);
      if (typed) typed.replace(link);
      else $insertNodes([link]);
      const next = link.getNextSibling();
      if ($isTextNode(next) && /^\s/.test(next.getTextContent())) {
        next.select(1, 1);
      } else {
        const space = $createTextNode(" ");
        link.insertAfter(space);
        space.select();
      }
      closeMenu();
    },
    [],
  );

  // Enter on a focused link is that button's own click. Without this the
  // editor takes the key and breaks the line at the caret.
  useEffect(
    () =>
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) =>
          event?.target instanceof Element &&
          event.target.closest("button.doc-page-link-chip") !== null,
        COMMAND_PRIORITY_HIGH,
      ),
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<RowOption<PageRow>>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      onOpen={() => setMaxHeight(roomAtCaret(editor))}
      triggerFn={matchAt}
      options={options}
      anchorClassName="z-50"
      {...(options.length > 0
        ? {
            menuRenderFn: (
              anchor,
              { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
            ) =>
              anchor.current
                ? createPortal(
                    <TypeaheadList
                      options={options}
                      selectedIndex={selectedIndex}
                      maxHeight={maxHeight}
                      className="w-64"
                      onHighlight={setHighlightedIndex}
                      onSelect={selectOptionAndCleanUp}
                    />,
                    anchor.current,
                  )
                : null,
          }
        : {})}
    />
  );
}

/** The menus that open at the caret: "/" for blocks and "@" for pages. */
export function SlashMenu() {
  return (
    <>
      <BlockMenu />
      <PageMenu />
    </>
  );
}
