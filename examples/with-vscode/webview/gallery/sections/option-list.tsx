import { useState } from "react";
import {
  OptionList,
  type OptionListOption,
} from "@assistant-ui/ui/components/assistant-ui/elements/option-list.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

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
  {
    id: "delete",
    label: "Delete the older copy",
    description: "Needs admin rights on this address book.",
    disabled: true,
  },
];

const CHECKS: readonly OptionListOption[] = [
  { id: "typecheck", label: "Typecheck" },
  { id: "unit", label: "Unit tests", description: "About 40 seconds." },
  { id: "e2e", label: "End-to-end tests", description: "About 6 minutes." },
  { id: "lint", label: "Lint" },
];

function Answerable({ multiple }: { multiple?: boolean }) {
  const [choice, setChoice] = useState<string[] | undefined>(undefined);
  return (
    <OptionList
      key={choice === undefined ? "open" : "receipt"}
      aria-label={
        multiple
          ? "Which checks should run before the deploy?"
          : "How should I handle the duplicate contacts?"
      }
      options={multiple ? CHECKS : DUPLICATES}
      {...(multiple && {
        selectionMode: "multiple" as const,
        defaultValue: ["typecheck", "unit"],
        maxSelections: 3,
      })}
      choice={choice}
      onConfirm={setChoice}
    />
  );
}

export default defineSections([
  {
    id: "option-list",
    title: "Option list (single)",
    category: "agents",
    notes:
      "One pick commits the answer and turns the list into a receipt; one option is disabled.",
    render: () => <Answerable />,
  },
  {
    id: "option-list-multiple",
    title: "Option list (multiple)",
    category: "agents",
    notes: "Two preselected, at most three; the confirm button commits.",
    render: () => <Answerable multiple />,
  },
  {
    id: "option-list-states",
    title: "Option list states",
    category: "agents",
    notes: "Display only (no onConfirm), and the single and multiple receipts.",
    render: () => (
      <States>
        <State label="display only">
          <OptionList aria-label="Available plans" options={DUPLICATES} />
        </State>
        <State label="receipt, single">
          <OptionList
            aria-label="How should I handle the duplicate contacts?"
            options={DUPLICATES}
            choice={["merge"]}
          />
        </State>
        <State label="receipt, multiple">
          <OptionList
            aria-label="Which checks should run before the deploy?"
            options={CHECKS}
            selectionMode="multiple"
            choice={["typecheck", "unit", "lint"]}
          />
        </State>
      </States>
    ),
  },
]);
