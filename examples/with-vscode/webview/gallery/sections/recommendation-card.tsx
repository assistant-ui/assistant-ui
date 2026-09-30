import { useState } from "react";
import {
  RecommendationCard,
  type RecommendationState,
} from "@assistant-ui/ui/components/assistant-ui/elements/recommendation-card.tsx";
import { defineSections } from "../types";

function Recommendation({ initial }: { initial: RecommendationState }) {
  const [state, setState] = useState<RecommendationState>(initial);
  return (
    <RecommendationCard
      state={state}
      question="Switch the webview CSP to strict?"
      confidenceLabel="high confidence"
      acceptedLabel="Strict CSP enabled"
      onAccept={() => setState("accepted")}
    >
      Every script already carries the nonce. Switching{" "}
      <span className="bg-foreground/[0.06] text-foreground/70 rounded-md px-1.5 py-0.5 font-mono text-[11px]">
        auiTest.csp
      </span>{" "}
      blocks inline styles that libraries inject.
    </RecommendationCard>
  );
}

export default defineSections([
  {
    id: "recommendation-card",
    title: "Recommendation card",
    category: "content",
    notes: "Idle with an accept button, then accepted.",
    render: () => (
      <div className="flex flex-col gap-3">
        <Recommendation initial="idle" />
        <Recommendation initial="accepted" />
      </div>
    ),
  },
]);
