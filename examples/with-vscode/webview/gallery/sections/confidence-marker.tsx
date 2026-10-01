import { useState } from "react";
import {
  ConfidenceMarker,
  type ConfidenceClaim,
} from "@assistant-ui/ui/components/assistant-ui/elements/confidence-marker.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const CLAIMS: readonly ConfidenceClaim[] = [
  {
    id: "1",
    text: "The composer owns its draft from 0.14 onward.",
    confidence: "grounded",
    basis: "migration-0.14.md",
  },
  {
    id: "2",
    text: "Most apps will not need the hydrate effect anymore.",
    confidence: "inferred",
    basis: "from the changed API",
  },
  {
    id: "3",
    text: "Removing it should cut a render on every thread switch.",
    confidence: "uncertain",
    basis: "not measured",
  },
];

function InteractiveMarker() {
  const [hoveredId, setHoveredId] = useState("");
  return (
    <ConfidenceMarker
      claims={CLAIMS}
      hoveredId={hoveredId}
      onHover={setHoveredId}
    />
  );
}

export default defineSections([
  {
    id: "confidence-marker",
    title: "Confidence marker",
    category: "agents",
    notes: "Grounded, inferred and uncertain claims; hover shows the basis.",
    render: () => (
      <States>
        <State label="interactive">
          <InteractiveMarker />
        </State>
        <State label="uncertain claim hovered">
          <ConfidenceMarker claims={CLAIMS} hoveredId="3" />
        </State>
      </States>
    ),
  },
]);
