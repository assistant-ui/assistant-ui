import { MermaidDiagram } from "@assistant-ui/ui/components/assistant-ui/elements/mermaid-diagram.tsx";
import { MermaidDiagram as AuiMermaidDiagram } from "@assistant-ui/ui/components/assistant-ui/elements/mermaid-diagram.aui.tsx";
import { MarkdownText } from "@assistant-ui/ui/components/assistant-ui/elements/markdown-text.tsx";
import type { TextMessagePartProps } from "@assistant-ui/react";
import type { ComponentProps } from "react";
import { defineSections } from "../types";
import { SeededMessages } from "../runtime";
import { ClickWhenAlone } from "./_open-when-alone";

const FLOW = `graph TD
  W[Webview] -->|postMessage| H[Extension host]
  H -->|route handler| R[Response stream]
  R -->|chunks| W`;

const SEQUENCE = `sequenceDiagram
  participant W as Webview
  participant H as Host
  W->>H: fetch /api/chat
  H-->>W: text-delta
  H-->>W: finish`;

const MARKDOWN = `The request travels like this:

\`\`\`mermaid
${FLOW}
\`\`\`

Every chunk takes the same path back.`;

type CodeBlockProps = ComponentProps<typeof AuiMermaidDiagram>;

/** MarkdownText exposes no componentsByLanguage, so the code slot picks by language. */
function MermaidOrCode(props: CodeBlockProps) {
  if (props.language === "mermaid") return <AuiMermaidDiagram {...props} />;
  const { Pre, Code } = props.components;
  return (
    <Pre>
      <Code>{props.code}</Code>
    </Pre>
  );
}

const MermaidMarkdownText = (props: TextMessagePartProps) => (
  <MarkdownText {...props} components={{ SyntaxHighlighter: MermaidOrCode }} />
);

export default defineSections([
  {
    id: "mermaid-diagram",
    title: "Mermaid diagram",
    category: "content",
    notes:
      "beautiful-mermaid renders an SVG string (with its own <style>) through dangerouslySetInnerHTML.",
    render: () => (
      <div className="flex flex-col gap-3">
        <MermaidDiagram code={FLOW} />
        <MermaidDiagram code={SEQUENCE} />
      </div>
    ),
  },
  {
    id: "mermaid-diagram-states",
    title: "Mermaid diagram states",
    category: "content",
    notes:
      "Streaming skeleton, then the fallback for source that fails to parse.",
    render: () => (
      <div className="flex flex-col gap-3">
        <MermaidDiagram code={FLOW} streaming />
        <MermaidDiagram code={"graph TD\n  A --> "} />
      </div>
    ),
  },
  {
    id: "mermaid-diagram-zoom",
    title: "Mermaid diagram (zoom open)",
    category: "content",
    notes:
      "The fullscreen zoom overlay, opened when this section is shown alone (the overlay is fixed and would cover the gallery).",
    render: () => (
      <ClickWhenAlone
        id="mermaid-diagram-zoom"
        selector='[data-slot="mermaid-zoom-trigger"]'
      >
        <MermaidDiagram code={FLOW} />
      </ClickWhenAlone>
    ),
  },
  {
    id: "mermaid-diagram-aui",
    title: "Mermaid diagram (in markdown)",
    category: "content",
    notes:
      "mermaid-diagram.aui as MarkdownText's code block for the mermaid language.",
    render: () => (
      <SeededMessages
        messages={[
          { role: "user", content: "Draw the request path." },
          { role: "assistant", content: MARKDOWN },
        ]}
        components={{ Text: MermaidMarkdownText }}
      />
    ),
  },
]);
