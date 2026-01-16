"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/dropdown-menu";
import { BASE_URL } from "@/lib/constants";

type PagerItem = {
  url: string;
};

type DocsPagerProps = {
  previous?: PagerItem;
  next?: PagerItem;
  markdownUrl?: string;
};

async function fetchMarkdown(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch markdown: ${response.status}`);
  }
  return response.text();
}

export function DocsPager({ previous, next, markdownUrl }: DocsPagerProps) {
  const handleCopy = async () => {
    if (!markdownUrl) return;
    try {
      const content = await fetchMarkdown(markdownUrl);
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

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
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonClass}>
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              icon={<Copy className="size-4" />}
              onClick={handleCopy}
            >
              Copy page
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={`${BASE_URL}${markdownUrl}`}
                target="_blank"
                rel="noreferrer noopener"
              >
                <FileText className="size-4" />
                View as Markdown
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
