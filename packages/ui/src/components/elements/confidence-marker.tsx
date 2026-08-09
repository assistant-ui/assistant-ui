"use client";

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
}: {
  claims: readonly ConfidenceClaim[];
  hoveredId: string;
  onHover?: (id: string) => void;
  className?: string;
}) {
  const hovered = claims.find((claim) => claim.id === hoveredId);

  return (
    <div className={cn("flex w-full max-w-sm flex-col gap-2.5", className)}>
      <p className="text-[13.5px] leading-relaxed">
        {claims.map((claim) => (
          <span
            key={claim.id}
            onMouseEnter={() => onHover?.(claim.id)}
            onMouseLeave={() => onHover?.("")}
            className={cn(
              "underline decoration-2 underline-offset-[3px] transition-colors",
              UNDERLINE[claim.confidence],
              hoveredId === claim.id
                ? "text-foreground/95"
                : "text-foreground/70",
            )}
          >
            {claim.text}{" "}
          </span>
        ))}
      </p>

      <div className="flex h-9 items-start">
        {hovered && (
          <span
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
