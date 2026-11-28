"use client";

import { Checkbox } from "@base-ui/react/checkbox";
import { CheckIcon, MinusIcon } from "lucide-react";

/** A checkbox for a table row or its header; a header half picked shows a dash. */
export function LibraryCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <Checkbox.Root
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange(next)}
      aria-label={label}
      className="border-foreground/25 text-background hover:border-foreground/50 data-checked:border-foreground data-checked:bg-foreground data-indeterminate:border-foreground data-indeterminate:bg-foreground focus-visible:ring-ring ring-offset-background relative grid size-4 shrink-0 cursor-pointer place-items-center rounded-[4px] border transition-colors outline-none after:absolute after:-inset-2.5 focus-visible:ring-2 focus-visible:ring-offset-2 data-disabled:cursor-not-allowed data-disabled:opacity-40"
    >
      <Checkbox.Indicator className="grid place-items-center [&_svg]:size-3">
        {indeterminate ? (
          <MinusIcon aria-hidden strokeWidth={3} />
        ) : (
          <CheckIcon aria-hidden strokeWidth={3} />
        )}
      </Checkbox.Indicator>
    </Checkbox.Root>
  );
}
