"use client";

import "@assistant-ui/react-markdown/styles/typeset.css";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const sampleMarkdown = `## Markdown Rendering

This is a paragraph with **bold text**, *italic text*, and [links](#).

- First item
- Second item
- [x] Completed task
- [ ] Open task

> This is a blockquote with some quoted text.

| Name  | Value |
|-------|-------|
| Alpha | 100   |
| Beta  | 200   |

\`\`\`ts
const total = rows.reduce((sum, row) => sum + row.value, 0);
\`\`\`
`;

export const MarkdownSample = () => {
  return (
    <SampleFrame className="bg-background h-auto p-4">
      <div className="aui-md typeset text-(length:--typeset-size) text-inherit [--typeset-flow:1em] [--typeset-leading:1.6]">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {sampleMarkdown}
        </ReactMarkdown>
      </div>
    </SampleFrame>
  );
};
