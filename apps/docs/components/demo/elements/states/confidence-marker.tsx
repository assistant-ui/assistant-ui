"use client";

import {
  ConfidenceMarker,
  type ConfidenceClaim,
} from "@/components/assistant-ui/elements/confidence-marker";
import { defineStates } from "./types";

const noop = () => {};

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

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "grounded",
    label: "Sourced claim",
    note: "Hovering a sourced claim names the document it came from.",
    Component: () => (
      <ConfidenceMarker claims={CLAIMS} hoveredId="1" onHover={noop} />
    ),
  },
  {
    key: "inferred",
    label: "Inferred claim",
    note: "Hovering an inferred claim says what it was reasoned from.",
    Component: () => (
      <ConfidenceMarker claims={CLAIMS} hoveredId="2" onHover={noop} />
    ),
  },
  {
    key: "uncertain",
    label: "Guess",
    note: "Hovering an unverified claim says it was never checked.",
    Component: () => (
      <ConfidenceMarker claims={CLAIMS} hoveredId="3" onHover={noop} />
    ),
  },
  {
    key: "all-grounded",
    label: "All sourced",
    note: "An answer where every claim traces back to a source.",
    Component: () => (
      <ConfidenceMarker
        claims={[
          {
            id: "1",
            text: "The composer owns its draft from 0.14 onward.",
            confidence: "grounded",
            basis: "migration-0.14.md",
          },
          {
            id: "2",
            text: "The hydrate effect was removed in the same release.",
            confidence: "grounded",
            basis: "CHANGELOG.md",
          },
        ]}
        hoveredId=""
        onHover={noop}
      />
    ),
  },
]);
