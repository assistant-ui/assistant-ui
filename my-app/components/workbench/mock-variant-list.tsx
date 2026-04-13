"use client";

import type { MockVariant } from "@/lib/workbench/mock-config";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/ui/cn";

interface MockVariantListProps {
  variants: MockVariant[];
  activeVariantId: string | null;
  onSelectVariant: (id: string | null) => void;
  onEditVariant: (variant: MockVariant) => void;
  onDeleteVariant: (id: string) => void;
}

function formatDelay(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  return `${ms}ms`;
}

export function MockVariantList({
  variants,
  activeVariantId,
  onSelectVariant,
  onEditVariant,
  onDeleteVariant,
}: MockVariantListProps) {
  return (
    <RadioGroup
      value={activeVariantId ?? "default"}
      onValueChange={(value: string) =>
        onSelectVariant(value === "default" ? null : value)
      }
      className="flex flex-col gap-1"
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
          activeVariantId === null && "bg-muted",
        )}
      >
        <RadioGroupItem value="default" id="default" />
        <Label
          htmlFor="default"
          className="flex-1 cursor-pointer font-normal text-xs"
        >
          Default response
        </Label>
      </div>

      {variants.map((variant) => (
        <div
          key={variant.id}
          className={cn(
            "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
            activeVariantId === variant.id && "bg-muted",
          )}
        >
          <RadioGroupItem value={variant.id} id={variant.id} />
          <Label
            htmlFor={variant.id}
            className="flex flex-1 cursor-pointer items-center gap-2 font-normal text-xs"
          >
            <span
              className={cn(
                "rounded px-1.5 py-0.5 font-medium text-[10px] uppercase",
                variant.type === "success" &&
                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                variant.type === "error" &&
                  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                variant.type === "empty" &&
                  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                variant.type === "slow" &&
                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                variant.type === "custom" &&
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              )}
            >
              {variant.name}
            </span>
            {variant.type === "slow" && (
              <span className="text-[10px] text-muted-foreground">
                ({formatDelay(variant.delay)})
              </span>
            )}
          </Label>
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation();
                onEditVariant(variant);
              }}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteVariant(variant.id);
              }}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </div>
      ))}
    </RadioGroup>
  );
}
