"use client";

import type { ComponentProps } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { field, mono, paper } from "./surfaces";

export interface PickableModel {
  id: string;
  name: string;
  family: string;
  context: string;
  price: string;
  capabilities: readonly string[];
}

export function ModelPicker({
  models,
  selectedId,
  onSelect,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "models" | "selectedId" | "onSelect"
> & {
  models: readonly PickableModel[];
  selectedId: string;
  onSelect?: (id: string) => void;
}) {
  const families = [...new Set(models.map((model) => model.family))];

  return (
    <div
      data-slot="model-picker"
      className={cn(
        paper,
        "flex w-full max-w-sm flex-col gap-1 rounded-2xl p-2",
        className,
      )}

      {...props}
    >
      {families.map((family) => (
        <div key={family} className="flex flex-col">
          <span className={cn(mono, "text-foreground/30 px-2 pt-2 pb-1")}>
            {family}
          </span>
          {models
            .filter((model) => model.family === family)
            .map((model) => {
              const selected = model.id === selectedId;
              return (
                <button
                  key={model.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect?.(model.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-2 py-2 text-start transition-colors",
                    selected
                      ? "bg-foreground/[0.06]"
                      : "hover:bg-foreground/[0.035]",
                  )}
                >
                  <span className="flex size-3.5 shrink-0 items-center justify-center">
                    {selected && (
                      <CheckIcon className="fade-in zoom-in-90 animate-in text-foreground/70 size-3.5 duration-200" />
                    )}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[13.5px]">{model.name}</span>
                    <span className="flex flex-wrap gap-1">
                      {model.capabilities.map((capability) => (
                        <span
                          key={capability}
                          className={cn(
                            field,
                            mono,
                            "text-foreground/45 rounded px-1 py-px",
                          )}
                        >
                          {capability}
                        </span>
                      ))}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={cn(mono, "text-foreground/35 tabular-nums")}
                    >
                      {model.context}
                    </span>
                    <span
                      className={cn(mono, "text-foreground/25 tabular-nums")}
                    >
                      {model.price}
                    </span>
                  </span>
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}
