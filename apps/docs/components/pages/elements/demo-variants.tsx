"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { demoFrameClass } from "@/components/demo/utils/canvas";
import { DemoStage } from "@/components/demo/elements/demo-stage";
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
    <div className={cn(demoFrameClass, "h-[360px] flex-col items-stretch")}>
      <div className="flex min-h-0 flex-1 items-center justify-center p-5 md:p-6">
        <DemoStage key={active.key} replay={replay}>
          <active.Component />
        </DemoStage>
      </div>
      <div
        role="group"
        aria-label="Variants"
        className="border-foreground/10 flex h-9 shrink-0 items-center gap-0.5 border-t px-1.5"
      >
        {variants.map((variant) => {
          const selected = variant.key === active.key;
          return (
            <button
              key={variant.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setKey(variant.key)}
              className={cn(
                "h-6 rounded-sm px-2 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors motion-reduce:transition-none",
                selected
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground hover:text-foreground",
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
