"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Copy, EditIcon, FileText, SparklesIcon } from "lucide-react";
import { TOCHiringBanner } from "@/components/docs/layout/toc-hiring-banner";
import { BASE_URL } from "@/lib/constants";
import { useMarkdownCopy } from "@/hooks/use-markdown-copy";
import { useAssistantPanel } from "@/components/docs/assistant/context";
import { useCurrentPage } from "@/components/docs/contexts/current-page";
import { analytics } from "@/lib/analytics";

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

type TableOfContentsProps = {
  items: TOCItem[];
  githubEditUrl?: string;
  markdownUrl?: string;
};

function TOCActions({
  markdownUrl,
  githubEditUrl,
}: {
  markdownUrl: string | undefined;
  githubEditUrl: string | undefined;
}) {
  const { copy, prefetch, isLoading } = useMarkdownCopy(markdownUrl);
  const { askAI } = useAssistantPanel();
  const currentPage = useCurrentPage();

  // Prefetch on mount since TOC is always visible on desktop
  useEffect(() => {
    prefetch();
  }, [prefetch]);

  const linkClass =
    "inline-flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground disabled:opacity-50";

  const handleAskAI = () => {
    const page = currentPage?.pathname ?? "this page";
    askAI(`Explain ${page}`);
  };

  const handleCopy = () => {
    analytics.toc.actionClicked("copy");
    copy();
  };

  const handleMarkdownClick = () => {
    analytics.toc.actionClicked("markdown");
  };

  const handleGitHubClick = () => {
    analytics.toc.actionClicked("github");
  };

  const handleAskAIClick = () => {
    analytics.toc.actionClicked("ask_ai");
    handleAskAI();
  };

  return (
    <div className="flex flex-col gap-3">
      {markdownUrl && (
        <>
          <button
            onClick={handleCopy}
            disabled={isLoading}
            className={linkClass}
          >
            <Copy className="size-3" />
            {isLoading ? "Loading..." : "Copy page"}
          </button>
          <a
            href={`${BASE_URL}${markdownUrl}`}
            target="_blank"
            rel="noreferrer noopener"
            className={linkClass}
            onClick={handleMarkdownClick}
          >
            <FileText className="size-3" />
            View as Markdown
          </a>
        </>
      )}
      {githubEditUrl && (
        <a
          href={githubEditUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={linkClass}
          onClick={handleGitHubClick}
        >
          <EditIcon className="size-3" />
          Edit on GitHub
        </a>
      )}
      <button onClick={handleAskAIClick} className={linkClass}>
        <SparklesIcon className="size-3" />
        Ask AI
      </button>
    </div>
  );
}

export function TableOfContents({
  items,
  githubEditUrl,
  markdownUrl,
}: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const headingIds = items.map((item) => item.url.slice(1));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      },
    );

    for (const id of headingIds) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }

    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    if (!activeId || !listRef.current) return;

    const activeElement = listRef.current.querySelector(
      `[data-toc-id="${activeId}"]`,
    );
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeId]);

  if (items.length === 0) return null;

  return (
    <div id="nd-toc" className="w-56 [grid-area:toc] max-xl:hidden">
      <div className="sticky top-14 flex max-h-[calc(100vh-3.5rem)] flex-col pe-4 pb-2">
        <p className="mb-3 shrink-0 text-muted-foreground/70 text-xs">
          On this page
        </p>
        <ul
          ref={listRef}
          className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const id = item.url.slice(1);
            const isActive = activeId === id;
            const indent = Math.max(0, item.depth - 2) * 12;
            const titleText = typeof item.title === "string" ? item.title : id;

            return (
              <li key={item.url} data-toc-id={id}>
                <a
                  href={item.url}
                  style={{ paddingLeft: indent || undefined }}
                  className={cn(
                    "wrap-break-word block py-1 text-[13px] leading-snug transition-colors",
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() =>
                    analytics.toc.linkClicked(titleText, item.depth)
                  }
                >
                  {item.title}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 shrink-0 space-y-4">
          <TOCActions markdownUrl={markdownUrl} githubEditUrl={githubEditUrl} />
          <TOCHiringBanner />
        </div>
      </div>
    </div>
  );
}
