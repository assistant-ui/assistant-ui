"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { HistoryNav } from "../../chat-sidebar";
import {
  descendantIds,
  documentActions,
  pageTree,
  useDocumentStore,
  type Page,
} from "../lib/document";
import { saveOpenPage } from "./editor";
import {
  glyphFor,
  Icon,
  IconButton,
  icons,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  PageGlyph,
  radius,
  text,
} from "./ui";

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

/* -------------------------------------------------------------------------- */
/* The sidebar's list: Home, New page, then every page, subpages set in.      */
/* -------------------------------------------------------------------------- */

const sidebarRow = cn(
  radius.sm,
  "hover:bg-accent focus-visible:ring-foreground/20 flex h-8 w-full min-w-0 items-center gap-2 px-2 text-start transition-colors outline-none focus-visible:ring-1 motion-reduce:transition-none pointer-coarse:h-10",
);

const HOME = "home";

/**
 * For `<ChatSidebar historyNav>`: Back and Forward through the pages opened
 * in this visit, and the home, like a browser's history. A deleted page is
 * stepped over.
 */
export function PageHistoryNav() {
  const pages = useDocumentStore((state) => state.pages);
  const here = useDocumentStore((state) =>
    state.home ? HOME : state.currentPageId,
  );
  const [history, setHistory] = useState(() => ({ entries: [here], index: 0 }));
  const pending = useRef<number | null>(null);

  useEffect(() => {
    const target = pending.current;
    pending.current = null;
    setHistory((previous) => {
      if (target !== null && previous.entries[target] === here)
        return { ...previous, index: target };
      if (previous.entries[previous.index] === here) return previous;
      return {
        entries: [...previous.entries.slice(0, previous.index + 1), here],
        index: previous.index + 1,
      };
    });
  }, [here]);

  const find = (step: -1 | 1) => {
    for (
      let index = history.index + step;
      index >= 0 && index < history.entries.length;
      index += step
    ) {
      const id = history.entries[index];
      if (
        id !== undefined &&
        id !== here &&
        (id === HOME || pages.some((page) => page.id === id))
      )
        return index;
    }
    return null;
  };
  const go = (step: -1 | 1) => {
    const index = find(step);
    const id = index === null ? undefined : history.entries[index];
    if (index === null || id === undefined) return;
    pending.current = index;
    if (id === HOME) documentActions.goHome();
    else documentActions.selectPage(id);
  };

  return (
    <HistoryNav
      canGoBack={find(-1) !== null}
      canGoForward={find(1) !== null}
      goBack={() => go(-1)}
      goForward={() => go(1)}
    />
  );
}

/**
 * For `<ChatSidebar list>`: the home, a new page, and the page tree. With a
 * `query`, the pages whose names hold it, in a flat list.
 */
export function PageList({ query = "" }: { query?: string }) {
  const pages = useDocumentStore((state) => state.pages);
  const currentPageId = useDocumentStore((state) => state.currentPageId);
  const home = useDocumentStore((state) => state.home);
  const wanted = query.trim().toLowerCase();
  const tree = useMemo(() => {
    const all = pageTree(pages);
    if (!wanted) return all;
    return all
      .filter(({ page }) =>
        (page.title || "Untitled").toLowerCase().includes(wanted),
      )
      .map(({ page }) => ({ page, depth: 0 }));
  }, [pages, wanted]);
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <nav aria-label="Pages" className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-current={home ? "page" : undefined}
        className={cn(sidebarRow, "aria-[current]:bg-accent")}
        onClick={() => documentActions.goHome()}
      >
        <Icon {...glyphFor("home")} />
        Home
      </button>
      <button
        type="button"
        className={sidebarRow}
        onClick={() => documentActions.addPage(null)}
      >
        <Icon {...icons.add} />
        New page
      </button>
      {wanted && tree.length === 0 ? (
        <p className="text-muted-foreground mt-3 px-2">
          No pages match “{query.trim()}”.
        </p>
      ) : null}
      <ul aria-label="All pages" className="mt-3 flex flex-col gap-0.5">
        {tree.map(({ page, depth }) => (
          <PageRow
            key={page.id}
            page={page}
            depth={depth}
            current={!home && page.id === currentPageId}
            renaming={renaming === page.id}
            onRename={setRenaming}
          />
        ))}
      </ul>
    </nav>
  );
}

function PageRow({
  page,
  depth,
  current,
  renaming,
  onRename,
}: {
  page: Page;
  depth: number;
  current: boolean;
  renaming: boolean;
  onRename: (id: string | null) => void;
}) {
  const pages = useDocumentStore((state) => state.pages);
  const subpages = descendantIds(pages, page.id).length;
  const isLastPage = pages.length <= subpages + 1;
  const title = page.title || "Untitled";
  const indent = {
    paddingInlineStart: 8 + Math.min(depth, MAX_INDENT_DEPTH) * INDENT,
  };

  if (renaming) {
    return (
      <li>
        <input
          autoFocus
          aria-label="Page name"
          defaultValue={page.title}
          placeholder="Untitled"
          style={indent}
          className={cn(
            radius.sm,
            "bg-background border-ring h-8 w-full border pe-2 outline-none pointer-coarse:h-10",
          )}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={(event) => {
            documentActions.renamePage(
              page.id,
              event.currentTarget.value.trim(),
            );
            onRename(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.value = page.title;
              event.currentTarget.blur();
            }
          }}
        />
      </li>
    );
  }

  return (
    <li
      ref={(row) => {
        // A page that was just opened, such as a new one, scrolls into view.
        if (row && current) row.scrollIntoView({ block: "nearest" });
      }}
      className={cn(
        radius.sm,
        "group hover:bg-accent has-data-popup-open:bg-accent relative flex",
        current && "bg-accent",
      )}
    >
      <button
        type="button"
        aria-current={current ? "page" : undefined}
        style={indent}
        className={cn(
          radius.sm,
          "focus-visible:ring-foreground/20 flex h-8 min-w-0 flex-1 items-center gap-2 pe-2 text-start outline-none group-focus-within:pe-15 group-hover:pe-15 group-has-data-popup-open:pe-15 focus-visible:ring-1 pointer-coarse:h-10 pointer-coarse:pe-15",
        )}
        onClick={() => documentActions.selectPage(page.id)}
      >
        <PageGlyph icon={page.icon} className="text-muted-foreground" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            !page.title && "text-muted-foreground",
          )}
        >
          {title}
        </span>
      </button>
      <span className="absolute end-1 top-1/2 flex -translate-y-1/2 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 has-data-popup-open:opacity-100 pointer-coarse:opacity-100">
        <Menu>
          <MenuTrigger
            render={
              <IconButton
                label={`More for ${title}`}
                icon={icons.more}
                side="top"
                className="size-6"
              />
            }
          />
          <MenuContent align="start" className="min-w-48">
            <MenuItem onClick={() => onRename(page.id)}>
              <Icon {...icons.rename} />
              Rename
            </MenuItem>
            <MenuItem
              onClick={() => {
                if (current) saveOpenPage();
                documentActions.duplicatePage(page.id);
              }}
            >
              <Icon {...icons.duplicate} />
              Duplicate
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              destructive
              disabled={isLastPage}
              onClick={() => documentActions.deletePage(page.id)}
            >
              <Icon {...icons.delete} />
              Delete
              {subpages > 0 && !isLastPage ? (
                <span className={cn("ms-auto ps-4", text.small)}>
                  and {subpages} {subpages === 1 ? "subpage" : "subpages"}
                </span>
              ) : null}
            </MenuItem>
          </MenuContent>
        </Menu>
        <IconButton
          label={`Add a page inside ${title}`}
          icon={icons.add}
          side="top"
          className="size-6"
          onClick={() => documentActions.addPage(page.id)}
        />
      </span>
    </li>
  );
}
