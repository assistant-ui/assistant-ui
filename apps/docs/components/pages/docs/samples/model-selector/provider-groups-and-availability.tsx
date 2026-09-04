"use client";

import { useState } from "react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorList,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorEffort,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function ModelAvailabilitySelector() {
  const openaiModels: ModelOption[] = [
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", efforts: true },
  ];
  const anthropicModels: ModelOption[] = [
    { id: "claude-fable-5", name: "Claude Fable 5" },
    { id: "claude-opus-5", name: "Claude Opus 5", disabled: true },
  ];
  const [model, setModel] = useState("gpt-5.6-luna");

  return (
    <ModelSelectorRoot
      models={[...openaiModels, ...anthropicModels]}
      value={model}
      onValueChange={setModel}
    >
      <ModelSelectorTrigger />
      <ModelSelectorContent searchable={false}>
        <ModelSelectorList>
          <ModelSelectorGroup heading="OpenAI">
            {openaiModels.map((option) => (
              <ModelSelectorItem key={option.id} model={option} />
            ))}
          </ModelSelectorGroup>
          <ModelSelectorGroup heading="Anthropic">
            {anthropicModels.map((option) => (
              <ModelSelectorItem key={option.id} model={option} />
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
        <ModelSelectorEffort />
      </ModelSelectorContent>
    </ModelSelectorRoot>
  );
}

export function ModelSelectorGroupedSample() {
  return (
    <SampleFrame className="flex h-auto min-h-48 items-center justify-center p-8">
      <ModelAvailabilitySelector />
    </SampleFrame>
  );
}
