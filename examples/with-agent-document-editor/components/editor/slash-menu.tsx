"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import type { LexicalEditor, TextNode } from "lexical";
import { MessageSquareIcon, MinusIcon, type LucideIcon } from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useWorkspace } from "@/components/workspace-context";
import { cn } from "@/lib/utils";
import {
  insertDivider,
  insertList,
  LIST_STYLES,
  setTextStyle,
  TEXT_STYLES,
} from "./editor-commands";

type Insert = {
  label: string;
  group: string;
  icon: LucideIcon;
  keywords: string;
  run: (editor: LexicalEditor) => void;
};

class SlashOption extends MenuOption {
  readonly insert: Insert;

  constructor(insert: Insert) {
    super(insert.label);
    this.insert = insert;
  }
}

const KEYWORDS: Record<string, string> = {
  paragraph: "paragraph plain body",
  h1: "title h1 large",
  h2: "subtitle h2 medium",
  h3: "h3 small",
  quote: "blockquote citation",
  bullet: "unordered ul points",
  number: "ordered ol steps",
};

export function SlashMenu() {
  const [editor] = useLexicalComposerContext();
  const { openChat } = useWorkspace();
  const [query, setQuery] = useState<string | null>(null);
  const triggerFn = useBasicTypeaheadTriggerMatch("/", { minLength: 0 });

  const options = useMemo(() => {
    const inserts: Insert[] = [
      ...TEXT_STYLES.map(({ style, label, icon }) => ({
        label,
        group: "Blocks",
        icon,
        keywords: KEYWORDS[style] ?? "",
        run: (target: LexicalEditor) => setTextStyle(target, style),
      })),
      ...LIST_STYLES.map(({ style, label, icon }) => ({
        label,
        group: "Blocks",
        icon,
        keywords: KEYWORDS[style] ?? "",
        run: (target: LexicalEditor) => {
          insertList(target, style);
        },
      })),
      {
        label: "Divider",
        group: "Blocks",
        icon: MinusIcon,
        keywords: "horizontal rule line separator hr",
        run: (target) => {
          insertDivider(target);
        },
      },
      {
        label: "Ask the assistant",
        group: "Assistant",
        icon: MessageSquareIcon,
        keywords: "ai chat write generate",
        run: openChat,
      },
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
  }, [query, openChat]);

  const onSelectOption = useCallback(
    (option: SlashOption, typed: TextNode | null, closeMenu: () => void) => {
      typed?.remove();
      closeMenu();
      // The menu calls this from inside its own editor update, and an insert
      // starts updates of its own, so it waits for this one to finish.
      setTimeout(() => option.insert.run(editor), 0);
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashOption>
      onQueryChange={setQuery}
      onSelectOption={onSelectOption}
      triggerFn={triggerFn}
      options={options}
      anchorClassName="z-50"
      menuRenderFn={(
        anchor,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) =>
        anchor.current && options.length > 0
          ? createPortal(
              <ul
                role="listbox"
                aria-label="Insert"
                className="bg-popover text-popover-foreground ring-foreground/10 animate-in fade-in zoom-in-95 max-h-96 w-60 overflow-y-auto rounded-[10px] p-1.5 text-sm shadow-lg ring-1 duration-100 motion-reduce:animate-none"
              >
                {options.map((option, index) => {
                  const { label, group, icon: Icon } = option.insert;
                  const startsGroup =
                    group !== options[index - 1]?.insert.group;
                  return (
                    <Fragment key={option.key}>
                      {startsGroup && (
                        <li
                          role="presentation"
                          className={cn(
                            "text-muted-foreground px-2 pt-1.5 pb-1 text-xs",
                            index > 0 &&
                              "border-foreground/10 mt-1.5 border-t pt-2.5",
                          )}
                        >
                          {group}
                        </li>
                      )}
                      <li
                        role="option"
                        // Lexical points the editor's aria-activedescendant at this id.
                        id={`typeahead-item-${index}`}
                        aria-selected={selectedIndex === index}
                        tabIndex={-1}
                        ref={option.setRefElement}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setHighlightedIndex(index);
                          selectOptionAndCleanUp(option);
                        }}
                        className={cn(
                          "flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 outline-none select-none",
                          selectedIndex === index && "bg-muted",
                        )}
                      >
                        <Icon className="text-muted-foreground size-4 shrink-0" />
                        {label}
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
