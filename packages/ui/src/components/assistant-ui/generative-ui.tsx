"use client";

import { z } from "zod";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GenerativeUILibrary } from "@assistant-ui/react-generative-ui";
import { defaultGenerativeUILibrary } from "@assistant-ui/react-generative-ui";

/** `MarkdownTextPrimitive` cannot be reused here: it reads from message-part context, not a prop string. */
export const styledGenerativeUILibrary: GenerativeUILibrary = {
  ...defaultGenerativeUILibrary,
  Markdown: {
    description: "A markdown string, rendered with GitHub-flavored markdown.",
    properties: z.object({
      value: z.string().describe("Markdown source."),
    }),
    streamProperties: true,
    render: ({ value, children }) => (
      <div data-aui="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value ?? ""}</ReactMarkdown>
        {children}
      </div>
    ),
  },
};
