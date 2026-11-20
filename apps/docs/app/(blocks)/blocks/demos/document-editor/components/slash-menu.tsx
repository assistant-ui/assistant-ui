"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  type MenuTextMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import type { LexicalEditor, TextNode } from "lexical";
import { Fragment, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  BLOCK_LABELS,
  documentActions,
  useCurrentPage,
  type BlockType,
} from "../lib/document";
import { insertBlock } from "./editor";
import {
  Icon,
  icons,
  menuRowClass,
  menuSurfaceClass,
  text,
  type Glyph,
} from "./ui";

type Insert = {
  id: string;
  label: string;
  description: string;
  group: string;
  icon: Glyph;
  keywords: string;
  run: (editor: LexicalEditor) => void;
  /** Leaves the editor, so it waits for the menu's own editor update to end. */
  leaves?: true;
};

class SlashOption extends MenuOption {
  readonly insert: Insert;

  constructor(insert: Insert) {
    super(insert.id);
    this.insert = insert;
  }
}

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
    type: "divider",
    icon: icons.divider,
    description: "A line between sections",
    keywords: "horizontal rule line separator hr",
  },
];

// A "/" at the start of a line or after a space, then what was typed after
// it. Spaces are let through so that "/heading 1" finds its row.
const SLASH = /(?:^|\s)(\/((?:[^\s/]+ ?){0,3}))$/;

const matchSlash = (typed: string): MenuTextMatch | null => {
  const match = SLASH.exec(typed);
  const replaceableString = match?.[1];
  if (!match || replaceableString === undefined) return null;
  return {
    leadOffset: match.index + match[0].length - replaceableString.length,
    matchingString: match[2] ?? "",
    replaceableString,
  };
};

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

export function SlashMenu() {
  const [editor] = useLexicalComposerContext();
  const page = useCurrentPage();
  const [query, setQuery] = useState<string | null>(null);
  const [maxHeight, setMaxHeight] = useState(TALLEST);

  const options = useMemo(() => {
    const inserts: Insert[] = [
      {
        id: "assistant",
        label: "Ask the assistant",
        description: "Write or edit this page",
        group: "Assistant",
        icon: icons.assistant,
        keywords: "ai chat write generate edit",
        run: () => documentActions.askAssistant(),
        leaves: true,
      },
      {
        id: "page",
        label: "Page",
        description: "A new page inside this one",
        group: "Pages",
        icon: icons.pageAdd,
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
        icon,
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
      .map((insert) => new SlashOption(insert));
  }, [query, page.id]);

  const onSelectOption = useCallback(
    (option: SlashOption, typed: TextNode | null, closeMenu: () => void) => {
      typed?.remove();
      closeMenu();
      const { leaves, run } = option.insert;
      // The menu calls this inside its own editor update. A block insert
      // queues behind that update, so it lands before the next key typed.
      if (leaves) setTimeout(() => run(editor), 0);
      else run(editor);
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      onOpen={() => setMaxHeight(roomAtCaret(editor))}
      triggerFn={matchSlash}
      options={options}
      anchorClassName="z-50"
      menuRenderFn={(
        anchor,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) =>
        anchor.current && options.length > 0
          ? createPortal(
              <ul
                // Lexical makes the element around this list the listbox.
                role="presentation"
                style={{ maxHeight }}
                className={cn(
                  menuSurfaceClass,
                  "w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto",
                )}
              >
                {options.map((option, index) => {
                  const { label, description, group, icon } = option.insert;
                  const startsGroup =
                    group !== options[index - 1]?.insert.group;
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
                          if (selectedIndex !== index) {
                            setHighlightedIndex(index);
                          }
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setHighlightedIndex(index);
                          selectOptionAndCleanUp(option);
                        }}
                        className={cn(menuRowClass, "aria-selected:bg-accent")}
                      >
                        <Icon {...icon} />
                        <span className="shrink-0">{label}</span>
                        <span
                          className={cn(
                            "text-muted-foreground ms-auto truncate ps-3",
                            text.bodySm,
                          )}
                        >
                          {description}
                        </span>
                      </li>
                    </Fragment>
                  );
                })}
              </ul>,
              anchor.current,
            )
          : null
      }
    />
  );
}
