"use client";

import { StoppedRun } from "@/components/assistant-ui/elements/stopped-run";
import { defineStates } from "./types";

const noop = () => {};

const PARTIAL =
  "The composer reads the draft from the per-thread slot, so switching threads mid-edit no longer".split(
    " ",
  );

const LONG_PARTIAL =
  "The composer reads the draft from the per-thread slot, so switching threads mid-edit no longer clears what you typed. On reload the runtime hydrates every slot from storage before the first render, which is why the text is already there when the thread mounts. Attachments follow the same path, except that large files are stored as references and fetched again when the composer opens. If the thread is remote and has no id yet, the draft lives under a temporary key until the first message".split(
    " ",
  );

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "No output",
    note: "The user stopped the run before any text arrived.",
    Component: () => (
      <StoppedRun
        words={[]}
        reason="stopped by you"
        onContinue={noop}
        onDiscard={noop}
      />
    ),
  },
  {
    key: "limit",
    label: "Token limit",
    note: "The model stopped itself at the output limit.",
    Component: () => (
      <StoppedRun
        words={PARTIAL}
        reason="hit 4,096 tokens"
        onContinue={noop}
        onDiscard={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long partial",
    note: "Several paragraphs of partial output stay above the controls.",
    Component: () => (
      <StoppedRun
        words={LONG_PARTIAL}
        reason="stopped by you"
        onContinue={noop}
        onDiscard={noop}
      />
    ),
  },
]);
