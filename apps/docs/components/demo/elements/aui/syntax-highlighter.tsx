"use client";

import { CopyIcon } from "lucide-react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { SyntaxHighlighter as PrismSyntaxHighlighter } from "@/components/assistant-ui/elements/syntax-highlighter";
import { DemoSurface } from "./surface";

const sampleCode = `export function Assistant() {
  return <Thread />;
}`;

const syntaxComponents: SyntaxHighlighterProps["components"] = {
  Pre: ({ node: _, ...props }) => <pre {...props} />,
  Code: ({ node: _, ...props }) => <code {...props} />,
};

export function AuiSyntaxHighlighterDemo() {
  return (
    <DemoSurface>
      <div className="w-full max-w-xl overflow-hidden rounded-xl">
        <div className="bg-muted text-muted-foreground flex items-center justify-between px-4 py-2 text-xs">
          <span>tsx</span>
          <CopyIcon className="size-3.5" />
        </div>
        <PrismSyntaxHighlighter
          language="tsx"
          code={sampleCode}
          components={syntaxComponents}
        />
      </div>
    </DemoSurface>
  );
}
