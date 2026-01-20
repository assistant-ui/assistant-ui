"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODELS } from "@/constants/model";
import Image from "next/image";
import type { FC } from "react";

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
