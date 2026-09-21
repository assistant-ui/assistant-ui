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
    { id: "gpt-5.6-luna", name: "GPT-5.6 Luna" },
    { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", efforts: true },
  ];
  const [value, setValue] = useState("gpt-5.6-sol");
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
