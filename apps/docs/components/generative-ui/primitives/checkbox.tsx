"use client";

import { useId } from "react";
import { Checkbox as UICheckbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function Checkbox({
  name,
  label,
  defaultChecked = false,
  disabled = false,
  required = false,
}: {
  name?: string;
  label?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  required?: boolean;
}) {
  const reactId = useId();
  const id = name ?? reactId;
  return (
    <div className="flex items-center gap-2">
      <UICheckbox
        id={id}
        defaultChecked={defaultChecked}
        disabled={disabled}
        required={required}
        {...(name ? { name } : {})}
      />
      {label && (
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
      )}
    </div>
  );
}
