"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";
import {
  ModelSelectorRoot,
  ModelSelectorTrigger,
  ModelSelectorContent,
} from "@/components/assistant-ui/model-selector";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const models = [
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    icon: <SparklesIcon />,
    description: "Fast and efficient",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    icon: <SparklesIcon />,
    description: "Balanced performance",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    icon: <SparklesIcon />,
    description: "Most capable",
  },
];

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  const [value, setValue] = useState("gpt-5-mini");

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
