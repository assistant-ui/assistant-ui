"use client";

import { useState } from "react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorList,
  ModelSelectorItem,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector.radix";
import { Badge } from "@/components/ui/radix/badge";
import { cn } from "@/lib/utils";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function ModelSelectorWithMetadata() {
  const models: ModelOption[] = [
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
    { id: "claude-opus-5", name: "Claude Opus 5" },
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash" },
  ];
  const capabilities: Record<string, string[]> = {
    "gpt-5.6-luna": ["Tools", "128K"],
    "gpt-5.6-sol": ["Vision", "Tools", "128K"],
    "claude-opus-5": ["Vision", "Tools", "1M"],
    "gemini-3.7-flash": ["Vision", "Tools", "2M"],
  };
  const [model, setModel] = useState("gpt-5.6-sol");

  return (
    <ModelSelectorRoot models={models} value={model} onValueChange={setModel}>
      <ModelSelectorTrigger />
      <ModelSelectorContent searchable={false}>
        <ModelSelectorList>
          {models.map((option, index) => (
            <ModelSelectorItem
              key={option.id}
              model={option}
              className={cn(
                "rounded-none",
                index === 0 && "rounded-t-lg",
                index === models.length - 1 && "rounded-b-lg",
              )}
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="truncate font-medium">{option.name}</span>
                <span className="flex gap-1">
                  {capabilities[option.id]?.map((capability) => (
                    <Badge key={capability} variant="secondary">
                      {capability}
                    </Badge>
                  ))}
                </span>
              </span>
            </ModelSelectorItem>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelectorRoot>
  );
}

export function ModelSelectorMetadataSample() {
  return (
    <SampleFrame className="flex h-auto min-h-48 items-center justify-center p-8">
      <ModelSelectorWithMetadata />
    </SampleFrame>
  );
}
