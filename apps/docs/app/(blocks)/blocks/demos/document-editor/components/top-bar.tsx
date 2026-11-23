"use client";

import type { LexicalEditor } from "lexical";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  BLOCK_LABELS,
  type BlockType,
  type Page,
  descendantIds,
  documentActions,
  documentStore,
  documentToMarkdown,
  markdownFileName,
  pageAncestors,
  selectCurrentPage,
  useCurrentPage,
  useDocumentStore,
} from "../lib/document";
import {
  getEditorBridge,
  insertBlock,
  saveOpenPage,
  useActiveEditor,
} from "./editor";
import { PagesMenu } from "./pages-menu";
import {
  type Glyph,
  Icon,
  IconButton,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
  PageGlyph,
  Pill,
  SubMenu,
  SubMenuContent,
  SubMenuTrigger,
  Tooltip,
  iconButtonClass,
  icons,
  text,
  textButtonClass,
  topPill,
  weight,
} from "./ui";

const BLOCK_ICONS: Record<BlockType, Glyph> = {
  paragraph: icons.text,
  h1: icons.h1,
  h2: icons.h2,
  h3: icons.h3,
  check: icons.check,
  bullet: icons.bullet,
  numbered: icons.numbered,
  quote: icons.quote,
  divider: icons.divider,
  table: icons.table,
};

const QUICK_INSERTS = ["paragraph", "check", "table"] as const;

const INSERT_MENU: readonly BlockType[] = [
  "paragraph",
  "h1",
  "h2",
  "h3",
  "check",
  "bullet",
  "numbered",
  "quote",
  "table",
  "divider",
];

const BREADCRUMB_LIMIT = 2;

const noEditor = () => () => {};

/** False while the assistant writes, and before the page's editor mounts. */
function useEditable(editor: LexicalEditor | null) {
  const subscribe = useCallback(
    (onChange: () => void) =>
      editor ? editor.registerEditableListener(onChange) : noEditor(),
    [editor],
  );
  return useSyncExternalStore(
    subscribe,
    () => editor?.isEditable() ?? false,
    () => false,
  );
}

function downloadPage(page: Page) {
  const bridge = getEditorBridge();
  const blocks =
    bridge?.pageId === page.id
      ? bridge.getDocument().blocks
      : page.content.blocks;
  const url = URL.createObjectURL(
    new Blob([documentToMarkdown(page.title, blocks)], {
      type: "text/markdown;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = markdownFileName(page.title);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

const focusPageTitle = () =>
  document
    .querySelector<HTMLTextAreaElement>(".document-editor .doc-title")
    ?.focus();

function RenameField({
  page,
  onDone,
}: {
  page: Page;
  onDone: (refocus: boolean) => void;
}) {
  const [draft, setDraft] = useState(page.title);
  const field = useRef<HTMLInputElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  const finish = (save: boolean, refocus: boolean) => {
    if (settled.current) return;
    settled.current = true;
    if (save) documentActions.renamePage(page.id, draft.trim());
    onDone(refocus);
  };

  return (
    <span className="bg-foreground/4 focus-within:border-ring dark:bg-foreground/6 flex h-8 min-w-0 items-center gap-1.5 rounded-full border border-transparent px-3 pointer-coarse:h-9">
      <PageGlyph icon={page.icon} className="text-muted-foreground" />
      <input
        ref={field}
        value={draft}
        placeholder="Untitled"
        aria-label="Page title"
        spellCheck={false}
        autoComplete="off"
        className={cn(
          "placeholder:text-muted-foreground w-44 min-w-0 bg-transparent outline-none sm:w-56",
          text.body,
          weight.label,
        )}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true, false)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Enter") {
            event.preventDefault();
            finish(true, true);
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            finish(false, true);
          }
        }}
      />
    </span>
  );
}

function Breadcrumbs({ ancestors }: { ancestors: readonly Page[] }) {
  if (ancestors.length === 0) return null;
  const shown = ancestors.slice(-BREADCRUMB_LIMIT);
  const separator = (
    <span aria-hidden className="text-muted-foreground/60 px-0.5">
      /
    </span>
  );

  return (
    <nav
      aria-label="Parent pages"
      className={cn("hidden min-w-0 items-center sm:flex", text.body)}
    >
      {shown.length < ancestors.length ? (
        <>
          <span aria-hidden className="text-muted-foreground ps-3 pe-1">
            …
          </span>
          {separator}
        </>
      ) : null}
      {shown.map((ancestor) => (
        <span key={ancestor.id} className="flex min-w-0 items-center">
          <button
            type="button"
            className={cn(
              textButtonClass,
              topPill.text,
              "text-muted-foreground hover:text-foreground max-w-32 min-w-0 shrink px-2.5",
            )}
            onClick={() => documentActions.selectPage(ancestor.id)}
          >
            <span className="truncate">{ancestor.title || "Untitled"}</span>
          </button>
          {separator}
        </span>
      ))}
    </nav>
  );
}

function PagePill() {
  const page = useCurrentPage();
  const pages = useDocumentStore((state) => state.pages);
  const commentsVisible = useDocumentStore((state) => state.commentsVisible);
  const editable = useEditable(useActiveEditor());

  const ancestors = useMemo(
    () => pageAncestors(pages, page.id),
    [pages, page.id],
  );
  const subpages = useMemo(
    () => descendantIds(pages, page.id).length,
    [pages, page.id],
  );
  const isLastPage = pages.length <= subpages + 1;

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const renaming = renamingId === page.id;
  const trigger = useRef<HTMLButtonElement>(null);
  const renameAfterClose = useRef(false);
  const refocusTrigger = useRef(false);
  const openedOn = useRef(page.id);

  useEffect(() => {
    if (renaming || !refocusTrigger.current) return;
    refocusTrigger.current = false;
    trigger.current?.focus();
  }, [renaming]);

  const title = page.title || "Untitled";

  return (
    <Pill variant="top" className="pointer-events-auto min-w-0">
      <Breadcrumbs ancestors={ancestors} />
      {renaming ? (
        <RenameField
          page={page}
          onDone={(refocus) => {
            refocusTrigger.current = refocus;
            setRenamingId(null);
          }}
        />
      ) : (
        <Menu
          onOpenChange={(open) => {
            if (open) openedOn.current = page.id;
          }}
          // The row's action waits for the menu to close, so the focus the menu hands back to its trigger does not undo it.
          onOpenChangeComplete={(open) => {
            if (open) return;
            const current = selectCurrentPage(documentStore.getState());
            if (renameAfterClose.current) {
              renameAfterClose.current = false;
              setRenamingId(current.id);
            } else if (current.id !== openedOn.current && !current.title) {
              focusPageTitle();
            }
          }}
        >
          <MenuTrigger
            render={
              <button
                ref={trigger}
                type="button"
                aria-label={`${title}, page menu`}
                className={cn(
                  textButtonClass,
                  topPill.text,
                  "max-w-72 min-w-0 shrink",
                )}
              />
            }
          >
            <PageGlyph icon={page.icon} className="text-muted-foreground" />
            <span
              className={cn("truncate", !page.title && "text-muted-foreground")}
            >
              {title}
            </span>
            <Icon
              {...icons.chevronDown}
              className="text-muted-foreground size-3.5"
            />
          </MenuTrigger>
          <MenuContent className="min-w-56">
            <MenuItem
              onClick={() => {
                renameAfterClose.current = true;
              }}
            >
              <Icon {...icons.rename} />
              Rename
            </MenuItem>
            <MenuItem
              disabled={!editable}
              onClick={() => {
                saveOpenPage();
                documentActions.duplicatePage(page.id);
              }}
            >
              <Icon {...icons.duplicate} />
              Duplicate page
            </MenuItem>
            <MenuItem disabled={!editable} onClick={() => downloadPage(page)}>
              <Icon {...icons.download} />
              Download
              <span
                className={cn("text-muted-foreground ms-auto ps-4", text.small)}
              >
                Markdown
              </span>
            </MenuItem>
            <MenuSeparator />
            <MenuCheckboxItem
              checked={commentsVisible}
              onCheckedChange={(checked) =>
                documentActions.setCommentsVisible(checked)
              }
            >
              <Icon {...icons.comment} />
              Show floating comments
            </MenuCheckboxItem>
            <SubMenu>
              <SubMenuTrigger>
                <Icon {...icons.page} />
                Pages
              </SubMenuTrigger>
              <SubMenuContent className="max-w-72 min-w-52">
                <PagesMenu />
              </SubMenuContent>
            </SubMenu>
            <MenuSeparator />
            <MenuItem
              destructive
              disabled={isLastPage}
              onClick={() => documentActions.deletePage(page.id)}
            >
              <Icon {...icons.delete} />
              Delete
              {isLastPage || subpages > 0 ? (
                <span className={cn("ms-auto ps-4", text.small)}>
                  {!isLastPage
                    ? `and ${subpages} ${subpages === 1 ? "subpage" : "subpages"}`
                    : subpages > 0
                      ? "Holds every other page"
                      : "The only page"}
                </span>
              ) : null}
            </MenuItem>
          </MenuContent>
        </Menu>
      )}
    </Pill>
  );
}

function InsertPill() {
  const editor = useActiveEditor();
  const editable = useEditable(editor);
  const pending = useRef<BlockType | null>(null);

  const insert = (type: BlockType) => {
    if (editor?.isEditable()) insertBlock(editor, type);
  };

  const keepCaret = (event: MouseEvent) => event.preventDefault();

  return (
    <Pill
      variant="top"
      role="group"
      aria-label="Insert"
      className="pointer-events-auto shrink-0"
    >
      {QUICK_INSERTS.map((type) => (
        <IconButton
          key={type}
          label={BLOCK_LABELS[type]}
          icon={BLOCK_ICONS[type]}
          size="md"
          disabled={!editable}
          className="hidden sm:flex"
          onMouseDown={keepCaret}
          onClick={() => insert(type)}
        />
      ))}
      <Menu
        // Inserting once the menu has closed leaves the caret in the new block instead of on the trigger.
        onOpenChangeComplete={(open) => {
          const type = pending.current;
          if (open || !type) return;
          pending.current = null;
          insert(type);
        }}
      >
        <MenuTrigger
          disabled={!editable}
          render={<IconButton label="Insert" icon={icons.add} size="md" />}
        />
        <MenuContent className="min-w-48">
          <MenuLabel>Insert</MenuLabel>
          {INSERT_MENU.map((type) => (
            <MenuItem
              key={type}
              onClick={() => {
                pending.current = type;
              }}
            >
              <Icon {...BLOCK_ICONS[type]} />
              {BLOCK_LABELS[type]}
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
    </Pill>
  );
}

function CommentsPill() {
  const threads = useDocumentStore((state) => state.threads);
  const currentPageId = useDocumentStore((state) => state.currentPageId);
  const visible = useDocumentStore((state) => state.commentsVisible);
  const open = useMemo(
    () =>
      threads.filter(
        (thread) =>
          thread.pageId === currentPageId &&
          !thread.resolved &&
          thread.messages.length > 0,
      ).length,
    [threads, currentPageId],
  );

  return (
    <Pill variant="top" className="pointer-events-auto shrink-0">
      <Tooltip label={visible ? "Hide comments" : "Show comments"}>
        <button
          type="button"
          aria-label={
            open > 0 ? `Floating comments, ${open} open` : "Floating comments"
          }
          aria-pressed={visible}
          className={
            open > 0
              ? cn(
                  textButtonClass,
                  topPill.text,
                  "text-muted-foreground hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground gap-1 px-2",
                )
              : cn(iconButtonClass, topPill.icon)
          }
          onClick={() => documentActions.toggleCommentsVisible()}
        >
          <Icon {...icons.comment} />
          {open > 0 ? (
            <span aria-hidden className={cn("tabular-nums", text.small)}>
              {open}
            </span>
          ) : null}
        </button>
      </Tooltip>
    </Pill>
  );
}

/** The floating pills over the top of the page. */
export function TopBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <PagePill />
        <InsertPill />
      </div>
      <CommentsPill />
    </div>
  );
}
