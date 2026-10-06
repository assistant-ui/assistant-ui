"use client";

import {
  MoreHorizontal,
  Copy,
  FileText,
  Edit,
  MessageSquare,
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
  getClaudePageUrl,
} from "@/lib/docs-page-actions";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { analytics } from "@/lib/analytics";
import { toast } from "sonner";
import { usePlatformMarkdownUrl } from "@/hooks/use-platform-markdown-url";
import { useGlobalAskAI } from "@/components/pages/docs/assistant/context";
import { useCurrentPage } from "@/components/pages/docs/contexts/current-page";

type DocsPagerProps = {
  markdownUrl?: string;
  githubEditUrl?: string;
  title: string;
  platformAwareMarkdown?: boolean;
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
  markdownUrl,
  githubEditUrl,
  title,
  platformAwareMarkdown = false,
}: DocsPagerProps) {
  const resolvedMarkdownUrl = usePlatformMarkdownUrl(
    markdownUrl,
    platformAwareMarkdown,
  );
  const { copy, prefetch, isLoading } = useMarkdownCopy(resolvedMarkdownUrl);
  const askAI = useGlobalAskAI();
  const currentPage = useCurrentPage();

  const handleCopy = () => {
    analytics.pageActions.actionClicked("copy");
    copy();
  };

  const buttonClass =
    "flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control px-2 text-muted-foreground transition-colors hover:bg-foreground/[0.025] hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2";

  return (
    <div className="flex items-center gap-1">
      {resolvedMarkdownUrl && (
        <DropdownMenu onOpenChange={(open) => open && prefetch()}>
          <DropdownMenuTrigger
            aria-label="More page actions"
            className={buttonClass}
          >
            <span className="hidden text-sm sm:inline">Page actions</span>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {askAI && (
              <DropdownMenuItem
                className="gap-3 py-3"
                onClick={() => {
                  analytics.toc.actionClicked("ask_ai");
                  askAI(`Explain ${currentPage?.pathname ?? "this page"}`);
                }}
              >
                <MessageSquare className="size-4" />
                Ask about this page
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              onClick={handleCopy}
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
              onClick={() => analytics.pageActions.actionClicked("markdown")}
              render={
                <a
                  href={`${BASE_URL}${resolvedMarkdownUrl}`}
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
              onClick={() => analytics.pageActions.actionClicked("claude")}
              render={
                <a
                  href={getClaudePageUrl(resolvedMarkdownUrl, title)}
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
              onClick={() => analytics.pageActions.actionClicked("codex")}
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
            {githubEditUrl && (
              <DropdownMenuItem
                className="gap-3 py-3"
                onClick={() => analytics.toc.actionClicked("github")}
                render={
                  <a
                    href={githubEditUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  />
                }
              >
                <Edit className="size-4" />
                Edit on GitHub
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="items-start gap-3 py-2"
              onClick={() => {
                analytics.pageActions.actionClicked("mcp");
                void copyText(DOCS_MCP_URL, "MCP server URL copied");
              }}
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
