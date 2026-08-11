"use client";

import type { ComponentProps } from "react";
import { RefreshCwIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ghostButton, mono, paper } from "./surfaces";

const DOTS = Array.from({ length: 64 }, (_, i) => i);

export function ImageGeneration({
  prompt,
  generating,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "prompt" | "generating"> & {
  prompt: string;
  generating: boolean;
}) {
  return (
    <div
      data-slot="image-generation"
      className={cn("flex w-52 flex-col gap-2.5", className)}

      {...props}
    >
      <div
        className={cn(
          paper,
          "relative aspect-square w-full overflow-hidden rounded-2xl",
        )}
      >
        <div
          className="absolute inset-0 grid grid-cols-8 place-items-center p-6"
          aria-hidden
        >
          {DOTS.map((dot) => {
            const row = Math.floor(dot / 8);
            const col = dot % 8;
            return (
              <span
                key={dot}
                className={cn(
                  "bg-foreground/20 size-1 rounded-full transition-opacity duration-500",
                  generating
                    ? "animate-pulse motion-reduce:animate-none"
                    : "opacity-0",
                )}
                style={{ animationDelay: `${(row + col) * 90}ms` }}
              />
            );
          })}
        </div>
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 transition-[opacity,filter] duration-1000 ease-out motion-reduce:transition-none",
            generating ? "opacity-0 blur-xl" : "blur-0 opacity-100",
          )}
          style={{
            background:
              "radial-gradient(120% 90% at 20% 100%, oklch(0.45 0.09 265) 0%, transparent 55%), radial-gradient(110% 80% at 85% 90%, oklch(0.62 0.1 300 / 0.8) 0%, transparent 60%), radial-gradient(130% 100% at 60% 0%, oklch(0.88 0.06 60) 0%, oklch(0.74 0.09 25 / 0.9) 45%, transparent 75%), linear-gradient(to top, oklch(0.35 0.06 275), oklch(0.82 0.07 50))",
          }}
        />
        <span
          className={cn(
            mono,
            "absolute end-2.5 top-2.5 tabular-nums",
            generating ? "text-foreground/35" : "text-white/70",
          )}
        >
          1024 × 1024
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground/45 min-w-0 flex-1 truncate text-xs">
          {generating ? (
            <span className="relative">
              <span>Generating</span>
              <span
                aria-hidden
                className="shimmer pointer-events-none absolute inset-0 motion-reduce:animate-none"
              >
                Generating
              </span>
            </span>
          ) : (
            prompt
          )}
        </p>
        <button
          type="button"
          aria-label="Regenerate image"
          className={cn(
            ghostButton,
            "size-6 shrink-0",
            generating && "pointer-events-none opacity-0",
          )}
        >
          <RefreshCwIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}
