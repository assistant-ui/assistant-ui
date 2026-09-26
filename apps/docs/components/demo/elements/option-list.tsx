"use client";

import { useEffect, useState } from "react";
import {
  OptionList,
  type OptionListOption,
} from "@/components/assistant-ui/elements/option-list";

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

function useReceiptLoop() {
  const [choice, setChoice] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    if (choice === undefined) return;
    const id = setTimeout(() => setChoice(undefined), 2600);
    return () => clearTimeout(id);
  }, [choice]);

  const confirm = (ids: string[]) =>
    new Promise<void>((resolve) =>
      setTimeout(() => {
        setChoice(ids);
        resolve();
      }, 700),
    );

  return { choice, confirm };
}

export function OptionListDemo() {
  const { choice, confirm } = useReceiptLoop();

  return (
    <OptionList
      key={choice === undefined ? "open" : "receipt"}
      aria-label="How should I handle the duplicate contacts?"
      options={DUPLICATES}
      choice={choice}
      onConfirm={confirm}
    />
  );
}

export function OptionListMultipleDemo() {
  const { choice, confirm } = useReceiptLoop();

  return (
    <OptionList
      key={choice === undefined ? "open" : "receipt"}
      aria-label="Which checks should run before the deploy?"
      options={CHECKS}
      selectionMode="multiple"
      defaultValue={["typecheck", "unit"]}
      maxSelections={3}
      choice={choice}
      onConfirm={confirm}
    />
  );
}
