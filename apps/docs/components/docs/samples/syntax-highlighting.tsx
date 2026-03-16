"use client";

import { CopyIcon } from "lucide-react";
import { SyntaxHighlighter } from "@/components/assistant-ui/shiki-highlighter";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const sampleCode = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}

// Usage
const message = greet("World");`;

export const SyntaxHighlightingSample = () => {
  return (
    <SampleFrame className="h-auto bg-background p-4">
      <div className="overflow-hidden rounded-lg">
        <div className="flex items-center justify-between gap-4 rounded-t-lg bg-muted-foreground/15 px-4 py-2 font-semibold text-foreground text-sm dark:bg-muted-foreground/20">
          <span className="lowercase">typescript</span>
          <button className="rounded p-1 hover:bg-muted">
            <CopyIcon className="size-4" />
          </button>
        </div>
        <SyntaxHighlighter
          language="typescript"
          code={sampleCode}
          addDefaultStyles={false}
        />
      </div>
    </SampleFrame>
  );
};
