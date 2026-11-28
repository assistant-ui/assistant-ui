"use client";

import * as React from "react";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Search01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";
import { LibraryIconButton } from "./library-icon-button";

const rowText = "text-sm/5 font-normal";

/*
 * Shared row: 28px tall (36px on touch), 8px padding, a 6px radius nested in
 * the 10px popup. Icons default to 16px in the text color; give an icon its own
 * `size-*` or `text-*` class (e.g. a trailing `text-muted-foreground` ↗) and the
 * default steps aside.
 */
const row = cn(
  "relative flex h-7 cursor-pointer items-center gap-2 rounded-(--library-item) px-2 outline-none select-none pointer-coarse:h-9",
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
  "data-disabled:pointer-events-none data-disabled:opacity-50",
  "[&_svg:not([class*='text-'])]:text-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
);

/* ---------------------------------------------------------------- root ---- */

const MenuSearchContext = React.createContext<{
  query: string;
  setQuery: (value: string) => void;
} | null>(null);

/**
 * Root. Pass `searchable` to add filtering: put `MenuSearch` at the top of
 * `MenuContent`, the items inside `MenuList`, and an optional `MenuEmpty`.
 */
function Menu({
  searchable = false,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Root> & { searchable?: boolean }) {
  const [query, setQuery] = React.useState("");
  const root = <MenuPrimitive.Root data-slot="menu" {...props} />;
  if (!searchable) return root;
  return (
    <MenuSearchContext.Provider value={{ query, setQuery }}>
      <MenuPrimitive.FilterProvider
        autoHighlight
        value={query}
        onValueChange={(v) => setQuery(v)}
      >
        {root}
      </MenuPrimitive.FilterProvider>
    </MenuSearchContext.Provider>
  );
}

/**
 * Styled as a quiet text button. For an avatar, icon button or any existing
 * control, pass `render` (or override with `className`).
 */
function MenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Trigger>) {
  return (
    <MenuPrimitive.Trigger
      data-slot="menu-trigger"
      className={cn(
        "text-foreground inline-flex h-7 cursor-pointer items-center gap-2 rounded-(--library-item) border-0 bg-transparent px-3 font-sans outline-none pointer-coarse:h-9",
        rowText,
        "hover:bg-accent focus-visible:bg-accent data-popup-open:bg-accent",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- popup ---- */

/*
 * Glass: translucent + blurred. The hover pill and secondary text are re-pointed
 * to their glass values, and the surface falls back to solid popover when
 * backdrop-filter is unsupported or the user prefers reduced transparency.
 * The values are written out here because the docs theme has no glass tokens.
 */
const glassSurface = cn(
  "border-border/60 bg-[color-mix(in_oklab,var(--popover)_72%,transparent)] backdrop-blur-[16px]",
  "[--accent:color-mix(in_oklab,var(--foreground)_7%,transparent)] [--muted-foreground:color-mix(in_oklab,var(--foreground)_62%,transparent)]",
  "not-supports-[backdrop-filter:blur(1px)]:bg-popover",
  "[@media(prefers-reduced-transparency:reduce)]:bg-popover [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none",
);

// The lift a floating surface gets; the docs theme zeroes the stock shadows.
const floatShadow =
  "shadow-[0_1px_2px_oklch(0_0_0/6%),0_8px_24px_-6px_oklch(0_0_0/14%)] dark:shadow-[0_1px_2px_oklch(0_0_0/30%),0_8px_24px_-6px_oklch(0_0_0/50%)]";

type Placement = {
  side?: React.ComponentProps<typeof MenuPrimitive.Positioner>["side"];
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
  /** Space kept between the menu and the edge of the screen. Default 8. */
  collisionPadding?: number;
};

function MenuContent({
  className,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  collisionPadding = 8,
  glass = true,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> &
  Placement & {
    /** Glass, the default for anything that floats. `false` gives a solid surface. */
    glass?: boolean;
  }) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className="z-50 outline-none"
      >
        <MenuPrimitive.Popup
          data-slot="menu-content"
          data-glass={glass || undefined}
          className={cn(
            "border-border text-popover-foreground flex min-w-50 origin-(--transform-origin) [scrollbar-color:var(--border)_transparent] flex-col rounded-(--library-surface) border p-1 font-sans outline-none",
            floatShadow,
            rowText,
            // Never taller than the room left on screen; long menus scroll. With a
            // MenuList inside, the list scrolls instead so the search stays put.
            "max-h-(--available-height) overflow-y-auto has-data-[slot=menu-list]:overflow-y-hidden",
            // Motion: grows from 96% out of the trigger in 150ms, leaves faster (100ms).
            // Reduced motion keeps the fade and drops the scale.
            "transition-[opacity,scale] duration-[var(--duration-150,150ms)] ease-[var(--ease-enter,cubic-bezier(0.2,0.7,0.2,1))]",
            "data-ending-style:duration-[var(--duration-100,100ms)] data-ending-style:ease-[var(--ease-exit,cubic-bezier(0.4,0,1,1))]",
            "data-ending-style:scale-96 data-ending-style:opacity-0 data-starting-style:scale-96 data-starting-style:opacity-0",
            "motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100",
            glass ? glassSurface : "bg-popover",
            className,
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/* -------------------------------------------------------------- search ---- */

/**
 * Search field for a `searchable` menu, with a clear button and the divider
 * below it. The clear button stays in place (disabled) while empty so the field
 * doesn't shift as you type.
 */
function MenuSearch({
  className,
  placeholder = "Search…",
  "aria-label": ariaLabel = "Search",
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Input>) {
  const search = React.useContext(MenuSearchContext);
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <div
        data-slot="menu-search"
        className="text-muted-foreground flex h-8 shrink-0 items-center gap-2 ps-2 pe-1 pointer-coarse:h-10"
      >
        <HugeiconsIcon
          icon={Search01Icon}
          strokeWidth={1.5}
          aria-hidden="true"
          className="size-4 shrink-0"
        />
        <MenuPrimitive.Input
          ref={inputRef}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            "text-foreground placeholder:text-muted-foreground h-full min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 font-sans outline-none",
            rowText,
            className,
          )}
          {...props}
        />
        {search && (
          <LibraryIconButton
            tooltip="Clear search"
            data-slot="menu-search-clear"
            disabled={!search.query}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              search.setQuery("");
              inputRef.current?.focus();
            }}
            className="hover:bg-accent dark:hover:bg-accent size-6 rounded-(--library-item) disabled:opacity-0"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={1.5}
              aria-hidden="true"
              className="size-4"
            />
          </LibraryIconButton>
        )}
      </div>
      <div aria-hidden="true" className="bg-border mx-2 my-1 h-px shrink-0" />
    </>
  );
}

/** Wraps the items of a searchable menu; scrolls under the search field. */
function MenuList({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.List>) {
  return (
    <MenuPrimitive.List
      data-slot="menu-list"
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto outline-none",
        className,
      )}
      {...props}
    />
  );
}

function MenuEmpty({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Empty>) {
  return (
    <MenuPrimitive.Empty
      data-slot="menu-empty"
      className={cn(
        "text-muted-foreground px-2 py-1.5 empty:hidden",
        className,
      )}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- items ---- */

const destructive = cn(
  "data-[variant=destructive]:text-destructive data-[variant=destructive]:[&_svg:not([class*='text-'])]:text-destructive",
  "data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive",
  // The shortcut keeps its grey at rest and turns red with the row on hover.
  "data-[variant=destructive]:data-highlighted:[&_[data-slot=menu-shortcut]]:text-destructive",
);

function MenuItem({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
  variant?: "default" | "destructive";
}) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      data-variant={variant}
      className={cn(row, destructive, className)}
      {...props}
    />
  );
}

/** The same row as a real link, so ⌘-click and middle-click keep working. */
function MenuLinkItem({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.LinkItem>) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="menu-link-item"
      className={cn(row, "text-inherit no-underline", className)}
      {...props}
    />
  );
}

/* The checkmark slot sits where icons sit, so checkable rows line up with the rest. */
function IndicatorSlot({ children }: { children: React.ReactNode }) {
  return (
    <span className="order-last ms-auto flex size-4 shrink-0 items-center justify-center [:has(>[data-slot$=shortcut])>&]:ms-0">
      {children}
    </span>
  );
}

function MenuCheckboxItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menu-checkbox-item"
      className={cn(row, className)}
      {...props}
    >
      <IndicatorSlot>
        <MenuPrimitive.CheckboxItemIndicator>
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </MenuPrimitive.CheckboxItemIndicator>
      </IndicatorSlot>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function MenuRadioGroup(
  props: React.ComponentProps<typeof MenuPrimitive.RadioGroup>,
) {
  return <MenuPrimitive.RadioGroup data-slot="menu-radio-group" {...props} />;
}

function MenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItem>) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menu-radio-item"
      className={cn(row, className)}
      {...props}
    >
      <IndicatorSlot>
        <MenuPrimitive.RadioItemIndicator>
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </MenuPrimitive.RadioItemIndicator>
      </IndicatorSlot>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function MenuGroup(props: React.ComponentProps<typeof MenuPrimitive.Group>) {
  return <MenuPrimitive.Group data-slot="menu-group" {...props} />;
}

function MenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.GroupLabel>) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="menu-label"
      className={cn(
        "text-muted-foreground flex h-7 shrink-0 items-center px-2",
        className,
      )}
      {...props}
    />
  );
}

function MenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="menu-separator"
      className={cn(
        // Hide dividers left dangling at the edges when a search filters items out.
        "bg-border mx-2 my-1 h-px shrink-0 first:hidden last:hidden [&+[data-slot=menu-separator]]:hidden",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Visual shortcut hint. Hidden from screen readers: put the real binding on the
 * item with `aria-keyshortcuts` (e.g. "Meta+D").
 */
function MenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="menu-shortcut"
      aria-hidden="true"
      className={cn(
        "text-muted-foreground/70 in-data-highlighted:text-accent-foreground/70 ms-auto ps-4",
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------------------------------------ submenus ---- */

function MenuSub(
  props: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>,
) {
  return <MenuPrimitive.SubmenuRoot data-slot="menu-sub" {...props} />;
}

/** A row that opens another menu. The chevron flips in right-to-left layouts. */
function MenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger>) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="menu-sub-trigger"
      className={cn(
        row,
        "data-popup-open:bg-accent data-popup-open:text-accent-foreground",
        className,
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={1.5}
        aria-hidden="true"
        className="text-muted-foreground ms-auto size-4 rtl:-scale-x-100"
      />
    </MenuPrimitive.SubmenuTrigger>
  );
}

/** Opens beside its trigger, with the first row lined up with the trigger row. */
function MenuSubContent({
  side = "inline-end",
  align = "start",
  sideOffset = 4,
  alignOffset = -5,
  ...props
}: React.ComponentProps<typeof MenuContent>) {
  return (
    <MenuContent
      data-slot="menu-sub-content"
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      {...props}
    />
  );
}

export {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuSearch,
  MenuList,
  MenuEmpty,
  MenuItem,
  MenuLinkItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuGroup,
  MenuLabel,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubTrigger,
  MenuSubContent,
};
