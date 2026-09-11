"use client";

import { useState } from "react";
import {
  ConfidenceMarker,
  type ConfidenceClaim,
} from "@/components/assistant-ui/elements/confidence-marker";

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

export function ConfidenceMarkerDemo() {
  const [hoveredId, setHoveredId] = useState("");

  return (
    <ConfidenceMarker
      claims={CLAIMS}
      hoveredId={hoveredId}
      onHover={setHoveredId}
    />
  );
}
