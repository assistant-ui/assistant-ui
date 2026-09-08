"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BASE_URL } from "@/lib/constants";
import { useMarkdownCopy } from "@/hooks/use-markdown-copy";
import { ClaudeIcon } from "@/components/icons/claude";
import { McpIcon } from "@/components/icons/mcp";
import { OpenAILogo } from "@/components/assistant-ui/elements/logos";
import {
  CODEX_URL,
  DOCS_MCP_URL,
  copyTextToClipboard,
  getClaudePageUrl,
} from "@/lib/docs-page-actions";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";

type PagerItem = {
  url: string;
};

type DocsPagerProps = {
  previous?: PagerItem;
  next?: PagerItem;
  markdownUrl?: string;
  title: string;
};

function PageAction({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <span className="min-w-0">
      <span className="block text-sm font-medium whitespace-nowrap">
        {title}
      </span>
      <span className="text-muted-foreground block text-xs">{description}</span>
    </span>
  );
}

async function copyText(value: string, successMessage: string) {
  if (await copyTextToClipboard(value)) {
    toast.success(successMessage);
  } else {
    toast.error("Failed to copy");
  }
}

export function DocsPager({
  previous,
  next,
  markdownUrl,
  title,
}: DocsPagerProps) {
  const { copy, prefetch, isLoading } = useMarkdownCopy(markdownUrl);

  const buttonClass =
    "flex size-7 items-center justify-center rounded-md bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:size-8";
  const disabledClass =
    "flex size-7 items-center justify-center rounded-md bg-muted/30 text-muted-foreground/40 cursor-not-allowed sm:size-8";

  return (
    <div className="flex items-center gap-1">
      {previous ? (
        <Link href={previous.url} className={buttonClass}>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <div className={disabledClass}>
          <ChevronLeft className="size-4" />
        </div>
      )}
      {next ? (
        <Link href={next.url} className={buttonClass}>
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <div className={disabledClass}>
          <ChevronRight className="size-4" />
        </div>
      )}
      {markdownUrl && (
        <DropdownMenu onOpenChange={(open) => open && prefetch()}>
          <DropdownMenuTrigger
            aria-label="More page actions"
            className={buttonClass}
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              onClick={copy}
              disabled={isLoading}
            >
              <Copy className="mt-0.5 size-4" />
              <PageAction
                title={isLoading ? "Loading..." : "Copy page"}
                description="Markdown, ready to paste into an LLM"
              />
            </DropdownMenuItem>
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              render={
                <a
                  href={`${BASE_URL}${markdownUrl}`}
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              <FileText className="mt-0.5 size-4" />
              <PageAction
                title="View as Markdown"
                description="This page as plain text"
              />
            </DropdownMenuItem>
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              onClick={() => analytics.toc.actionClicked("claude")}
              render={
                <a
                  href={getClaudePageUrl(markdownUrl, title)}
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              <ClaudeIcon className="mt-0.5 size-4" />
              <PageAction
                title="Open in Claude"
                description="Ask Claude about this page"
              />
            </DropdownMenuItem>
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              onClick={() => analytics.toc.actionClicked("codex")}
              render={
                <a href={CODEX_URL} target="_blank" rel="noreferrer noopener" />
              }
            >
              <OpenAILogo className="mt-0.5 size-4" />
              <PageAction
                title="Open in Codex"
                description="Open Codex in ChatGPT"
              />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              onClick={() =>
                void copyText(DOCS_MCP_URL, "MCP server URL copied")
              }
            >
              <McpIcon className="mt-0.5 size-4" />
              <PageAction
                title="Copy MCP server URL"
                description="Use these docs from any MCP client"
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
