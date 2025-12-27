"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { codeToHtml } from "shiki";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import type { CodeBlockProps } from "../../schemas/code-block";
import { cn } from "../../utils/cn";
import { normalizeActionsConfig } from "../../utils/actions-config";
import { Button } from "../shared/button";
import { ActionButtons } from "../shared/action-buttons";
import { CodeBlockProgress } from "./code-block-progress";

const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  typescript: "TypeScript",
  javascript: "JavaScript",
  python: "Python",
  tsx: "TSX",
  jsx: "JSX",
  json: "JSON",
  bash: "Bash",
  shell: "Shell",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  sql: "SQL",
  yaml: "YAML",
  go: "Go",
  rust: "Rust",
  text: "Plain Text",
};

function getLanguageDisplayName(lang: string): string {
  return LANGUAGE_DISPLAY_NAMES[lang.toLowerCase()] || lang.toUpperCase();
}

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }, []);

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [copied]);

  return { copied, copy };
}

export interface CodeBlockComponentProps extends CodeBlockProps {
  /**
   * Theme mode for syntax highlighting.
   * If not provided, defaults to "light".
   * Use with next-themes or similar to get the current theme.
   */
  theme?: "light" | "dark";
}

export function CodeBlock({
  id,
  code,
  language = "text",
  filename,
  showLineNumbers = true,
  highlightLines,
  maxCollapsedLines,
  footerActions,
  onFooterAction,
  onBeforeFooterAction,
  isLoading,
  className,
  theme: themeProp,
}: CodeBlockComponentProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const theme = themeProp === "dark" ? "github-dark" : "github-light";

  // Generate highlighted HTML
  useEffect(() => {
    async function highlight() {
      if (!code) {
        setHighlightedHtml("");
        return;
      }

      try {
        const html = await codeToHtml(code, {
          lang: language,
          theme,
          transformers: [
            {
              line(node, line) {
                // Add line number data attribute
                node.properties["data-line"] = line;
                // Add highlight class if line is in highlightLines
                if (highlightLines?.includes(line)) {
                  node.properties["class"] =
                    `${node.properties["class"] || ""} highlighted-line`;
                }
              },
            },
          ],
        });
        setHighlightedHtml(html);
      } catch {
        // Fallback for unknown languages
        const escaped = code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        setHighlightedHtml(`<pre><code>${escaped}</code></pre>`);
      }
    }
    highlight();
  }, [code, language, theme, highlightLines]);

  const normalizedFooterActions = useMemo(
    () => normalizeActionsConfig(footerActions),
    [footerActions],
  );

  const lineCount = code.split("\n").length;
  const shouldCollapse = maxCollapsedLines && lineCount > maxCollapsedLines;
  const isCollapsed = shouldCollapse && !isExpanded;

  const handleCopy = useCallback(() => {
    copy(code);
  }, [code, copy]);

  if (isLoading) {
    return (
      <div
        className={cn("@container flex w-full min-w-80 flex-col gap-3", className)}
        data-tool-ui-id={id}
        aria-busy="true"
      >
        <div className="border-border bg-card overflow-hidden rounded-lg border shadow-xs">
          <CodeBlockProgress />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("@container flex w-full min-w-80 flex-col gap-3", className)}
      data-tool-ui-id={id}
      data-slot="code-block"
    >
      <div className="border-border bg-card overflow-hidden rounded-lg border shadow-xs">
        {/* Header */}
        <div className="bg-muted/50 flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              {getLanguageDisplayName(language)}
            </span>
            {filename && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-foreground text-xs font-medium">
                  {filename}
                </span>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="text-muted-foreground h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Code content */}
        <Collapsible open={!isCollapsed}>
          <div
            className={cn(
              "overflow-x-auto text-sm",
              showLineNumbers && "[&_.line]:pl-4 [&_pre]:pl-0",
              "[&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-4",
              "[&_.highlighted-line]:bg-primary/10 [&_.highlighted-line]:border-primary [&_.highlighted-line]:border-l-2",
              isCollapsed && "max-h-[200px] overflow-hidden",
            )}
          >
            {highlightedHtml ? (
              <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
            ) : (
              <pre className="p-4">
                <code>{code}</code>
              </pre>
            )}
          </div>

          {shouldCollapse && (
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full rounded-none border-t py-2"
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Show all {lineCount} lines
                  </>
                ) : (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Collapse
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          )}
        </Collapsible>
      </div>

      {/* Footer actions */}
      {normalizedFooterActions && (
        <div className="@container/actions">
          <ActionButtons
            actions={normalizedFooterActions.items}
            align={normalizedFooterActions.align}
            confirmTimeout={normalizedFooterActions.confirmTimeout}
            onAction={(actionId) => onFooterAction?.(actionId)}
            onBeforeAction={onBeforeFooterAction}
          />
        </div>
      )}
    </div>
  );
}
