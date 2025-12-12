"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, Hash, Search, ChevronRight, AlignLeft } from "lucide-react";
import { useDocsSearch } from "fumadocs-core/search/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

interface GroupedPage {
  pagePath: string;
  pageTitle: string;
  items: SearchResult[];
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
            segment.styles?.highlight && "font-semibold text-primary",
          )}
        >
          {segment.content}
        </span>
      ))}
    </>
  );
}

function getPageTitle(url: string | undefined): string {
  if (!url) return "Home";
  const path = url.split("#")[0] ?? "";
  const segments = path.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] ?? "Home";
  return lastSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getTypeIcon(type: string) {
  switch (type) {
    case "page":
      return <FileText className="size-3.5 shrink-0 opacity-50" />;
    case "heading":
      return <Hash className="size-3.5 shrink-0 opacity-50" />;
    default:
      return <AlignLeft className="size-3.5 shrink-0 opacity-50" />;
  }
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const { setSearch, query } = useDocsSearch({ type: "fetch" });
  const [inputValue, setInputValue] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo((): SearchResult[] => {
    if (!query.data || query.data === "empty") return [];
    return query.data as SearchResult[];
  }, [query.data]);

  const groupedByPage = useMemo((): GroupedPage[] => {
    const pageMap = new Map<string, GroupedPage>();

    for (const item of results) {
      const pagePath = item.url.split("#")[0] ?? "";
      if (!pageMap.has(pagePath)) {
        pageMap.set(pagePath, {
          pagePath,
          pageTitle: getPageTitle(pagePath),
          items: [],
        });
      }
      pageMap.get(pagePath)!.items.push(item);
    }

    return Array.from(pageMap.values());
  }, [results]);

  const flatItems = useMemo(() => {
    return groupedByPage.flatMap((group) => group.items);
  }, [groupedByPage]);

  useEffect(() => {
    if (open) {
      setInputValue("");
      setSearch("");
      setSelectedIndex(0);
    }
  }, [open, setSearch]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = useCallback(
    (url: string) => {
      onOpenChange(false);
      router.push(url);
    },
    [onOpenChange, router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatItems[selectedIndex]) {
        e.preventDefault();
        handleSelect(flatItems[selectedIndex].url);
      }
    },
    [flatItems, selectedIndex, handleSelect],
  );

  let itemIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search Documentation</DialogTitle>
        <DialogDescription>Search for pages and content</DialogDescription>
      </DialogHeader>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="flex items-center gap-3 border-b px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setSearch(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs sm:inline">
            ESC
          </kbd>
        </div>

        <div className="h-[350px] overflow-y-auto">
          {inputValue.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <Search className="size-10 opacity-10" />
              <p className="text-sm">Type to search documentation</p>
            </div>
          ) : query.isLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p className="text-sm">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <p className="text-sm">No results found</p>
              <p className="text-xs opacity-60">Try different keywords</p>
            </div>
          ) : (
            <div className="p-2">
              {groupedByPage.map((group) => (
                <div key={group.pagePath} className="mb-2 last:mb-0">
                  <div className="mb-0.5 flex items-center gap-2 rounded px-2 py-1.5">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="font-medium text-sm">
                      {group.pageTitle}
                    </span>
                  </div>
                  <div className="ml-6 border-l pl-2">
                    {group.items.map((item) => {
                      const currentIndex = itemIndex++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.url)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors",
                            isSelected ? "bg-accent" : "hover:bg-muted/50",
                          )}
                        >
                          <span className="w-4 flex-none">
                            {getTypeIcon(item.type)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            <HighlightedText
                              segments={item.contentWithHighlights}
                              fallback={item.content}
                            />
                          </span>
                          {isSelected && (
                            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t px-4 py-2">
          <div className="flex items-center gap-4 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↑
              </kbd>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↓
              </kbd>
              <span className="ml-0.5">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
              <span className="ml-0.5">select</span>
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Orama</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
