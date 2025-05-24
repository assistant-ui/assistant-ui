"use client";

import { useContentPart } from "@assistant-ui/react";
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

  // Detect when this specific code block is complete (not the whole message)
  const isComplete = useContentPart((part) => {
    if (part.type !== "text") return false;
    return part.text.split(code)[1]?.includes("```");
  });

  useEffect(() => {
    if (!isComplete) return;

    (async () => {
      try {
        const element = document.createElement("div");
        element.innerHTML = code;
        element.classList.add("mermaid");
        ref.current!.replaceChildren(element);
        await mermaid.run({ nodes: [element] });
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
