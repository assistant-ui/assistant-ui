"use client";

import { MessageBranches } from "@/components/assistant-ui/elements/message-branches";
import { defineStates } from "./types";

const noop = () => {};

const VARIANTS = [
  "Persist the composer draft in the runtime with the thread id as its key. When the active thread changes, read that value back into the composer.",
  "Keep drafts in a thread keyed runtime map, then hydrate the composer whenever a new thread becomes active. Delete the matching entry only after a successful send.",
  "Treat each draft as thread state instead of component state. Restoring it on thread selection keeps the composer stable without adding a second store.",
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "last-branch",
    label: "Last branch",
    note: "The newest of three versions is showing, so next is disabled.",
    Component: () => (
      <MessageBranches variants={VARIANTS} index={2} onIndexChange={noop} />
    ),
  },
  {
    key: "single",
    label: "Single version",
    note: "With one version the picker is hidden and only the message shows.",
    Component: () => (
      <MessageBranches
        variants={VARIANTS.slice(0, 1)}
        index={0}
        onIndexChange={noop}
      />
    ),
  },
]);
