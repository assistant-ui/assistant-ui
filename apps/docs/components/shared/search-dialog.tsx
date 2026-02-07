"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  FileText,
  Hash,
  Text,
  Sparkles,
} from "lucide-react";
import { useDocsSearch } from "fumadocs-core/search/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import { useGlobalAskAI } from "@/components/docs/assistant/context";

interface HighlightSegment {
  type: "text";
  content: string;
  styles?: {
    highlight?: boolean;
  };
}

interface SearchResult {
  id: string;
  url: string;
  content: string;
  type: string;
  contentWithHighlights?: HighlightSegment[];
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function HighlightedText({
  segments,
  fallback,
}: {
  segments: HighlightSegment[] | undefined;
  fallback: string;
}) {
  if (!segments || segments.length === 0) {
    return <>{fallback}</>;
  }

  return (
    <>
      {segments.map((segment, i) => (
        <span
          key={i}
          className={cn(
            segment.styles?.highlight &&
              "rounded bg-primary/15 px-0.5 text-primary",
          )}
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

function getResultTitle(item: SearchResult): string {
  if (item.type === "page") {
    const path = item.url.split("#")[0] ?? "";
    const segments = path.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] ?? "Home";
    return lastSegment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return item.content;
}

function ResultIcon({ type }: { type: string }) {
  switch (type) {
    case "page":
      return <FileText className="size-4" />;
    case "heading":
      return <Hash className="size-4" />;
    default:
      return <Text className="size-4" />;
  }
}

function getPageUrl(url: string): string {
  return url.split("#")[0] ?? "";
}

interface GroupedResult {
  pageUrl: string;
  items: SearchResult[];
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const { setSearch, query } = useDocsSearch({ type: "fetch" });
  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const askAIFn = useGlobalAskAI();

  const latestResults = useMemo((): SearchResult[] => {
    if (!query.data || query.data === "empty") return [];
    return query.data as SearchResult[];
  }, [query.data]);

  const staleResultsRef = useRef<SearchResult[]>([]);
  useEffect(() => {
    if (latestResults.length > 0) {
      staleResultsRef.current = latestResults;
    }
  }, [latestResults]);
  const results =
    latestResults.length > 0 ? latestResults : staleResultsRef.current;

  const groupedResults = useMemo((): GroupedResult[] => {
    const groups: GroupedResult[] = [];
    let currentGroup: GroupedResult | null = null;

    for (const item of results) {
      const pageUrl = getPageUrl(item.url);

      if (!currentGroup || currentGroup.pageUrl !== pageUrl) {
        currentGroup = { pageUrl, items: [item] };
        groups.push(currentGroup);
      } else {
        currentGroup.items.push(item);
      }
    }

    return groups;
  }, [results]);

  const showAskAI = !!askAIFn && inputValue.length > 0;

  const lastTrackedQuery = useRef("");
  const searchTrackingTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const resultsLengthRef = useRef(0);
  useEffect(() => {
    resultsLengthRef.current = results.length;
  }, [results.length]);

  useEffect(() => {
    if (open) {
      setInputValue("");
      setSelectedIndex(0);
      lastTrackedQuery.current = "";
      staleResultsRef.current = [];
    }
  }, [open]);

  useEffect(() => {
    if (inputValue.length === 0) {
      setSearch("");
      staleResultsRef.current = [];
      return;
    }
    const timer = setTimeout(() => {
      setSearch(inputValue);
    }, 150);
    return () => clearTimeout(timer);
  }, [inputValue, setSearch]);

  useEffect(() => {
    void latestResults;
    setSelectedIndex(0);
  }, [latestResults]);

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
    (url: string) => {
      if (searchTrackingTimeout.current) {
        clearTimeout(searchTrackingTimeout.current);
        if (inputValue.length >= 2 && inputValue !== lastTrackedQuery.current) {
          lastTrackedQuery.current = inputValue;
          const resultCount = resultsLengthRef.current;
          if (resultCount === 0) analytics.search.noResults(inputValue);
          else analytics.search.querySubmitted(inputValue, resultCount);
        }
      }

      const position = results.findIndex((r) => r.url === url);
      analytics.search.resultClicked(inputValue, url, position);
      onOpenChange(false);
      router.push(url);
    },
    [onOpenChange, router, results, inputValue],
  );

  useEffect(() => {
    if (searchTrackingTimeout.current) {
      clearTimeout(searchTrackingTimeout.current);
    }

    if (
      !inputValue ||
      inputValue.length < 2 ||
      query.isLoading ||
      inputValue === lastTrackedQuery.current
    )
      return;

    searchTrackingTimeout.current = setTimeout(() => {
      lastTrackedQuery.current = inputValue;
      const resultCount = resultsLengthRef.current;
      if (resultCount === 0) analytics.search.noResults(inputValue);
      else analytics.search.querySubmitted(inputValue, resultCount);
    }, 500);

    return () => {
      if (searchTrackingTimeout.current) {
        clearTimeout(searchTrackingTimeout.current);
      }
    };
  }, [inputValue, query.isLoading]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex].url);
      }
    },
    [results, selectedIndex, handleSelect],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-3xl border-none p-2 sm:max-w-xl"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Search documentation</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-2xl border">
          <div className="flex items-center gap-2.5 border-border/50 border-b px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              autoFocus
            />
            {showAskAI && (
              <button
                type="button"
                onClick={handleAskAI}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-pink-500 transition-colors hover:bg-accent"
              >
                <Sparkles className="size-3.5" />
                <span className="font-medium text-xs">Ask AI</span>
              </button>
            )}
          </div>

          <div
            ref={listRef}
            className="h-[min(400px,90vh)] overflow-y-auto overflow-x-hidden overscroll-contain"
          >
            {inputValue.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4">
                <div className="flex items-center gap-6 text-muted-foreground/60">
                  <span className="flex items-center gap-1.5 text-sm">
                    <ArrowUp className="size-3" />
                    <ArrowDown className="size-3" />
                    <span>navigate</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <CornerDownLeft className="size-3" />
                    <span>select</span>
                  </span>
                </div>
              </div>
            ) : query.isLoading && results.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-muted-foreground/60">
                  <div className="size-1 animate-pulse rounded-full bg-current" />
                  <div className="size-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                  <div className="size-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 px-4">
                <p className="text-muted-foreground/60 text-sm">
                  No results for &ldquo;{inputValue}&rdquo;
                </p>
              </div>
            ) : (
              <div className="p-2">
                {(() => {
                  let flatIndex = 0;
                  return groupedResults.map((group) => (
                    <div key={group.pageUrl} className="mb-1 last:mb-0">
                      {group.items.map((item, itemIndex) => {
                        const currentIndex = flatIndex++;
                        const isSelected = currentIndex === selectedIndex;
                        const title = getResultTitle(item);
                        const isNested = itemIndex > 0 || item.type !== "page";
                        const showBreadcrumb = itemIndex === 0;

                        return (
                          <button
                            key={item.id}
                            data-index={currentIndex}
                            onClick={() => handleSelect(item.url)}
                            onMouseEnter={() => setSelectedIndex(currentIndex)}
                            className={cn(
                              "group flex w-full cursor-pointer items-center gap-3 rounded-lg py-2 pr-3 text-left transition-colors",
                              isSelected ? "bg-accent" : "hover:bg-accent/50",
                              isNested ? "pl-9" : "pl-3",
                            )}
                          >
                            <div className="shrink-0 text-muted-foreground">
                              <ResultIcon type={item.type} />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-medium text-foreground text-sm">
                                <HighlightedText
                                  segments={item.contentWithHighlights}
                                  fallback={title}
                                />
                              </span>
                              {showBreadcrumb && (
                                <span className="truncate text-muted-foreground text-xs">
                                  {formatBreadcrumb(item.url)}
                                </span>
                              )}
                            </div>
                            <CornerDownLeft
                              className={cn(
                                "size-3.5 shrink-0 text-muted-foreground transition-opacity",
                                isSelected ? "opacity-60" : "opacity-0",
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
