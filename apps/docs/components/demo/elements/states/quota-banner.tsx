"use client";

import { QuotaBanner } from "@/components/assistant-ui/elements/quota-banner";
import { defineStates } from "./types";

const noop = () => {};

const base = {
  limit: 50,
  unit: "messages",
  resetsIn: "3h 12m",
  upgradeLabel: "Upgrade",
  onUpgrade: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "plenty",
    label: "Plenty left",
    note: "Well under the limit, so the bar stays neutral.",
    Component: () => <QuotaBanner {...base} used={12} />,
  },
  {
    key: "nearly-out",
    label: "Nearly out",
    note: "Past 90 percent of the limit, so the count and bar turn amber.",
    Component: () => <QuotaBanner {...base} used={47} />,
  },
  {
    key: "exhausted",
    label: "Exhausted",
    note: "The limit is used up, so the count and bar turn red until it resets.",
    Component: () => <QuotaBanner {...base} used={50} resetsIn="58m" />,
  },
  {
    key: "over-limit",
    label: "Over limit",
    note: "Usage past the limit still reads zero left and a full bar.",
    Component: () => (
      <QuotaBanner
        {...base}
        used={1_240_000}
        limit={1_000_000}
        unit="tokens"
        resetsIn="6d 4h"
        upgradeLabel="Buy more tokens"
      />
    ),
  },
]);
