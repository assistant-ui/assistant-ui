"use client";

import { useState } from "react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  type ModelOption,
} from "@/components/assistant-ui/model-selector.radix";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

const models: ModelOption[] = [
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", efforts: true },
];

export function SelectableModel() {
  const [model, setModel] = useState("gpt-5.6-sol");

  return (
    <ModelSelectorRoot
      models={models}
      value={model}
      onValueChange={setModel}
      defaultEffort="high"
    >
      <ModelSelectorTrigger />
      <ModelSelectorContent />
    </ModelSelectorRoot>
  );
}

export function ModelSelectorSelectedSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center p-8">
      <SelectableModel />
    </SampleFrame>
  );
}
