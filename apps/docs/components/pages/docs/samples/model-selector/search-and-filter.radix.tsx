"use client";

import { useState } from "react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorSearch,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  type ModelOption,
} from "@/components/assistant-ui/elements/model-selector.radix";
import {
  ClaudeLogo,
  GeminiLogo,
  OpenAILogo,
} from "@/components/assistant-ui/elements/logos";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

export function SearchableModelSelector() {
  const models: ModelOption[] = [
    {
      id: "gpt-5.6-luna",
      name: "GPT-5.6 Luna",
      keywords: ["OpenAI"],
      icon: <OpenAILogo />,
    },
    {
      id: "gpt-5.6-sol",
      name: "GPT-5.6 Sol",
      keywords: ["OpenAI"],
      icon: <OpenAILogo />,
    },
    {
      id: "claude-fable-5",
      name: "Claude Fable 5",
      keywords: ["Anthropic"],
      icon: <ClaudeLogo />,
    },
    {
      id: "claude-opus-5",
      name: "Claude Opus 5",
      keywords: ["Anthropic"],
      icon: <ClaudeLogo />,
    },
    {
      id: "gemini-3.7-flash",
      name: "Gemini 3.7 Flash",
      keywords: ["Google"],
      icon: <GeminiLogo />,
    },
  ];
  const [model, setModel] = useState("gpt-5.6-luna");

  return (
    <ModelSelectorRoot models={models} value={model} onValueChange={setModel}>
      <ModelSelectorTrigger />
      <ModelSelectorContent>
        <ModelSelectorSearch />
        <ModelSelectorList>
          <ModelSelectorEmpty>No matching models.</ModelSelectorEmpty>
          <ModelSelectorGroup>
            {models.map((option) => (
              <ModelSelectorItem key={option.id} model={option} />
            ))}
          </ModelSelectorGroup>
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelectorRoot>
  );
}

export function ModelSelectorSearchSample() {
  return (
    <SampleFrame className="flex h-auto min-h-48 items-center justify-center p-8">
      <SearchableModelSelector />
    </SampleFrame>
  );
}
