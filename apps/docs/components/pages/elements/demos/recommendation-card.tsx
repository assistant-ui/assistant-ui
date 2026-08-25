"use client";

import { useEffect, useState } from "react";
import {
  RecommendationCard,
  type RecommendationState,
} from "@/components/elements/recommendation-card";

export function RecommendationCardDemo() {
  const [state, setState] = useState<RecommendationState>("idle");

  useEffect(() => {
    if (state !== "accepted") return;
    const id = setTimeout(() => setState("idle"), 2600);
    return () => clearTimeout(id);
  }, [state]);

  return (
    <RecommendationCard
      state={state}
      question="Enable draft autosave?"
      confidenceLabel="high confidence"
      acceptedLabel="Enabled for every thread"
      onAccept={() => setState("accepted")}
    >
      Threads lose their draft on switch. Wiring{" "}
      <span className="bg-foreground/[0.06] text-foreground/70 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
        runtime.drafts
      </span>{" "}
      fixes it with{" "}
      <span className="bg-foreground/[0.06] text-foreground/70 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
        3 lines
      </span>{" "}
      and no migration.
    </RecommendationCard>
  );
}
