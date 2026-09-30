import { useState } from "react";
import {
  ModelPicker,
  type PickableModel,
} from "@assistant-ui/ui/components/assistant-ui/elements/model-picker.tsx";
import { defineSections } from "../types";

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

function ModelPickerExample() {
  const [selectedId, setSelectedId] = useState("sonnet");
  return (
    <ModelPicker
      models={MODELS}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );
}

export default defineSections([
  {
    id: "model-picker",
    title: "Model picker",
    category: "chat",
    notes:
      "model-picker.tsx (standalone): families, context, price and capabilities.",
    render: () => <ModelPickerExample />,
  },
]);
