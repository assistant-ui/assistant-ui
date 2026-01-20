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
  {
    name: "GPT-5 Nano",
    value: "gpt-5-nano",
    icon: "/providers/openai.svg",
    disabled: false,
  },
  {
    name: "Deepseek R1",
    value: "deepseek-r1",
    icon: "/providers/deepseek.svg",
    disabled: true,
  },
  {
    name: "Claude 4.5 Sonnet",
    value: "claude-4.5-sonnet",
    icon: "/providers/anthropic.svg",
    disabled: true,
  },
  {
    name: "Gemini 3.0 Flash",
    value: "gemini-3.0-flash",
    icon: "/providers/google.svg",
    disabled: true,
  },
] as const;

export const ModelPicker: FC = () => {
  return (
    <Select defaultValue={MODELS[0].value}>
      <SelectTrigger className="h-9 w-auto gap-2 border-none bg-transparent px-2 shadow-none hover:bg-muted focus:ring-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MODELS.map((model) => (
          <SelectItem
            key={model.value}
            value={model.value}
            disabled={model.disabled}
          >
            <span
              className={`flex items-center gap-2 ${model.disabled ? "opacity-50" : ""}`}
            >
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
