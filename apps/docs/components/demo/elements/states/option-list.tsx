"use client";

import {
  OptionList,
  type OptionListOption,
} from "@/components/assistant-ui/elements/option-list";
import { defineStates } from "./types";

const noop = () => {};

const DUPLICATES: readonly OptionListOption[] = [
  {
    id: "merge",
    label: "Merge duplicates",
    description: "Combine each pair into one contact, keeping every field.",
  },
  {
    id: "keep",
    label: "Keep both",
    description: "Leave the pairs as separate contacts.",
  },
  {
    id: "review",
    label: "Review each pair",
    description: "Walk through the 12 pairs one at a time.",
  },
];

const CHECKS: readonly OptionListOption[] = [
  { id: "typecheck", label: "Typecheck" },
  { id: "unit", label: "Unit tests", description: "About 40 seconds." },
  { id: "e2e", label: "End-to-end tests", description: "About 6 minutes." },
  { id: "lint", label: "Lint" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "disabled-option",
    label: "Unavailable",
    note: "One option cannot be picked right now.",
    Component: () => (
      <OptionList
        aria-label="Where should the build run?"
        options={[
          { id: "local", label: "On this machine" },
          { id: "ci", label: "In CI", description: "Uses the shared runners." },
          {
            id: "gpu",
            label: "On a GPU runner",
            description: "No GPU runners are online.",
            disabled: true,
          },
        ]}
        onConfirm={noop}
      />
    ),
  },
  {
    key: "max-reached",
    label: "Limit reached",
    note: "A multiple selection at its maximum locks the remaining options.",
    Component: () => (
      <OptionList
        aria-label="Which checks should run before the deploy?"
        options={CHECKS}
        selectionMode="multiple"
        defaultValue={["typecheck", "unit", "lint"]}
        maxSelections={3}
        onConfirm={noop}
      />
    ),
  },
  {
    key: "below-minimum",
    label: "Below minimum",
    note: "Confirm stays inactive until enough options are picked.",
    Component: () => (
      <OptionList
        aria-label="Pick at least two reviewers"
        options={[
          { id: "ana", label: "Ana Ruiz" },
          { id: "jun", label: "Jun Park" },
          { id: "lee", label: "Lee Okafor" },
        ]}
        selectionMode="multiple"
        defaultValue={["jun"]}
        minSelections={2}
        confirmLabel="Request review"
        onConfirm={noop}
      />
    ),
  },
  {
    key: "success",
    label: "Answered",
    note: "The committed pick stays as a read-only receipt.",
    Component: () => (
      <OptionList
        aria-label="How should I handle the duplicate contacts?"
        options={DUPLICATES}
        choice={["merge"]}
      />
    ),
  },
  {
    key: "multiple-receipt",
    label: "Multi receipt",
    note: "A receipt of several picked options.",
    Component: () => (
      <OptionList
        aria-label="Which checks should run before the deploy?"
        options={CHECKS}
        selectionMode="multiple"
        choice={["typecheck", "unit", "e2e"]}
      />
    ),
  },
  {
    key: "empty-receipt",
    label: "Nothing picked",
    note: "A receipt where the answer was an empty selection.",
    Component: () => (
      <OptionList
        aria-label="Which checks should run before the deploy?"
        options={CHECKS}
        selectionMode="multiple"
        choice={[]}
      />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a confirm handler the list only displays its options.",
    Component: () => (
      <OptionList
        aria-label="How should I handle the duplicate contacts?"
        options={DUPLICATES}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long options",
    note: "Long labels and descriptions wrap inside the card.",
    Component: () => (
      <OptionList
        aria-label="How should the migration handle threads that fail to import?"
        options={[
          {
            id: "skip",
            label: "Skip threads that fail to import and keep going",
            description:
              "Failed threads are listed in migration-report.json so you can retry them later with pnpm migrate --only-failed.",
          },
          {
            id: "stop",
            label: "Stop the whole migration at the first failure",
            description:
              "Nothing after the failing thread is imported, and the remote store keeps what was already written.",
          },
          {
            id: "retry",
            label: "Retry each failing thread three times before skipping it",
          },
        ]}
        onConfirm={noop}
      />
    ),
  },
]);
