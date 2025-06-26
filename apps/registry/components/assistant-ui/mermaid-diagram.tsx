"use client";

import { useMessagePart } from "@assistant-ui/react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import mermaid from "mermaid";
import { FC, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Props for the MermaidDiagram component
 */
export type MermaidDiagramProps = SyntaxHighlighterProps & {
  className?: string;
};

// Configure mermaid options here
mermaid.initialize({ theme: "default" });

/**
 * MermaidDiagram component for rendering Mermaid diagrams
 * Use it by passing to `componentsByLanguage` for mermaid in `markdown-text.tsx`
 *
 * @example
 * const MarkdownTextImpl = () => {
 *   return (
 *     <MarkdownTextPrimitive
 *       remarkPlugins={[remarkGfm]}
 *       className="aui-md"
 *       components={defaultComponents}
 *       componentsByLanguage={{
 *         mermaid: {
 *           SyntaxHighlighter: MermaidDiagram
 *         },
 *       }}
 *     />
 *   );
 * };
 */
export const MermaidDiagram: FC<MermaidDiagramProps> = ({
  code,
  className,
  node: _node,
  components: _components,
  language: _language,
}) => {
  const ref = useRef<HTMLPreElement>(null);

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
        const element = document.createElement("div");
        element.textContent = code;
        element.classList.add("mermaid");
        await mermaid.run({ nodes: [element] });
        if (ref.current) {
          ref.current.replaceChildren(element);
        }
      } catch (e) {
        console.warn("Failed to render Mermaid diagram:", e);
      }
    })();
  }, [isComplete, code]);

  return (
    <pre ref={ref} className={cn("aui-mermaid-diagram", className)}>
      Drawing diagram...
    </pre>
  );
};

MermaidDiagram.displayName = "MermaidDiagram";
