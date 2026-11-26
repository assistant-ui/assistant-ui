"use client";

import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Menu,
  MenuContent,
  MenuEmpty,
  MenuItem,
  MenuList,
  MenuSearch,
  MenuTrigger,
} from "@/components/library/ui/menu";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

/** The header row of a picker panel's frame, over a hairline. */
export const pickerHeader =
  "border-foreground/10 flex h-11 shrink-0 items-center gap-2 border-b px-2";

export function PanelCopy({ text, label }: { text: string; label: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });
  return (
    <button
      type="button"
      onClick={() => copyToClipboard(text)}
      aria-label={label}
      className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] focus-visible:ring-ring inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2"
    >
      {isCopied ? (
        <CheckIcon aria-hidden className="size-3.5" />
      ) : (
        <CopyIcon aria-hidden className="size-3.5" />
      )}
      <span role="status" className="sr-only">
        {isCopied ? "Copied" : ""}
      </span>
    </button>
  );
}

export type PickerOption = { id: string; label: string; icon: ReactNode };

function OptionIcon({ icon }: { icon: ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-4 shrink-0 items-center justify-center [&_img]:size-4! [&_svg]:h-4 [&_svg]:w-4 [&>*]:size-4!"
    >
      {icon}
    </span>
  );
}

/** A dropdown in a frame's header row; searchable when it has many options. */
export function Picker({
  label,
  options,
  value,
  onValue,
  searchable = false,
}: {
  label: string;
  options: readonly PickerOption[];
  value: string;
  onValue: (id: string) => void;
  searchable?: boolean;
}) {
  const current = options.find((option) => option.id === value) ?? options[0]!;
  const items = options.map((option) => (
    <MenuItem
      key={option.id}
      label={option.label}
      onClick={() => onValue(option.id)}
    >
      <OptionIcon icon={option.icon} />
      <span className="flex-1">{option.label}</span>
      <CheckIcon
        aria-hidden
        className={cn(
          "ms-4 size-3.5",
          option.id === current.id ? "opacity-100" : "opacity-0",
        )}
      />
    </MenuItem>
  ));
  return (
    <Menu searchable={searchable}>
      <MenuTrigger
        aria-label={`${label}: ${current.label}`}
        className="hover:bg-foreground/[0.05] data-popup-open:bg-foreground/[0.05] h-7 min-w-0 gap-1.5 rounded-md px-2 text-[13px] font-medium"
      >
        <OptionIcon icon={current.icon} />
        <span className="truncate">{current.label}</span>
        <ChevronDownIcon aria-hidden className="text-muted-foreground" />
      </MenuTrigger>
      <MenuContent align="start" className="max-h-80">
        {searchable ? (
          <>
            <MenuSearch placeholder={`Search ${label.toLowerCase()}s`} />
            <MenuList>{items}</MenuList>
            <MenuEmpty>Nothing matches.</MenuEmpty>
          </>
        ) : (
          items
        )}
      </MenuContent>
    </Menu>
  );
}
