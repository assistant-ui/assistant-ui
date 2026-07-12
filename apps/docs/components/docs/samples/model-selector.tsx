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
import { cn } from "@/lib/utils";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";

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

const EFFORT_SUPPORTED_MODELS = new Set([
  "gpt-5.4-nano",
  "gpt-5.4-mini",
  "grok/grok-3-mini",
]);

const models: ModelOption[] = [];
const modelsByProvider = new Map<string, ModelOption[]>();
for (const option of docsModelOptions()) {
  const provider = PROVIDER_NAMES[providerOf(option.id)] ?? "Other";
  const model: ModelOption = {
    ...option,
    description: `${compactNumber.format(getContextWindow(option.id))} context window`,
    keywords: [provider],
    ...(EFFORT_SUPPORTED_MODELS.has(option.id) ? { efforts: true } : undefined),
  };
  models.push(model);
  const group = modelsByProvider.get(provider);
  if (group) {
    group.push(model);
  } else {
    modelsByProvider.set(provider, [model]);
  }
}

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
    <div className="flex flex-col items-center gap-2">
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
  const [providerFilter, setProviderFilter] = useState<ReadonlySet<string>>(
    new Set(),
  );

  // An empty filter means no filtering — all providers are shown.
  const visibleGroups = [...modelsByProvider].filter(
    ([provider]) => providerFilter.size === 0 || providerFilter.has(provider),
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-muted-foreground text-xs font-medium">
        With search, provider filters + groups
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
          <ToggleGroupPrimitive.Root
            type="multiple"
            orientation="horizontal"
            value={[...providerFilter]}
            onValueChange={(next) => setProviderFilter(new Set(next))}
            aria-label="Filter by provider"
            className="flex flex-wrap gap-1 border-b px-3 py-2"
            onKeyDown={(e) => {
              // Keep cmdk's root handler from claiming Enter (the focused
              // chip toggles instead of selecting the highlighted model) and
              // Home/End (the roving focus group jumps chips, not the list).
              if (e.key === "Enter" || e.key === "Home" || e.key === "End") {
                e.stopPropagation();
              }
              // Vertical arrows hand focus back to the model list, matching
              // the packaged Thinking row.
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.currentTarget
                  .closest("[cmdk-root]")
                  ?.querySelector<HTMLInputElement>("[cmdk-input]")
                  ?.focus();
              }
            }}
          >
            {[...modelsByProvider.keys()].map((provider) => (
              <ToggleGroupPrimitive.Item
                key={provider}
                value={provider}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition-colors",
                  "text-muted-foreground hover:text-foreground",
                  "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:border-transparent",
                )}
              >
                {provider}
              </ToggleGroupPrimitive.Item>
            ))}
          </ToggleGroupPrimitive.Root>
          <ModelSelectorList>
            <ModelSelectorEmpty />
            {visibleGroups.map(([provider, providerModels]) => (
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
    <SampleFrame className="flex h-auto flex-col items-center gap-8 p-8">
      <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-6">
        <VariantRow label="Outline (default)" variant="outline" />
        <VariantRow label="Ghost" variant="ghost" />
        <VariantRow label="Muted" variant="muted" />
      </div>
      <ComposedRow />
    </SampleFrame>
  );
}
