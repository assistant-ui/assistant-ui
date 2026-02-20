"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
} from "@/components/assistant-ui/model-selector";
import { DEFAULT_MODEL_ID, MODELS } from "@/constants/model";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const models = MODELS.map((model) => ({
  id: model.value,
  name: model.name,
  icon: <SparklesIcon />,
  description: `${model.disabled ? "Currently disabled" : "Available"} provider model`,
  ...(model.disabled ? { disabled: true } : undefined),
}));

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  const [value, setValue] = useState<string>(DEFAULT_MODEL_ID);

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <ModelSelectorRoot models={models} value={value} onValueChange={setValue}>
        <ModelSelectorTrigger variant={variant} />
        <ModelSelectorContent />
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
    </SampleFrame>
  );
}
