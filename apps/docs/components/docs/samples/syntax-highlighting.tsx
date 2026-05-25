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
    <SampleFrame className="bg-background h-auto p-4">
      <div className="overflow-hidden rounded-lg">
        <div className="bg-muted-foreground/15 text-foreground dark:bg-muted-foreground/20 flex items-center justify-between gap-4 rounded-t-lg px-4 py-2 text-sm font-semibold">
          <span className="lowercase">typescript</span>
          <button type="button" className="hover:bg-muted rounded p-1">
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
