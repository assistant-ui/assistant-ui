"use client";

import { useMemo } from "react";
import { documentActions, pageTree, useDocumentStore } from "../lib/document";
import { Icon, MenuItem, MenuSeparator, PageGlyph, icons } from "./ui";

const INDENT = 16;
const MAX_INDENT_DEPTH = 6;

/** The page tree, as the content of the page menu's Pages submenu. */
export function PagesMenu() {
  const pages = useDocumentStore((state) => state.pages);
  const currentPageId = useDocumentStore((state) => state.currentPageId);
  const tree = useMemo(() => pageTree(pages), [pages]);

  return (
    <>
      {tree.map(({ page, depth }) => {
        const current = page.id === currentPageId;
        return (
          <MenuItem
            key={page.id}
            aria-current={current ? "page" : undefined}
            style={{
              paddingInlineStart:
                8 + Math.min(depth, MAX_INDENT_DEPTH) * INDENT,
            }}
            onClick={() => documentActions.selectPage(page.id)}
          >
            <PageGlyph icon={page.icon} />
            <span
              className={
                page.title
                  ? "min-w-0 flex-1 truncate"
                  : "text-muted-foreground min-w-0 flex-1 truncate"
              }
            >
              {page.title || "Untitled"}
            </span>
            {current ? (
              <span className="flex ps-2">
                <Icon {...icons.tick} />
              </span>
            ) : null}
          </MenuItem>
        );
      })}
      <MenuSeparator />
      <MenuItem onClick={() => documentActions.addPage(currentPageId)}>
        <Icon {...icons.pageAdd} />
        Add subpage
      </MenuItem>
      <MenuItem onClick={() => documentActions.addPage(null)}>
        <Icon {...icons.add} />
        New page
      </MenuItem>
    </>
  );
}
