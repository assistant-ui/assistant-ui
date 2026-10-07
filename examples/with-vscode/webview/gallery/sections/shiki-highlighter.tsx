import { createJavaScriptRegexEngine } from "react-shiki";
import { SyntaxHighlighter } from "@assistant-ui/ui/components/assistant-ui/elements/shiki-highlighter.tsx";
import { SyntaxHighlighter as AuiSyntaxHighlighter } from "@assistant-ui/ui/components/assistant-ui/elements/shiki-highlighter.aui.tsx";
import { MarkdownText } from "@assistant-ui/ui/components/assistant-ui/elements/markdown-text.tsx";
import type { TextMessagePartProps } from "@assistant-ui/react";
import { defineSections } from "../types";
import { SeededMessages } from "../runtime";

const CODE = `import { vscodeFetch } from "@assistant-ui/vscode/webview";

export async function ask(prompt: string): Promise<string> {
  const res = await vscodeFetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(\`bridge failed with \${res.status}\`);
  return res.text();
}`;

const jsEngine = createJavaScriptRegexEngine();

const MARKDOWN = `Here is the handler, highlighted by Shiki once the part settles:

\`\`\`ts
${CODE}
\`\`\`

And the matching config:

\`\`\`json
{ "auiTest.csp": "strict", "auiTest.runtime": "ai-sdk" }
\`\`\``;

const ShikiMarkdownText = (props: TextMessagePartProps) => (
  <MarkdownText
    {...props}
    components={{ SyntaxHighlighter: AuiSyntaxHighlighter }}
  />
);

export default defineSections([
  {
    id: "shiki-highlighter",
    title: "Shiki highlighter (default engine)",
    category: "content",
    notes:
      "Standalone, with the kit's default JavaScript regex engine, so it loads no WASM and needs no 'wasm-unsafe-eval'.",
    render: () => <SyntaxHighlighter language="ts" code={CODE} delay={0} />,
  },
  {
    id: "shiki-highlighter-js-engine",
    title: "Shiki highlighter (JavaScript engine)",
    category: "content",
    notes:
      "Same code with engine={createJavaScriptRegexEngine()}, which needs no WASM; highlightLines marks lines 4 and 8. The kit keeps one highlighter per engine, so the explicit engine is honored whatever rendered first.",
    render: () => (
      <SyntaxHighlighter
        language="ts"
        code={CODE}
        delay={0}
        engine={jsEngine}
        highlightLines={[4, 8]}
      />
    ),
  },
  {
    id: "shiki-highlighter-streaming",
    title: "Shiki highlighter (streaming)",
    category: "content",
    notes: "streaming renders the plain code in the same container.",
    render: () => <SyntaxHighlighter language="ts" code={CODE} streaming />,
  },
  {
    id: "shiki-highlighter-aui",
    title: "Shiki highlighter (in MarkdownText)",
    category: "content",
    notes:
      "shiki-highlighter.aui as MarkdownText's SyntaxHighlighter over a settled message (default engine).",
    render: () => (
      <SeededMessages
        messages={[
          { role: "user", content: "Show me the bridge call." },
          { role: "assistant", content: MARKDOWN },
        ]}
        components={{ Text: ShikiMarkdownText }}
      />
    ),
  },
]);
