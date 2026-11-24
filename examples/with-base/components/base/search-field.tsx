"use client";

import { useRef } from "react";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { Icon } from "./base-thread-shell";

/** A search field: its icon, the field, and a button that clears it. */
export function SearchField({
  value,
  onValueChange,
  label,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  /** Names the field and stands in it while it is empty. */
  label: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <InputGroup className={cn("h-8 rounded-lg", className)}>
      <InputGroupAddon>
        <Icon icon={Search01Icon} />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={label}
        aria-label={label}
        className="h-full text-[0.8125rem] focus-visible:bg-transparent md:text-[0.8125rem] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label="Clear the search"
            onClick={() => {
              onValueChange("");
              inputRef.current?.focus();
            }}
          >
            <Icon icon={Cancel01Icon} />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
