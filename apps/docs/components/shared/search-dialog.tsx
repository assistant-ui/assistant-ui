"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type KeyboardEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, CornerDownLeft, FileText, Hash, Text, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { useGlobalAskAI } from "@/components/pages/docs/assistant/context";
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
import type {
  HighlightSegment,
  SearchHit,
  SearchRecord,
} from "@/lib/search/types";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function HighlightedText({
  segments,
  fallback,
}: {
  segments: HighlightSegment[];
  fallback: string;
}) {
  if (segments.length === 0) {
    return <>{fallback}</>;
  }

  return (
    <>
      {segments.map((segment, i) => (
        <span
          key={i}
          className={cn(segment.styles?.highlight && "text-primary")}
        >
          {segment.content}
        </span>
      ))}
    </>
  );
}

function formatBreadcrumb(url: string): string {
  const path = url.split("#")[0] ?? "";
  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) return "Home";

  return segments
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" / ");
}

function ResultIcon({ type }: { type: string }) {
  switch (type) {
    case "page":
      return <FileText className="size-3.5" />;
    case "heading":
      return <Hash className="size-3.5" />;
    default:
      return <Text className="size-3.5" />;
  }
}

function ResultButton({
  item,
  index,
  selected,
  nested,
  showBreadcrumb,
  tokens,
  onSelect,
  onHover,
}: {
  item: SearchHit;
  index: number;
  selected: boolean;
  nested: boolean;
  showBreadcrumb: boolean;
  tokens: string[];
  onSelect: (item: SearchHit) => void;
  onHover: (index: number) => void;
}) {
  return (
    <button
      type="button"
      id={`search-option-${index}`}
      role="option"
      aria-selected={selected}
      data-index={index}
      onClick={() => onSelect(item)}
      onMouseEnter={() => onHover(index)}
      className={cn(
        "group focus-visible:outline-ring rounded-control flex min-h-11 w-full cursor-pointer items-center gap-2.5 py-2 pr-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2",
        selected ? "bg-accent" : "hover:bg-accent/50",
        nested ? "pl-9" : "pl-3",
      )}
    >
      <div className="text-muted-foreground shrink-0">
        <ResultIcon type={item.type} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-foreground line-clamp-2 text-sm leading-relaxed">
          <HighlightedText
            segments={highlightMatches(item.content, tokens)}
            fallback={item.content}
          />
        </span>
        {showBreadcrumb && (
          <span className="text-muted-foreground truncate text-xs">
            {formatBreadcrumb(item.url)}
          </span>
        )}
      </div>
      <CornerDownLeft
        className={cn(
          "text-muted-foreground size-3.5 shrink-0 transition-opacity",
          selected ? "opacity-60" : "opacity-0",
        )}
      />
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground px-2.5 pt-2 pb-1 text-xs font-medium">
      {children}
    </p>
  );
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [index, setIndex] = useState<SearchRecord[] | null>(null);
  const [indexError, setIndexError] = useState(false);
  const [pageEntries, setPageEntries] = useState<Omit<SearchHit, "score">[]>(
    [],
  );
  const listRef = useRef<HTMLDivElement>(null);
  const askAIFn = useGlobalAskAI();

  useEffect(() => {
    void loadSearchIndex()
      .then((records) => {
        setIndex(records);
        setIndexError(false);
      })
      .catch(() => {
        setIndexError(true);
      });
  }, []);

  const [openScope, setOpenScope] = useState<{
    open: boolean;
    pathname: string;
  } | null>(null);

  if (
    openScope === null ||
    openScope.open !== open ||
    openScope.pathname !== pathname
  ) {
    setOpenScope({ open, pathname });
    if (open) {
      setInputValue("");
      setSelectedIndex(0);
    }
  }

  useEffect(() => {
    if (!open) return;
    // The headings are collected from the committed page DOM, so this cannot
    // move into render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageEntries(collectPageEntries(pathname));
  }, [open, pathname]);

  const query = inputValue.trim();
  const tokens = useMemo(() => tokenize(query), [query]);
  const hasQuery = tokens.length > 0;

  const onPageHits = useMemo(() => {
    if (!hasQuery) return pageEntries.map((entry) => ({ ...entry, score: 0 }));
    return searchEntries(
      [...pageEntries, ...collectPageTextMatches(pathname, query)],
      query,
    );
  }, [hasQuery, pageEntries, pathname, query]);

  const otherGroups = useMemo(() => {
    if (!index || !hasQuery) return [];
    return searchOtherPages(index, query, pathname);
  }, [hasQuery, index, pathname, query]);

  const results = useMemo(
    () => [...onPageHits, ...otherGroups.flatMap((group) => group.items)],
    [onPageHits, otherGroups],
  );

  const showAskAI = !!askAIFn && hasQuery;
  const indexLoading = index === null && !indexError;
  const waitingForIndex = hasQuery && indexLoading && onPageHits.length === 0;

  const lastTrackedQuery = useRef("");
  const searchTrackingTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const resultsLengthRef = useRef(0);
  useEffect(() => {
    resultsLengthRef.current = results.length;
  }, [results.length]);

  const [resultScope, setResultScope] = useState({
    query,
    onPageHits,
    otherGroups,
  });

  if (
    resultScope.query !== query ||
    resultScope.onPageHits !== onPageHits ||
    resultScope.otherGroups !== otherGroups
  ) {
    setResultScope({ query, onPageHits, otherGroups });
    setSelectedIndex(0);
  }

  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`,
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, results.length]);

  const handleAskAI = useCallback(() => {
    if (!askAIFn) return;
    analytics.search.askAITriggered(inputValue);
    onOpenChange(false);
    askAIFn(inputValue);
  }, [askAIFn, inputValue, onOpenChange]);

  const handleSelect = useCallback(
    (item: SearchHit) => {
      if (searchTrackingTimeout.current) {
        clearTimeout(searchTrackingTimeout.current);
        if (query.length >= 2 && query !== lastTrackedQuery.current) {
          lastTrackedQuery.current = query;
          const resultCount = resultsLengthRef.current;
          if (resultCount === 0) analytics.search.noResults(query);
          else analytics.search.querySubmitted(query, resultCount);
        }
      }

      const position = results.findIndex((result) => result.id === item.id);
      analytics.search.resultClicked(query, item.url, position);
      onOpenChange(false);

      if (item.element?.isConnected) {
        window.history.replaceState(null, "", item.url);
        revealPageMatch(
          item.element,
          item.type === "heading" ? "start" : "center",
        );
        return;
      }

      router.push(item.url);
    },
    [onOpenChange, query, results, router],
  );

  useEffect(() => {
    if (searchTrackingTimeout.current) {
      clearTimeout(searchTrackingTimeout.current);
    }

    if (!query || query.length < 2 || query === lastTrackedQuery.current) {
      return;
    }

    searchTrackingTimeout.current = setTimeout(() => {
      lastTrackedQuery.current = query;
      const resultCount = resultsLengthRef.current;
      if (resultCount === 0) analytics.search.noResults(query);
      else analytics.search.querySubmitted(query, resultCount);
    }, 500);

    return () => {
      if (searchTrackingTimeout.current) {
        clearTimeout(searchTrackingTimeout.current);
      }
    };
  }, [query]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, results.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter" && results[selectedIndex]) {
        event.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    },
    [handleSelect, results, selectedIndex],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Search this page and the docs</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="border-border/40 flex items-center gap-2.5 border-b px-4">
            <Search className="text-muted-foreground size-4" />
            <input
              type="text"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={
                results[selectedIndex]
                  ? `search-option-${selectedIndex}`
                  : undefined
              }
              aria-autocomplete="list"
              aria-label="Search this page and the docs"
              placeholder="Search this page or docs..."
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
              }}
              onKeyDown={handleKeyDown}
              className="placeholder:text-muted-foreground h-14 min-w-0 flex-1 bg-transparent text-base outline-none"
              autoFocus
            />
            {showAskAI && (
              <button
                type="button"
                onClick={handleAskAI}
                className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-ring rounded-control flex min-h-11 shrink-0 items-center px-2 text-sm transition-colors focus-visible:outline-2"
              >
                Ask AI
              </button>
            )}
            <DialogClose
              aria-label="Close search"
              className="text-muted-foreground hover:text-foreground focus-visible:outline-ring rounded-control flex size-11 shrink-0 items-center justify-center focus-visible:outline-2"
            >
              <X className="size-4" />
            </DialogClose>
          </div>

          <div
            ref={listRef}
            id="search-results"
            role="listbox"
            aria-label="Search results"
            className="max-h-96 min-h-24 overflow-x-hidden overflow-y-auto overscroll-contain"
          >
            {waitingForIndex ? (
              <div className="flex flex-col gap-3 px-4 py-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            ) : results.length === 0 ? (
              <div className="flex min-h-24 flex-col items-center justify-center gap-1 px-4 py-6">
                <p className="text-muted-foreground text-sm">
                  {!hasQuery
                    ? "Search the docs by title, topic, or API name."
                    : indexError
                      ? "Unable to search other pages"
                      : `No results for "${inputValue}"`}
                </p>
              </div>
            ) : (
              <div className="p-1.5">
                {onPageHits.length > 0 && (
                  <div>
                    <SectionLabel>On this page</SectionLabel>
                    {onPageHits.map((item, itemIndex) => (
                      <ResultButton
                        key={item.id}
                        item={item}
                        index={itemIndex}
                        selected={itemIndex === selectedIndex}
                        nested={false}
                        showBreadcrumb={false}
                        tokens={tokens}
                        onSelect={handleSelect}
                        onHover={setSelectedIndex}
                      />
                    ))}
                  </div>
                )}
                {otherGroups.length > 0 &&
                  (() => {
                    let flatIndex = onPageHits.length;
                    return (
                      <div>
                        <SectionLabel>Other pages</SectionLabel>
                        {otherGroups.map((group) => (
                          <div key={group.pageUrl} className="mb-1 last:mb-0">
                            {group.items.map((item, itemIndex) => {
                              const currentIndex = flatIndex++;
                              return (
                                <ResultButton
                                  key={item.id}
                                  item={item}
                                  index={currentIndex}
                                  selected={currentIndex === selectedIndex}
                                  nested={itemIndex > 0}
                                  showBreadcrumb={itemIndex === 0}
                                  tokens={tokens}
                                  onSelect={handleSelect}
                                  onHover={setSelectedIndex}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
              </div>
            )}
          </div>
        </div>
        <div className="text-muted-foreground bg-foreground/[0.025] flex shrink-0 items-center justify-between gap-4 px-4 py-3 text-xs">
          <span>↑ ↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
