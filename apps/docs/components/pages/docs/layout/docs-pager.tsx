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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BASE_URL } from "@/lib/constants";
import { useMarkdownCopy } from "@/hooks/use-markdown-copy";
import { usePlatformMarkdownUrl } from "@/hooks/use-platform-markdown-url";

type PagerItem = {
  url: string;
};

type DocsPagerProps = {
  previous?: PagerItem;
  next?: PagerItem;
  markdownUrl?: string;
  platformAwareMarkdown?: boolean;
};

export function DocsPager({
  previous,
  next,
  markdownUrl,
  platformAwareMarkdown = false,
}: DocsPagerProps) {
  const resolvedMarkdownUrl = usePlatformMarkdownUrl(
    markdownUrl,
    platformAwareMarkdown,
  );
  const { copy, prefetch, isLoading } = useMarkdownCopy(resolvedMarkdownUrl);

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
          <DropdownMenuTrigger className={buttonClass}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-max">
            <DropdownMenuItem onClick={copy} disabled={isLoading}>
              <Copy className="size-4" />
              {isLoading ? "Loading..." : "Copy page"}
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a
                  href={`${BASE_URL}${resolvedMarkdownUrl}`}
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              <FileText className="size-4" />
              View as Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
