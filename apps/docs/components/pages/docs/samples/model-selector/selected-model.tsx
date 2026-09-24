"use client";

import { useState } from "react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function SelectableModel() {
  const models: ModelOption[] = [
    { id: "gpt-6-luna", name: "GPT-6 Luna" },
    { id: "gpt-6-astra", name: "GPT-6 Astra", efforts: true },
  ];
  const [value, setValue] = useState("gpt-6-astra");
  const [effort, setEffort] = useState<string>("high");

  return (
    <ModelSelectorRoot
      models={models}
      value={value}
      onValueChange={setValue}
      effort={effort}
      onEffortChange={setEffort}
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
