"use client";

import { useAuiState } from "@assistant-ui/react";
import type { ReactNode } from "react";

function isCited(text: string, url: string): boolean {
  let from = 0;
  for (;;) {
    const at = text.indexOf(url, from);
    if (at === -1) return false;
    const next = text[at + url.length];
    if (next === undefined || !/[\w#?/-]/.test(next)) return true;
    from = at + url.length;
  }
}

function sourceLabel(url: string, title: string | undefined): string {
  if (title) return title;
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function Sources(): ReactNode {
  const content = useAuiState((s) => s.message.content);
  const text = content
    .flatMap((part) => (part.type === "text" ? part.text : []))
    .join("\n");
  const seen = new Set<string>();
  const sources = content.flatMap((part) => {
    if (
      part.type !== "source" ||
      part.sourceType !== "url" ||
      seen.has(part.url) ||
      !isCited(text, part.url)
    ) {
      return [];
    }
    seen.add(part.url);
    return part;
  });
  if (sources.length === 0) return null;

  return (
    <div className="text-muted-foreground mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[12px] [font-variant-ligatures:none]">
      <span className="text-muted-foreground/50">sources</span>
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="decoration-foreground/20 hover:text-foreground hover:decoration-foreground/60 max-w-[40ch] truncate underline underline-offset-[3px] transition-colors"
        >
          {sourceLabel(source.url, source.title)}
        </a>
      ))}
    </div>
  );
}
