"use client";

import { FeedbackDialog } from "@/components/assistant-ui/elements/feedback-dialog";
import { defineStates } from "./types";

const noop = () => {};

const REASONS = [
  "Not factual",
  "Didn't follow instructions",
  "Too long",
  "Unsafe",
] as const;

const handlers = {
  onToggleReason: noop,
  onNoteChange: noop,
  onSubmit: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "filled",
    label: "Filled in",
    note: "Two reasons picked and a note typed, ready to send.",
    Component: () => (
      <FeedbackDialog
        {...handlers}
        reasons={REASONS}
        selected={["Not factual", "Too long"]}
        note="It said useThreadRuntime was removed in 0.12. It still exists."
        sent={false}
      />
    ),
  },
  {
    key: "success",
    label: "Sent",
    note: "The feedback went through and the form collapses to a thank-you line.",
    Component: () => (
      <FeedbackDialog
        {...handlers}
        reasons={REASONS}
        selected={["Not factual"]}
        note=""
        sent
      />
    ),
  },
  {
    key: "disabled",
    label: "Read only",
    note: "Without handlers the reasons cannot be toggled and there is no send button.",
    Component: () => (
      <FeedbackDialog
        reasons={REASONS}
        selected={["Didn't follow instructions"]}
        note="I asked for TypeScript and got JavaScript."
        sent={false}
      />
    ),
  },
]);
