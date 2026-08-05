"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { demoCanvasClass } from "./canvas";
import { DemoStage } from "./demo-stage";
import type { ElementVariant } from "./registry";

export function DemoVariants({
  variants,
  replay,
}: {
  variants: ElementVariant[];
  replay: boolean;
}) {
  const [key, setKey] = useState(variants[0]!.key);
  const active =
    variants.find((variant) => variant.key === key) ?? variants[0]!;

  return (
    <div className={cn(demoCanvasClass, "mt-8 h-[400px] flex-col")}>
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        <DemoStage key={active.key} replay={replay}>
          <active.Component />
        </DemoStage>
      </div>
      <div className="-mb-3 flex flex-wrap justify-center gap-1 pt-4 md:-mb-7">
        {variants.map((variant) => {
          const selected = variant.key === active.key;
          return (
            <button
              key={variant.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setKey(variant.key)}
              className={cn(
                "h-7 rounded-full px-3 text-[12.5px] transition-[color,background-color,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] motion-reduce:transition-none",
                selected
                  ? "bg-foreground/[0.05] text-foreground dark:bg-foreground/[0.08] font-medium"
                  : "text-foreground/45 hover:text-foreground/90",
              )}
            >
              {variant.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
