"use client";

import { useId } from "react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { floating, mono } from "./surfaces";

export type Confidence = "grounded" | "inferred" | "uncertain";

export interface ConfidenceClaim {
  id: string;
  text: string;
  confidence: Confidence;
  basis: string;
}

const UNDERLINE: Record<Confidence, string> = {
  grounded: "decoration-emerald-500/50",
  inferred: "decoration-amber-500/60",
  uncertain: "decoration-red-500/50 decoration-dotted",
};

const LABEL: Record<Confidence, string> = {
  grounded: "from a source",
  inferred: "inferred",
  uncertain: "unverified",
};

export function ConfidenceMarker({
  claims,
  hoveredId,
  onHover,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "claims" | "hoveredId" | "onHover"
> & {
  claims: readonly ConfidenceClaim[];
  hoveredId: string;
  onHover?: (id: string) => void;
}) {
  const basisId = useId();
  const hovered = claims.find((claim) => claim.id === hoveredId);

  return (
    <div
      data-slot="confidence-marker"
      className={cn("flex w-full max-w-sm flex-col gap-2.5", className)}

      {...props}
    >
      <p className="text-[13.5px] leading-relaxed">
        {claims.map((claim) => (
          <button
            key={claim.id}
            type="button"
            aria-describedby={hoveredId === claim.id ? basisId : undefined}
            onMouseEnter={() => onHover?.(claim.id)}
            onMouseLeave={() => onHover?.("")}
            onFocus={() => onHover?.(claim.id)}
            onBlur={() => onHover?.("")}
            className={cn(
              "focus-visible:ring-foreground/20 inline cursor-help rounded text-start underline decoration-2 underline-offset-[3px] transition-colors outline-none focus-visible:ring-1",
              UNDERLINE[claim.confidence],
              hoveredId === claim.id
                ? "text-foreground/95"
                : "text-foreground/70",
            )}
          >
            {claim.text}{" "}
          </button>
        ))}
      </p>

      <div className="flex h-9 items-start">
        {hovered && (
          <span
            id={basisId}
            role="status"
            className={cn(
              floating,
              mono,
              "fade-in zoom-in-95 animate-in text-foreground/55 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 duration-150",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                hovered.confidence === "grounded" && "bg-emerald-500",
                hovered.confidence === "inferred" && "bg-amber-500",
                hovered.confidence === "uncertain" && "bg-red-500",
              )}
            />
            {LABEL[hovered.confidence]} · {hovered.basis}
          </span>
        )}
      </div>
    </div>
  );
}
