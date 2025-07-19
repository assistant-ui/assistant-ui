"use client";

import { useMessagePart } from "@assistant-ui/react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { FC, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Dynamic imports for KaTeX to avoid SSR issues
let katex: typeof import("katex") | null = null;
let katexLoaded = false;

const loadKatex = async () => {
  if (!katexLoaded) {
    katex = await import("katex");
    await import("katex/dist/katex.min.css");
    katexLoaded = true;
  }
  return katex;
};

/**
 * Props for the LaTeXText component
 */
export type LaTeXTextProps = SyntaxHighlighterProps & {
  className?: string;
  displayMode?: boolean;
};

/**
 * LaTeXText component for rendering LaTeX mathematical notation
 * Use it by passing to `componentsByLanguage` for latex in `markdown-text.tsx`
 *
 * @example
 * const MarkdownTextImpl = () => {
 *   return (
 *     <MarkdownTextPrimitive
 *       remarkPlugins={[remarkGfm]}
 *       className="aui-md"
 *       components={defaultComponents}
 *       componentsByLanguage={{
 *         latex: {
 *           SyntaxHighlighter: LaTeXText
 *         },
 *       }}
 *     />
 *   );
 * };
 */
export const LaTeXText: FC<LaTeXTextProps> = ({
  code,
  className,
  displayMode = true,
  node: _node,
  components: _components,
  language: _language,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Detect when this code block is complete
  const isComplete = useMessagePart((part) => {
    if (part.type !== "text") return false;

    // Find the position of this code block
    const codeIndex = part.text.indexOf(code);
    if (codeIndex === -1) return false;

    // Check if there are closing backticks immediately after this code block
    const afterCode = part.text.substring(codeIndex + code.length);

    // Look for the closing backticks - should be at the start or after a newline
    const closingBackticksMatch = afterCode.match(/^```|^\n```/);
    return closingBackticksMatch !== null;
  });

  useEffect(() => {
    if (!isComplete) return;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const katexModule = await loadKatex();
        if (!katexModule) {
          throw new Error("Failed to load KaTeX");
        }

        if (ref.current) {
          ref.current.innerHTML = katexModule.renderToString(code, {
            displayMode,
            throwOnError: false,
            errorColor: "#cc0000",
            strict: false,
            trust: false,
            macros: {
              "\\RR": "\\mathbb{R}",
              "\\NN": "\\mathbb{N}",
              "\\ZZ": "\\mathbb{Z}",
              "\\QQ": "\\mathbb{Q}",
              "\\CC": "\\mathbb{C}",
            },
          });
        }
      } catch (e) {
        console.warn("Failed to render LaTeX:", e);
        setError(e instanceof Error ? e.message : "Failed to render LaTeX");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isComplete, code, displayMode]);

  if (error) {
    return (
      <div className={cn("aui-latex-error", className)}>
        <span className="text-red-600">LaTeX Error: {error}</span>
        <pre className="mt-2 text-xs opacity-70">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "aui-latex-text",
        displayMode ? "aui-latex-display" : "aui-latex-inline",
        isLoading && "opacity-50",
        className
      )}
    >
      {isLoading && <span className="text-muted-foreground">Rendering LaTeX...</span>}
    </div>
  );
};

LaTeXText.displayName = "LaTeXText";

/**
 * Component for rendering inline LaTeX with remark-math plugin
 * This processes inline math delimited by $ signs
 */
export const InlineLaTeX: FC<{ value: string; className?: string }> = ({ 
  value, 
  className 
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const katexModule = await loadKatex();
        if (!katexModule || !ref.current) return;

        ref.current.innerHTML = katexModule.renderToString(value, {
          displayMode: false,
          throwOnError: false,
          errorColor: "#cc0000",
        });
        setIsLoaded(true);
      } catch (e) {
        console.warn("Failed to render inline LaTeX:", e);
      }
    })();
  }, [value]);

  return (
    <span
      ref={ref}
      className={cn("aui-latex-inline", className)}
      data-loaded={isLoaded}
    >
      {!isLoaded && value}
    </span>
  );
};

/**
 * Component for rendering display LaTeX with remark-math plugin
 * This processes display math delimited by $$ signs
 */
export const DisplayLaTeX: FC<{ value: string; className?: string }> = ({ 
  value, 
  className 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const katexModule = await loadKatex();
        if (!katexModule || !ref.current) return;

        ref.current.innerHTML = katexModule.renderToString(value, {
          displayMode: true,
          throwOnError: false,
          errorColor: "#cc0000",
        });
        setIsLoaded(true);
      } catch (e) {
        console.warn("Failed to render display LaTeX:", e);
      }
    })();
  }, [value]);

  return (
    <div
      ref={ref}
      className={cn("aui-latex-display", className)}
      data-loaded={isLoaded}
    >
      {!isLoaded && <pre>{value}</pre>}
    </div>
  );
};