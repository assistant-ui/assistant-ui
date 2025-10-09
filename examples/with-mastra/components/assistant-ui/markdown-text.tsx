import { MessagePrimitive } from "@assistant-ui/react";
import { memo } from "react";

const remarkGfm = require("remark-gfm");

const MarkdownText = memo(() => {
  return (
    <MessagePrimitive.Text
      components={{
        h1: ({ children }) => (
          <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>
        ),
        p: ({ children }) => <p className="mb-2">{children}</p>,
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2">{children}</ol>
        ),
        li: ({ children }) => <li className="mb-1">{children}</li>,
        code: ({ children }) => (
          <code className="bg-muted rounded px-1 py-0.5 text-sm font-mono">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted rounded p-2 mb-2 overflow-x-auto">
            <code className="text-sm font-mono">{children}</code>
          </pre>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-muted-foreground pl-4 italic">
            {children}
          </blockquote>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    />
  );
});

MarkdownText.displayName = "MarkdownText";

export { MarkdownText };