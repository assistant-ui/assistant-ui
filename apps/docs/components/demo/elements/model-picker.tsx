"use client";

import { useState } from "react";
import {
  ModelPicker,
  type PickableModel,
} from "@/components/assistant-ui/elements/model-picker";

const MODELS: readonly PickableModel[] = [
  {
    id: "opus",
    name: "Opus 5",
    family: "Anthropic",
    context: "500k",
    price: "$15/M",
    capabilities: ["vision", "tools", "thinking"],
  },
  {
    id: "sonnet",
    name: "Sonnet 5",
    family: "Anthropic",
    context: "500k",
    price: "$3/M",
    capabilities: ["vision", "tools"],
  },
  {
    id: "haiku",
    name: "Haiku 4.5",
    family: "Anthropic",
    context: "200k",
    price: "$0.80/M",
    capabilities: ["tools"],
  },
  {
    id: "local",
    name: "Qwen3 32B",
    family: "Local",
    context: "128k",
    price: "free",
    capabilities: ["tools"],
  },
];

export function ModelPickerDemo() {
  const [selectedId, setSelectedId] = useState("sonnet");

  return (
    <ModelPicker
      models={MODELS}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
}
