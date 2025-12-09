"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import type { FC } from "react";

const MODELS = [
  { name: "GPT 4o-mini", value: "gpt-4o-mini", icon: "/providers/openai.svg" },
  {
    name: "Deepseek R1",
    value: "deepseek-r1",
    icon: "/providers/deepseek.svg",
  },
  {
    name: "Claude 3.5 Sonnet",
    value: "claude-3.5-sonnet",
    icon: "/providers/anthropic.svg",
  },
  {
    name: "Gemini 2.0 Flash",
    value: "gemini-2.0-flash",
    icon: "/providers/google.svg",
  },
  { name: "Llama 3 8b", value: "llama-3-8b", icon: "/providers/meta.svg" },
  {
    name: "Firefunction V2",
    value: "firefunction-v2",
    icon: "/providers/fireworks.svg",
  },
  { name: "Mistral 7b", value: "mistral-7b", icon: "/providers/mistral.svg" },
] as const;

export const ModelPicker: FC = () => {
  return (
    <Select defaultValue={MODELS[0].value}>
      <SelectTrigger className="h-9 w-auto gap-2 border-none bg-transparent px-2 shadow-none hover:bg-muted focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODELS.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            <span className="flex items-center gap-2">
              <Image
                src={model.icon}
                alt={model.name}
                width={16}
                height={16}
                className="size-4"
              />
              <span>{model.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
