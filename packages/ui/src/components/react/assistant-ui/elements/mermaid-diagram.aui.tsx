"use client";

import { memo, type FC } from "react";
import { useAuiState } from "@assistant-ui/react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import {
  MermaidDiagram as MermaidDiagramBase,
  MermaidZoom,
} from "./mermaid-diagram";

export type MermaidDiagramProps = SyntaxHighlighterProps & {
  className?: string;
};

/**
 * Use it by passing to `componentsByLanguage` for mermaid in `markdown-text.tsx`.
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
const MermaidDiagramImpl: FC<MermaidDiagramProps> = ({
  code,
  className,
  node: _node,
  components: _components,
  language: _language,
}) => {
  const isStreaming = useAuiState(
    (s) => s.optional.part?.status.type === "running",
  );

  return (
    <MermaidDiagramBase
      code={code}
      {...(className !== undefined ? { className } : {})}
      streaming={isStreaming}
    />
  );
};

const MermaidDiagram = memo(
  MermaidDiagramImpl,
) as unknown as FC<MermaidDiagramProps> & {
  Zoom: typeof MermaidZoom;
};

MermaidDiagram.displayName = "MermaidDiagram";
MermaidDiagram.Zoom = MermaidZoom;

export { MermaidDiagram, MermaidZoom };
