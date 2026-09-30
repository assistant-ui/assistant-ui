import { useState } from "react";
import {
  Sources,
  type Source,
} from "@assistant-ui/ui/components/assistant-ui/elements/sources.tsx";
import { Sources as SourcePart } from "@assistant-ui/ui/components/assistant-ui/elements/sources.aui.tsx";
import { MarkdownText } from "@assistant-ui/ui/components/assistant-ui/elements/markdown-text.tsx";
import { defineSections } from "../types";
import { SeededMessages } from "../runtime";

const SOURCES: Source[] = [
  {
    title: "Webview API",
    url: "https://code.visualstudio.com/api/extension-guides/webview",
    snippet: "Webviews talk to the extension through message passing.",
    author: "VS Code",
  },
  {
    title: "Content Security Policy (CSP)",
    url: "https://developer.mozilla.org/docs/Web/HTTP/CSP",
    snippet: "Controls which resources the user agent may load for a page.",
  },
  {
    title:
      "core: InMemoryThreadList carries one thread's composer into the next one when switching",
    url: "https://github.com/assistant-ui/assistant-ui/issues/8046",
    publishedAt: "2026-09-23",
  },
];

function Controlled({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return <Sources sources={SOURCES} open={open} onOpenChange={setOpen} />;
}

export default defineSections([
  {
    id: "sources",
    title: "Sources",
    category: "content",
    notes: "The collapsed source badge row.",
    render: () => <Controlled initialOpen={false} />,
  },
  {
    id: "sources-open",
    title: "Sources (expanded)",
    category: "content",
    notes: "Expanded source cards with snippet, author and date.",
    render: () => <Controlled initialOpen />,
  },
  {
    id: "sources-aui",
    title: "Sources (message parts)",
    category: "content",
    notes:
      "sources.aui as the Source part renderer: URL sources become links, a document source a badge.",
    render: () => (
      <SeededMessages
        messages={[
          { role: "user", content: "Where does the CSP come from?" },
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "The webview's CSP is set by the extension in a meta tag.",
              },
              {
                type: "source",
                sourceType: "url",
                id: "s1",
                url: "https://code.visualstudio.com/api/extension-guides/webview",
                title: "Webview API",
              },
              {
                type: "source",
                sourceType: "url",
                id: "s2",
                url: "https://developer.mozilla.org/docs/Web/HTTP/CSP",
              },
              {
                type: "source",
                sourceType: "document",
                id: "s3",
                title: "webview-security.pdf",
                mediaType: "application/pdf",
              },
            ],
          },
        ]}
        components={{ Text: MarkdownText, Source: SourcePart }}
      />
    ),
  },
]);
