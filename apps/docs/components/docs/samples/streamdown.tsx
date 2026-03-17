"use client";

import { useEffect, useState } from "react";
import { PlayIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import { Button } from "@/components/ui/button";

const sampleMarkdown = `## Streamdown Rendering

This is a paragraph with **bold text**, *italic text*, and [links](https://example.com).

- First item
- Second item
- Third item

> This is a blockquote with some quoted text.

| Name  | Value |
|-------|-------|
| Alpha | 100   |
| Beta  | 200   |

\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\`
`;

export const StreamdownSample = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  useEffect(() => {
    if (!isStreaming) return;

    setStreamedText("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < sampleMarkdown.length) {
        // Stream by chunks for more realistic effect
        const chunkSize = Math.floor(Math.random() * 3) + 1;
        setStreamedText(sampleMarkdown.slice(0, index + chunkSize));
        index += chunkSize;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [isStreaming]);

  const handleStart = () => {
    setStreamedText("");
    setIsStreaming(true);
  };

  return (
    <SampleFrame className="h-auto bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleStart}
          disabled={isStreaming}
          className="gap-1.5"
        >
          <PlayIcon className="size-3" />
          {isStreaming ? "Streaming..." : "Start Streaming"}
        </Button>
      </div>
      <Streamdown mode="streaming" isAnimating={isStreaming}>
        {streamedText || sampleMarkdown}
      </Streamdown>
    </SampleFrame>
  );
};
