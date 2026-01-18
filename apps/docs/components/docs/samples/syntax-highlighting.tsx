"use client";

import { PrismAsyncLight } from "react-syntax-highlighter";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { CopyIcon } from "lucide-react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

PrismAsyncLight.registerLanguage("typescript", tsx);

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
        <PrismAsyncLight
          language="typescript"
          style={coldarkDark}
          customStyle={{
            margin: 0,
            width: "100%",
            background: "black",
            padding: "1rem",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: "0.5rem",
            borderBottomRightRadius: "0.5rem",
          }}
        >
          {sampleCode}
        </PrismAsyncLight>
      </div>
    </SampleFrame>
  );
};
