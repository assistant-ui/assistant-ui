"use client";

import { useState } from "react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorList,
  ModelSelectorItem,
  ModelSelectorEffort,
  type ModelOption,
} from "@/components/assistant-ui/model-selector";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function ModelSelectorWithEffort() {
  const models: ModelOption[] = [
    {
      id: "gpt-5.6-sol",
      name: "GPT-5.6 Sol",
      efforts: [
        { id: "minimal", name: "Minimal" },
        { id: "standard", name: "Standard" },
        { id: "extended", name: "Extended" },
      ],
    },
  ];
  const [model, setModel] = useState("gpt-5.6-sol");
  const [effort, setEffort] = useState("standard");

  return (
    <ModelSelectorRoot
      models={models}
      value={model}
      onValueChange={setModel}
      effort={effort}
      onEffortChange={setEffort}
    >
      <ModelSelectorTrigger className="w-[204px]" />
      <ModelSelectorContent searchable={false}>
        <ModelSelectorList>
          {models.map((option) => (
            <ModelSelectorItem key={option.id} model={option} />
          ))}
        </ModelSelectorList>
        <ModelSelectorEffort />
      </ModelSelectorContent>
    </ModelSelectorRoot>
  );
}

export function ModelSelectorEffortSample() {
  return (
    <SampleFrame className="flex h-auto min-h-48 items-center justify-center p-8">
      <ModelSelectorWithEffort />
    </SampleFrame>
  );
}
