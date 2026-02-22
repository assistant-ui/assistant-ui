"use client";

import { useState } from "react";
import { FileText, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  maxLines?: number;
  className?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Simple syntax highlighting for common patterns
function highlightCode(
  code: string,
  _language?: string,
  showLineNumbers = true,
): React.ReactNode[] {
  const keywords =
    /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g;

  const lines = code.split("\n");

  return lines.map((line, i) => {
    // Escape HTML entities first to prevent XSS
    let highlighted = escapeHtml(line);

    const tokens: Array<[token: string, value: string]> = [];
    const stashToken = (value: string, className: string) => {
      const token = `@@HIGHLIGHT_${"x".repeat(tokens.length + 1)}@@`;
      tokens.push([token, `<span class="${className}">${value}</span>`]);
      return token;
    };

    // Strings
    highlighted = highlighted.replace(/(`[^`]*`|"[^"]*"|'[^']*')/g, (match) =>
      stashToken(match, "text-green-400"),
    );

    // Comments
    highlighted = highlighted.replace(/(\/\/.*$|#.*$)/g, (match) =>
      stashToken(match, "text-zinc-500"),
    );

    // Keywords
    highlighted = highlighted.replace(keywords, (match) =>
      stashToken(match, "text-purple-400"),
    );

    // Numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, (match) =>
      stashToken(match, "text-orange-400"),
    );

    for (const [token, value] of tokens) {
      highlighted = highlighted.replaceAll(token, value);
    }

    const lineNumberHtml = showLineNumbers
      ? `<span class="select-none pr-4 text-zinc-600 w-8 text-right shrink-0">${i + 1}</span>`
      : "";

    return (
      <div
        key={i}
        className="flex"
        dangerouslySetInnerHTML={{
          __html: `${lineNumberHtml}<span class="flex-1">${highlighted}</span>`,
        }}
      />
    );
  });
}

export function CodeViewer({
  code,
  language = "typescript",
  filename,
  showLineNumbers = true,
  maxLines = 20,
  className,
}: CodeViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const lines = code.split("\n");
  const hasMoreLines = lines.length > maxLines;
  const displayCode = isExpanded ? code : lines.slice(0, maxLines).join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 font-mono text-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-zinc-700 border-b bg-zinc-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          {filename && <span className="text-zinc-300">{filename}</span>}
          <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          {hasMoreLines && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-200"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code */}
      <div className="overflow-x-auto p-3">
        <pre className="text-zinc-300">
          {highlightCode(displayCode, language, showLineNumbers)}
        </pre>
        {!isExpanded && hasMoreLines && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="mt-2 flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ChevronDown className="h-3 w-3" />
            Show {lines.length - maxLines} more lines
          </button>
        )}
      </div>
    </div>
  );
}
