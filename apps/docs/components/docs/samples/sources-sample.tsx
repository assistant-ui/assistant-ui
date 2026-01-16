"use client";

import { Sources } from "@/components/assistant-ui/sources";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

export function SourcesSample() {
  return (
    <SampleFrame className="flex h-auto flex-wrap items-center gap-2 p-6">
      <Sources
        type="source"
        sourceType="url"
        id="1"
        url="https://openai.com/research"
        title="OpenAI Research"
        status={{ type: "complete" }}
      />
      <Sources
        type="source"
        sourceType="url"
        id="2"
        url="https://github.com/assistant-ui/assistant-ui"
        status={{ type: "complete" }}
      />
      <Sources
        type="source"
        sourceType="url"
        id="3"
        url="https://react.dev/learn"
        title="React Docs"
        status={{ type: "complete" }}
      />
    </SampleFrame>
  );
}
