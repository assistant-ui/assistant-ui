"use client";

import { NumberTicker } from "@/components/assistant-ui/elements/number-ticker";
import { defineStates } from "./types";

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "zero",
    label: "Zero",
    note: "Nothing counted yet.",
    Component: () => <NumberTicker value={0} label="tokens generated" />,
  },
  {
    key: "long-content",
    label: "Large value",
    note: "A ten-digit count with group separators.",
    Component: () => (
      <NumberTicker value={1_284_903_117} label="tokens this month" />
    ),
  },
  {
    key: "negative",
    label: "Negative",
    note: "A count below zero keeps its sign.",
    Component: () => <NumberTicker value={-1240} label="credits remaining" />,
  },
  {
    key: "decimal",
    label: "Decimal",
    note: "A fractional value rolls each digit around the point.",
    Component: () => <NumberTicker value={42.75} label="dollars spent" />,
  },
]);
