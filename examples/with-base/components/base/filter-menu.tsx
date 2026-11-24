"use client";

import { useRef, useState, type ReactNode } from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { FilterIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import {
  Icon,
  Menu,
  MenuEmpty,
  MenuItem,
  MenuList,
  MenuPopup,
  MenuSearch,
  MenuSeparator,
  MenuSub,
  MenuSubTrigger,
  MenuTrigger,
  SearchMenuSub,
  focusRing,
  menuItem,
} from "./base-thread-shell";

export type FilterOption = { value: string; label: string; icon?: ReactNode };

export type FilterSection = {
  id: string;
  label: string;
  options: readonly FilterOption[];
};

/* A section with more options than this gets a search field. */
const SEARCH_FROM = 8;

/** A row that can be on along with others: one that is on ends in a check. */
function MenuCheck({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      closeOnClick={false}
      className={cn(menuItem, className)}
      {...props}
    >
      {children}
      <MenuPrimitive.CheckboxItemIndicator className="ms-auto ps-3">
        <Icon icon={Tick02Icon} />
      </MenuPrimitive.CheckboxItemIndicator>
    </MenuPrimitive.CheckboxItem>
  );
}

function Options({
  options,
  selected,
  onChange,
}: {
  options: readonly FilterOption[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
}) {
  /* The options that were on when the menu opened lead it, and stay put. */
  const [leading] = useState(() => new Set(selected));
  const ordered = [
    ...options.filter((option) => leading.has(option.value)),
    ...options.filter((option) => !leading.has(option.value)),
  ];

  return ordered.map((option) => (
    <MenuCheck
      key={option.value}
      label={option.label}
      checked={selected.includes(option.value)}
      onCheckedChange={(checked) =>
        onChange(
          checked
            ? [...selected, option.value]
            : selected.filter((value) => value !== option.value),
        )
      }
    >
      {option.icon}
      <span className="truncate">{option.label}</span>
    </MenuCheck>
  ));
}

function Section({
  section,
  selected,
  onChange,
}: {
  section: FilterSection;
  selected: readonly string[];
  onChange: (values: string[]) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const searchable = section.options.length > SEARCH_FROM;
  const Sub = searchable ? SearchMenuSub : MenuSub;
  const name = section.label.toLowerCase();
  const search = `Search ${name}`;
  const reset = `Reset ${name}`;
  const only =
    selected.length === 1
      ? section.options.find((option) => option.value === selected[0])
      : undefined;
  const options = (
    <Options
      options={section.options}
      selected={selected}
      onChange={onChange}
    />
  );

  return (
    <Sub>
      <MenuSubTrigger>
        {section.label}
        <span className="text-muted-foreground min-w-0 flex-1 truncate ps-4 text-end">
          {selected.length === 0 ? "All" : (only?.label ?? selected.length)}
        </span>
      </MenuSubTrigger>
      <MenuPopup
        side="right"
        sideOffset={6}
        alignOffset={-4}
        className={cn(
          "max-h-[min(20rem,var(--available-height))] w-60",
          !searchable && "overflow-y-auto",
        )}
      >
        {searchable ? (
          <>
            <MenuSearch
              ref={searchRef}
              placeholder={search}
              aria-label={search}
            />
            <MenuList className="overflow-y-auto">
              {options}
              <MenuEmpty>Nothing matches</MenuEmpty>
            </MenuList>
            <MenuSeparator />
            {/* The list is this popup's menu, so a row outside it is a button. */}
            <button
              type="button"
              aria-label={reset}
              disabled={selected.length === 0}
              onClick={() => {
                onChange([]);
                searchRef.current?.focus();
              }}
              className={cn(
                menuItem,
                "hover:bg-accent focus-visible:bg-accent disabled:pointer-events-none disabled:opacity-45",
              )}
            >
              Reset
            </button>
          </>
        ) : (
          <>
            {options}
            <MenuSeparator />
            <MenuItem
              closeOnClick={false}
              aria-label={reset}
              disabled={selected.length === 0}
              onClick={() => onChange([])}
            >
              Reset
            </MenuItem>
          </>
        )}
      </MenuPopup>
    </Sub>
  );
}

/**
 * A button that opens a menu of filters, one menu beside it for each section.
 * Any number of a section's options can be on, and a section with none on
 * filters nothing. Each section has a Reset that turns its own options off.
 */
export function FilterMenu({
  sections,
  selected,
  onChange,
  label = "Filter",
  className,
}: {
  sections: readonly FilterSection[];
  /** The values that are on in each section, by the section's id. */
  selected: Readonly<Record<string, readonly string[]>>;
  onChange: (section: string, values: string[]) => void;
  label?: string;
  className?: string;
}) {
  const count = sections.reduce(
    (sum, section) => sum + (selected[section.id]?.length ?? 0),
    0,
  );

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          "border-input bg-input/20 hover:bg-input/50 data-popup-open:bg-input/50 dark:bg-input/30 dark:hover:bg-input/50 flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 transition-colors motion-reduce:transition-none [&_svg]:size-4",
          focusRing,
          className,
        )}
      >
        <Icon icon={FilterIcon} className="text-muted-foreground" />
        {label}
        {count > 0 && (
          <span className="bg-foreground/10 min-w-4.5 rounded-full px-1 text-center text-xs tabular-nums">
            {count}
            <span className="sr-only"> on</span>
          </span>
        )}
      </MenuTrigger>
      <MenuPopup className="min-w-52">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            selected={selected[section.id] ?? []}
            onChange={(values) => onChange(section.id, values)}
          />
        ))}
      </MenuPopup>
    </Menu>
  );
}
