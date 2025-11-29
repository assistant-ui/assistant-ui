"use client";
import Image from "next/image";
import type { FC } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const models = [
  {
    name: "GPT 4o-mini",
    value: "gpt-4o-mini",
    icon: "/providers/openai.svg",
  },
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
  {
    name: "Llama 3 8b",
    value: "llama-3-8b",
    icon: "/providers/meta.svg",
  },
  {
    name: "Firefunction V2",
    value: "firefunction-v2",
    icon: "/providers/fireworks.svg",
  },
  {
    name: "Mistral 7b",
    value: "mistral-7b",
    icon: "/providers/mistral.svg",
  },
];
export const ModelPicker: FC = () => {
  return (
    <Select defaultValue={models[0]?.value ?? ""}>
      <SelectTrigger className="max-w-[300px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="">
        {models.map((model) => (
          <SelectItem key={model.value} value={model.value}>
            <span className="flex items-center gap-2">
              <Image
                src={model.icon}
                alt={model.name}
                width={16}
                height={16}
                className="inline size-4"
              />
              <span>{model.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
