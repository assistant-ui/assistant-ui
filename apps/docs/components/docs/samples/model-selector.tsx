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
  ModelSelectorEffort,
  type ModelOption,
} from "@/components/assistant-ui/model-selector";
import { DEFAULT_MODEL_ID, getContextWindow } from "@/constants/model";
import { docsModelOptions } from "@/components/docs/assistant/docs-model-options";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  "google-ai-studio": "Google",
  grok: "xAI",
  groq: "Groq",
};

function providerOf(modelId: string): string {
  return modelId.includes("/") ? modelId.split("/")[0]! : "openai";
}

const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });

const models: ModelOption[] = docsModelOptions().map((model) => ({
  ...model,
  description: `${compactNumber.format(getContextWindow(model.id))} context window`,
  keywords: [PROVIDER_NAMES[providerOf(model.id)] ?? ""],
  efforts: true,
}));

const modelsByProvider = models.reduce<Map<string, ModelOption[]>>(
  (groups, model) => {
    const provider = PROVIDER_NAMES[providerOf(model.id)] ?? "Other";
    groups.set(provider, [...(groups.get(provider) ?? []), model]);
    return groups;
  },
  new Map(),
);

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  const [value, setValue] = useState<string>(DEFAULT_MODEL_ID);
  const [effort, setEffort] = useState<string>("medium");

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <ModelSelectorRoot
        models={models}
        value={value}
        onValueChange={setValue}
        effort={effort}
        onEffortChange={setEffort}
      >
        <ModelSelectorTrigger variant={variant} />
        <ModelSelectorContent />
      </ModelSelectorRoot>
    </div>
  );
}

function ComposedRow() {
  const [value, setValue] = useState<string>(DEFAULT_MODEL_ID);
  const [effort, setEffort] = useState<string>("medium");

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium">
        Composed: search + provider groups
      </span>
      <ModelSelectorRoot
        models={models}
        value={value}
        onValueChange={setValue}
        effort={effort}
        onEffortChange={setEffort}
      >
        <ModelSelectorTrigger />
        <ModelSelectorContent>
          <ModelSelectorSearch />
          <ModelSelectorList>
            <ModelSelectorEmpty />
            {[...modelsByProvider].map(([provider, providerModels]) => (
              <ModelSelectorGroup key={provider} heading={provider}>
                {providerModels.map((model) => (
                  <ModelSelectorItem key={model.id} model={model} />
                ))}
              </ModelSelectorGroup>
            ))}
          </ModelSelectorList>
          <ModelSelectorEffort />
        </ModelSelectorContent>
      </ModelSelectorRoot>
    </div>
  );
}

export function ModelSelectorSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-6 p-6">
      <VariantRow label="Outline (default)" variant="outline" />
      <VariantRow label="Ghost" variant="ghost" />
      <VariantRow label="Muted" variant="muted" />
      <ComposedRow />
    </SampleFrame>
  );
}
