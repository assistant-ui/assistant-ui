"use client";

import { useState } from "react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorList,
  ModelSelectorItem,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function ModelSelectorWithMetadata() {
  const models: ModelOption[] = [
    { id: "gpt-6-luna", name: "GPT-6 Luna" },
    { id: "gpt-6-astra", name: "GPT-6 Astra" },
    { id: "claude-opus-5-5", name: "Claude Opus 5.5" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" },
  ];
  const capabilities: Record<string, string[]> = {
    "gpt-6-luna": ["Tools", "1M"],
    "gpt-6-astra": ["Vision", "Tools", "1M"],
    "claude-opus-5-5": ["Vision", "Tools", "1M"],
    "gemini-3.8-flash": ["Vision", "Tools", "1M"],
  };
  const [model, setModel] = useState("gpt-6-astra");

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
