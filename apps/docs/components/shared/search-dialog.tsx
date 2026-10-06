"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Command as CommandPrimitive } from "cmdk";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  FileText,
  Hash,
  Text,
} from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { useSearchSuggestions } from "@/hooks/use-search-suggestions";
import {
  collectPageEntries,
  collectPageTextMatches,
} from "@/lib/search/collect-page";
import { loadSearchIndex } from "@/lib/search/load-index";
import { revealPageMatch } from "@/lib/search/reveal";
import {
  highlightMatches,
  searchEntries,
  searchOtherPages,
  tokenize,
} from "@/lib/search/query";
import {
  SEARCH_SCOPES,
  inSearchScope,
  type SearchScope,
} from "@/lib/search/route-query";
import type { SearchGroup, SearchHit, SearchRecord } from "@/lib/search/types";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_GROUPS: {
  scope: Exclude<SearchScope, "All">;
  pages: { url: string; title: string }[];
}[] = [
  {
    scope: "Docs",
    pages: [
      { url: "/docs/installation", title: "Installation" },
      { url: "/docs/runtimes/pick-a-runtime", title: "Pick a Runtime" },
      { url: "/docs/cloud", title: "Assistant Cloud" },
    ],
  },
  {
    scope: "Elements",
    pages: [
      { url: "/elements/thread", title: "Thread" },
      { url: "/elements/composer", title: "Composer" },
      { url: "/elements/attachment", title: "Attachment" },
    ],
  },
  {
    scope: "Examples",
    pages: [
      { url: "/examples/ai-sdk", title: "AI SDK Chat Persistence" },
      { url: "/examples/generative-ui", title: "Generative UI Example" },
      { url: "/examples/artifacts", title: "Claude Artifacts Example" },
    ],
  },
  {
    scope: "Design",
    pages: [
      { url: "/design/components/button", title: "Button" },
      { url: "/design/components/input", title: "Input" },
      { url: "/design/components/dialog", title: "Dialog" },
    ],
  },
];

function ResultItem({
  item,
  description,
  nested,
  tokens,
  onSelect,
}: {
  item: SearchHit;
  description?: string | undefined;
  nested?: boolean;
  tokens: string[];
  onSelect: (item: SearchHit) => void;
}) {
  const Icon =
    item.type === "page" ? FileText : item.type === "heading" ? Hash : Text;
  return (
    <CommandItem
      value={item.id}
      onSelect={() => onSelect(item)}
      className={cn("group gap-3 rounded-lg px-3 py-2.5", nested && "pl-9")}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 self-start" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm">
          {highlightMatches(item.content, tokens).map((segment, i) => (
            <span
              key={i}
              className={cn(
                segment.styles?.highlight && "text-foreground font-medium",
              )}
            >
              {segment.content}
            </span>
          ))}
        </span>
        {description && (
          <span className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
            {description}
          </span>
        )}
        {item.type === "page" && (
          <span className="text-muted-foreground truncate font-mono text-[11px]">
            {item.url}
          </span>
        )}
      </span>
      <CornerDownLeft
        aria-hidden="true"
        className="text-muted-foreground size-3.5 opacity-0 group-data-[selected=true]:opacity-100"
      />
    </CommandItem>
  );
}

function SearchContent({
  onOpenChange,
}: Pick<SearchDialogProps, "onOpenChange">) {
  const router = useRouter();
  const pathname = usePathname();
  const [inputValue, setInputValue] = useState("");
  const [scope, setScope] = useState<SearchScope>("All");
  const [selection, setSelection] = useState("");
  const [index, setIndex] = useState<SearchRecord[]>([]);
  const [indexStatus, setIndexStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [pageEntries, setPageEntries] = useState<Omit<SearchHit, "score">[]>(
    [],
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);

  const loadIndex = useCallback(() => {
    void loadSearchIndex()
      .then((records) => {
        if (!mounted.current) return;
        setIndex(records);
        setIndexStatus("ready");
      })
      .catch(() => {
        if (mounted.current) setIndexStatus("error");
      });
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadIndex();
    // In-page headings must come from the committed page DOM.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageEntries(collectPageEntries(pathname));
    return () => {
      mounted.current = false;
    };
  }, [loadIndex, pathname]);

  const query = inputValue.trim();
  const tokens = useMemo(() => tokenize(query), [query]);
  const hasQuery = tokens.length > 0;
  const scopedIndex = useMemo(
    () => index.filter((page) => inSearchScope(page.url, scope)),
    [index, scope],
  );
  const descriptions = useMemo(
    () => new Map(index.map((page) => [page.url, page.description])),
    [index],
  );
  const suggestions = useSearchSuggestions(query, scope, scopedIndex);

  const onPageHits = useMemo(() => {
    if (!hasQuery || !inSearchScope(pathname, scope)) return [];
    return searchEntries(
      [...pageEntries, ...collectPageTextMatches(pathname, query)],
      query,
    );
  }, [hasQuery, pageEntries, pathname, query, scope]);
  const otherGroups = useMemo(
    () => (hasQuery ? searchOtherPages(scopedIndex, query, pathname) : []),
    [hasQuery, scopedIndex, pathname, query],
  );
  const existingUrls = new Set(onPageHits.map((hit) => hit.url.split("#")[0]));
  const suggestedGroups = suggestions.pages
    .filter((page) => !existingUrls.has(page.url))
    .map(
      (page): SearchGroup =>
        otherGroups.find((group) => group.pageUrl === page.url) ?? {
          pageUrl: page.url,
          items: [
            {
              id: page.url,
              url: page.url,
              content: page.title,
              type: "page",
              score: 0,
            },
          ],
        },
    );
  const suggestedUrls = new Set(suggestedGroups.map((group) => group.pageUrl));
  const matchedGroups = otherGroups.filter(
    (group) => !suggestedUrls.has(group.pageUrl),
  );
  const browseGroups = useMemo(
    () =>
      SHORTCUT_GROUPS.filter(
        (group) => scope === "All" || group.scope === scope,
      ).map((group) => {
        const shortcutUrls = new Set(group.pages.map((page) => page.url));
        const remainingPages = index
          .filter(
            (page) =>
              inSearchScope(page.url, group.scope) &&
              !shortcutUrls.has(page.url),
          )
          .sort((a, b) => a.title.localeCompare(b.title));
        return {
          scope: group.scope,
          items: [...group.pages, ...remainingPages].map((page): SearchHit => ({
            id: page.url,
            url: page.url,
            content: page.title,
            type: "page",
            score: 0,
          })),
        };
      }),
    [index, scope],
  );
  const results = hasQuery
    ? [
        ...onPageHits,
        ...suggestedGroups.flatMap((group) => group.items),
        ...matchedGroups.flatMap((group) => group.items),
      ]
    : browseGroups.flatMap((group) => group.items);
  const selected = results.some((item) => item.id === selection)
    ? selection
    : (results[0]?.id ?? "");
  const waiting =
    hasQuery && (indexStatus === "loading" || suggestions.loading);
  const lastTrackedQuery = useRef("");
  const resultsLengthRef = useRef(0);
  resultsLengthRef.current = hasQuery ? results.length : 0;

  const trackSearch = useCallback(() => {
    if (query.length < 2 || query === lastTrackedQuery.current) return;
    lastTrackedQuery.current = query;
    if (resultsLengthRef.current === 0) analytics.search.noResults(query);
    else analytics.search.querySubmitted(query, resultsLengthRef.current);
  }, [query]);
  useEffect(() => {
    if (waiting) return;
    const timer = setTimeout(trackSearch, 500);
    return () => clearTimeout(timer);
  }, [trackSearch, waiting]);

  const handleSelect = (item: SearchHit) => {
    trackSearch();
    analytics.search.resultClicked(
      query,
      item.url,
      results.findIndex((result) => result.id === item.id),
    );
    onOpenChange(false);
    if (item.element?.isConnected) {
      window.history.replaceState(null, "", item.url);
      revealPageMatch(
        item.element,
        item.type === "heading" ? "start" : "center",
      );
    } else router.push(item.url);
  };

  const renderItem = (item: SearchHit, nested = false) => (
    <ResultItem
      key={item.id}
      item={item}
      nested={nested}
      description={
        hasQuery
          ? (descriptions.get(item.url) ??
            suggestions.pages.find((page) => page.url === item.url)
              ?.description)
          : undefined
      }
      tokens={tokens}
      onSelect={handleSelect}
    />
  );

  return (
    <Command
      label="Search documentation"
      shouldFilter={false}
      value={selected}
      onValueChange={setSelection}
      className="min-h-0 rounded-none"
      onKeyDownCapture={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLButtonElement)
          event.stopPropagation();
      }}
    >
      <div className="border-foreground/10 flex h-14 shrink-0 items-center gap-3 border-b px-3">
        <Search
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0"
        />
        <CommandPrimitive.Input
          ref={inputRef}
          autoFocus
          aria-label="Search documentation"
          placeholder="Search docs or describe what you need…"
          value={inputValue}
          onValueChange={(value) => {
            setInputValue(value);
            setSelection("");
          }}
          maxLength={120}
          className="placeholder:text-muted-foreground h-full min-w-0 flex-1 border-0 bg-transparent text-base shadow-none ring-0 outline-none focus-visible:ring-0 focus-visible:outline-none sm:text-sm"
        />
        <button
          type="button"
          aria-label="Close search"
          onClick={() => onOpenChange(false)}
          className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring rounded-md px-2 py-1.5 outline-none focus-visible:ring-2"
        >
          <kbd className="font-mono text-xs">Esc</kbd>
        </button>
      </div>
      <div
        aria-label="Search scope"
        className="flex shrink-0 gap-1 overflow-x-auto px-3 py-2"
      >
        {SEARCH_SCOPES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={scope === item}
            onClick={() => {
              setScope(item);
              setSelection("");
              inputRef.current?.focus();
            }}
            className={cn(
              "focus-visible:ring-ring shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium outline-none focus-visible:ring-2",
              scope === item
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <CommandList
        className="max-h-[min(420px,calc(85dvh-136px))] min-h-0 scroll-py-2 px-1.5 pb-2 sm:max-h-[min(420px,calc(76dvh-136px))]"
        aria-label="Documentation results"
      >
        {!hasQuery &&
          browseGroups.map((group) => (
            <CommandGroup key={group.scope} heading={group.scope}>
              {group.items.map((item) => renderItem(item))}
            </CommandGroup>
          ))}
        {onPageHits.length > 0 && (
          <CommandGroup heading="On this page">
            {onPageHits.map((item) => renderItem(item))}
          </CommandGroup>
        )}
        {suggestedGroups.length > 0 && (
          <CommandGroup heading="Suggested pages">
            {suggestedGroups.flatMap((group) =>
              group.items.map((item, i) => renderItem(item, i > 0)),
            )}
          </CommandGroup>
        )}
        {matchedGroups.length > 0 && (
          <CommandGroup heading="Pages">
            {matchedGroups.flatMap((group) =>
              group.items.map((item, i) => renderItem(item, i > 0)),
            )}
          </CommandGroup>
        )}
        {results.length === 0 && waiting && (
          <div aria-hidden="true" className="space-y-4 px-3 py-5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        )}
        {results.length === 0 && !waiting && indexStatus !== "error" && (
          <div className="text-muted-foreground px-4 py-10 text-center text-sm">
            {hasQuery
              ? `No results for “${query}”`
              : "Search titles, headings, or describe what you need."}
          </div>
        )}
        {hasQuery && indexStatus === "error" && (
          <div className="text-muted-foreground px-3 py-4 text-sm">
            Unable to load the docs search.{" "}
            <button
              type="button"
              onClick={() => {
                setIndexStatus("loading");
                loadIndex();
              }}
              className="text-foreground focus-visible:ring-ring rounded-sm underline underline-offset-4 focus-visible:ring-2"
            >
              Retry
            </button>
          </div>
        )}
      </CommandList>
      <div className="bg-muted/50 text-muted-foreground border-foreground/10 flex shrink-0 items-center gap-4 border-t px-3 py-2 text-xs">
        <span className="flex items-center gap-1">
          <ArrowUp aria-hidden="true" className="size-3" />
          <ArrowDown aria-hidden="true" className="size-3" />
          <span className="ml-1">Navigate</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CornerDownLeft aria-hidden="true" className="size-3" />
          Open
        </span>
        <span role="status" className="ml-auto">
          {waiting
            ? "Searching…"
            : hasQuery
              ? `${results.length} results`
              : indexStatus === "ready"
                ? `${results.length} pages`
                : ""}
        </span>
      </div>
    </Command>
  );
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const pathname = usePathname();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-background/60 backdrop-blur-sm motion-reduce:animate-none" />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className="bg-popover text-popover-foreground ring-foreground/10 fixed top-[max(1rem,5dvh)] left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl shadow-lg ring-1 outline-none sm:top-[12dvh] sm:max-h-[80dvh]"
        >
          <DialogTitle className="sr-only">Search documentation</DialogTitle>
          <DialogDescription className="sr-only">
            Find pages and headings. Use the arrow keys to navigate and Enter to
            open a result.
          </DialogDescription>
          {open && <SearchContent key={pathname} onOpenChange={onOpenChange} />}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
