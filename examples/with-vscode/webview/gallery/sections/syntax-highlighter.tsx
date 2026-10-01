import { SyntaxHighlighter } from "@assistant-ui/ui/components/assistant-ui/elements/syntax-highlighter.tsx";
import { MarkdownText } from "@assistant-ui/ui/components/assistant-ui/elements/markdown-text.tsx";
import type { TextMessagePartProps } from "@assistant-ui/react";
import { defineSections } from "../types";
import { SeededMessages } from "../runtime";

const CODE = `import type { ChatModelAdapter } from "@assistant-ui/react";

export const echo: ChatModelAdapter = {
  async *run({ messages }) {
    const last = messages.at(-1);
    yield { content: [{ type: "text", text: \`echo: \${JSON.stringify(last)}\` }] };
  },
};`;

const MARKDOWN = `Prism highlights both registered languages:

\`\`\`tsx
${CODE}
\`\`\`

\`\`\`python
def handler(request):
    return {"messages": len(request.json()["messages"])}
\`\`\``;

const PrismMarkdownText = (props: TextMessagePartProps) => (
  <MarkdownText {...props} components={{ SyntaxHighlighter }} />
);

export default defineSections([
  {
    id: "syntax-highlighter",
    title: "Syntax highlighter (Prism)",
    category: "content",
    notes:
      "react-syntax-highlighter's PrismAsyncLight with Coldark light and dark, standalone with pass-through Pre and Code.",
    render: () => (
      <SyntaxHighlighter
        language="tsx"
        code={CODE}
        components={{
          Pre: (props) => <pre {...props} />,
          Code: (props) => <code {...props} />,
        }}
      />
    ),
  },
  {
    id: "syntax-highlighter-markdown",
    title: "Syntax highlighter (in MarkdownText)",
    category: "content",
    notes: "As MarkdownText's SyntaxHighlighter: tsx and python blocks.",
    render: () => (
      <SeededMessages
        messages={[
          { role: "user", content: "Show an adapter and a handler." },
          { role: "assistant", content: MARKDOWN },
        ]}
        components={{ Text: PrismMarkdownText }}
      />
    ),
  },
]);
