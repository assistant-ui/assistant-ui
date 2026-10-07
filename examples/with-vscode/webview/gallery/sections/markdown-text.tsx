import { MarkdownText } from "@assistant-ui/ui/components/assistant-ui/elements/markdown-text.tsx";
import { defineSections } from "../types";
import { SeededMessages } from "../runtime";

const MARKDOWN = `## Streaming over the bridge

The webview reaches the host through **\`vscodeFetch\`**, which tunnels each request over \`postMessage\`. See [the guide](https://www.assistant-ui.com/docs/guides/vscode).

1. The webview posts the request
2. The host runs the route handler
   - \`req.signal\` aborts with the webview
   - the response body streams back
3. The runtime renders the stream

\`\`\`ts
export async function POST(req: Request): Promise<Response> {
  const { messages } = await req.json();
  return Response.json({ count: messages.length, echoedFromTheExtensionHost: true });
}
\`\`\`

| Route | Method | Runtime |
| --- | --- | --- |
| /api/chat | POST | useChatRuntime with AssistantChatTransport |

> Inline math such as $e^{i\\pi} + 1 = 0$ stays literal: MarkdownText ships remark-gfm only.

---

A final paragraph with a footnote-style ~~strikethrough~~ and a long unbroken token: aui-vscode-webview-bridge-request-identifier-0123456789abcdef.`;

export default defineSections([
  {
    id: "markdown-text",
    title: "Markdown text",
    category: "content",
    notes:
      "Headings, emphasis, link, nested list, fenced code, GFM table, block quote, rule. No math plugin is wired.",
    render: () => (
      <SeededMessages
        messages={[
          { role: "user", content: "Explain the fetch bridge." },
          { role: "assistant", content: MARKDOWN },
        ]}
        components={{ Text: MarkdownText }}
      />
    ),
  },
]);
