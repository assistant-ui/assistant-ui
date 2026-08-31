"use client";

import { useEffect, useState } from "react";
import { PlayIcon } from "lucide-react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";
import { Button } from "@/components/ui/button";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function StreamingMarkdown() {
  const streamingMarkdown = `## Release checklist

The renderer updates while tokens arrive:

- [x] Parse headings
- [x] Keep lists stable
- [ ] Finish the response

Current status: **streaming safely**.`;
  const [text, setText] = useState(streamingMarkdown);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!isStreaming) return;

    let index = 0;
    const interval = window.setInterval(() => {
      index = Math.min(index + 3, streamingMarkdown.length);
      setText(streamingMarkdown.slice(0, index));
      if (index === streamingMarkdown.length) {
        setIsStreaming(false);
        window.clearInterval(interval);
      }
    }, 25);

    return () => window.clearInterval(interval);
  }, [isStreaming, streamingMarkdown]);

  const replay = () => {
    setText("");
    setIsStreaming(true);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Button
        className="w-fit gap-1.5"
        disabled={isStreaming}
        onClick={replay}
        size="sm"
        variant="outline"
      >
        <PlayIcon className="size-3.5" />
        {isStreaming ? "Streaming…" : "Replay"}
      </Button>
      <TextMessagePartProvider text={text} isRunning={isStreaming}>
        <MarkdownText />
      </TextMessagePartProvider>
    </div>
  );
}

export function MarkdownStreamingSample() {
  return (
    <SampleFrame className="bg-background h-auto min-h-96 p-6">
      <div className="mx-auto w-full max-w-2xl">
        <StreamingMarkdown />
      </div>
    </SampleFrame>
  );
}
