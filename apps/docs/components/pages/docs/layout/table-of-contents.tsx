"use client";

import { useEffect, type ReactNode } from "react";
import { DocsTableOfContents } from "@assistant-ui/docs-theme/ui";
import { Copy, EditIcon, FileText, SparklesIcon } from "lucide-react";
import { BASE_URL } from "@/lib/constants";
import { useMarkdownCopy } from "@/hooks/use-markdown-copy";
import { useAssistantPanel } from "@/components/pages/docs/assistant/context";
import { useCurrentPage } from "@/components/pages/docs/contexts/current-page";
import { analytics } from "@/lib/analytics";
import { usePlatformMarkdownUrl } from "@/hooks/use-platform-markdown-url";

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

type TableOfContentsProps = {
  items: TOCItem[];
  githubEditUrl?: string;
  markdownUrl?: string;
  platformAwareMarkdown?: boolean;
};

function TOCActions({
  markdownUrl,
  githubEditUrl,
  platformAwareMarkdown,
}: {
  markdownUrl: string | undefined;
  githubEditUrl: string | undefined;
  platformAwareMarkdown: boolean;
}) {
  const resolvedMarkdownUrl = usePlatformMarkdownUrl(
    markdownUrl,
    platformAwareMarkdown,
  );
  const { copy, prefetch, isLoading } = useMarkdownCopy(resolvedMarkdownUrl);
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
            type="button"
            onClick={handleCopy}
            disabled={isLoading}
            className={linkClass}
          >
            <Copy className="size-3" />
            {isLoading ? "Loading..." : "Copy page"}
          </button>
          <a
            href={`${BASE_URL}${resolvedMarkdownUrl}`}
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
      <button type="button" onClick={handleAskAIClick} className={linkClass}>
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
  platformAwareMarkdown = false,
}: TableOfContentsProps) {
  return (
    <DocsTableOfContents items={items}>
      <TOCActions
        markdownUrl={markdownUrl}
        githubEditUrl={githubEditUrl}
        platformAwareMarkdown={platformAwareMarkdown}
      />
    </DocsTableOfContents>
  );
}
