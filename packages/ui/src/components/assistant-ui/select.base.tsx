"use client";

import type { ReactNode } from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SelectRoot = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
  "focus-visible:ring-ring/50 data-placeholder:text-muted-foreground flex w-fit items-center justify-between gap-2 rounded-md text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&>span]:line-clamp-1",
  {
    variants: {
      variant: {
        outline:
          "border-input hover:bg-accent hover:text-accent-foreground border bg-transparent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        muted: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-8 px-2.5 py-1.5 text-xs",
        lg: "h-10 px-4 py-2.5",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  },
);

const SelectTrigger = ({
  className,
  variant,
  size,
  children,
  ...props
}: SelectPrimitive.Trigger.Props &
  VariantProps<typeof selectTriggerVariants>) => (
  <SelectPrimitive.Trigger
    data-slot="select-trigger"
    data-variant={variant ?? "outline"}
    data-size={size ?? "default"}
    className={cn(selectTriggerVariants({ variant, size }), className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon
      render={<ChevronDownIcon className="size-4 opacity-50" />}
    />
  </SelectPrimitive.Trigger>
);

const SelectScrollUpButton = ({
  className,
  ...props
}: SelectPrimitive.ScrollUpArrow.Props) => (
  <SelectPrimitive.ScrollUpArrow
    data-slot="select-scroll-up-button"
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      "top-0 w-full",
      className,
    )}
    {...props}
  >
    <ChevronUpIcon className="size-4" />
  </SelectPrimitive.ScrollUpArrow>
);

const SelectScrollDownButton = ({
  className,
  ...props
}: SelectPrimitive.ScrollDownArrow.Props) => (
  <SelectPrimitive.ScrollDownArrow
    data-slot="select-scroll-down-button"
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      "bottom-0 w-full",
      className,
    )}
    {...props}
  >
    <ChevronDownIcon className="size-4" />
  </SelectPrimitive.ScrollDownArrow>
);

const SelectContent = ({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Positioner
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      alignItemWithTrigger={alignItemWithTrigger}
      className="isolate z-50"
    >
      <SelectPrimitive.Popup
        data-slot="select-content"
        className={cn(
          "bg-popover/95 text-popover-foreground relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm",
          "data-open:fade-in-0 data-open:zoom-in-95 data-open:animate-in",
          "data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:animate-out",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          !alignItemWithTrigger &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1 rtl:data-[side=left]:translate-x-1 rtl:data-[side=right]:-translate-x-1",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.List
          className={cn(
            !alignItemWithTrigger &&
              "h-[var(--anchor-height)] w-full min-w-[var(--anchor-width)] scroll-my-1",
          )}
        >
          {children}
        </SelectPrimitive.List>
        <SelectScrollDownButton />
      </SelectPrimitive.Popup>
    </SelectPrimitive.Positioner>
  </SelectPrimitive.Portal>
);

const SelectLabel = ({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) => (
  <SelectPrimitive.GroupLabel
    data-slot="select-label"
    className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
    {...props}
  />
);

const SelectItem = ({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) => (
  <SelectPrimitive.Item
    data-slot="select-item"
    className={cn(
      "relative flex w-full cursor-default items-center gap-2 rounded-lg py-2 ps-3 pe-9 text-sm outline-none select-none",
      "focus:bg-accent focus:text-accent-foreground",
      "data-disabled:pointer-events-none data-disabled:opacity-50",
      "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemIndicator
      render={
        <span className="absolute end-3 flex size-4 items-center justify-center" />
      }
    >
      <CheckIcon className="size-4" />
    </SelectPrimitive.ItemIndicator>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);

const SelectSeparator = ({
  className,
  ...props
}: SelectPrimitive.Separator.Props) => (
  <SelectPrimitive.Separator
    data-slot="select-separator"
    className={cn("bg-border -mx-1 my-1 h-px", className)}
    {...props}
  />
);

export interface SelectOption {
  value: string;
  label: ReactNode;
  textValue?: string;
  disabled?: boolean;
}

export interface SelectProps extends Pick<
  SelectPrimitive.Root.Props<string>,
  "disabled"
> {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  className?: string;
}

function Select({
  options,
  placeholder,
  className,
  value,
  onValueChange,
  ...props
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <SelectRoot
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue);
      }}
      {...props}
    >
      <SelectPrimitive.Trigger
        className={cn(
          "flex items-center gap-1.5 rounded-md py-1 ps-3 pe-2 text-sm transition-colors outline-none",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "focus-visible:ring-ring/50 focus-visible:ring-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selectedOption && placeholder && "italic opacity-70",
          className,
        )}
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <ChevronDownIcon className="size-3.5 opacity-50" />
      </SelectPrimitive.Trigger>

      <SelectContent>
        {options.map(({ label, disabled, textValue, ...itemProps }) => (
          <SelectItem
            key={itemProps.value}
            {...itemProps}
            {...(disabled !== undefined ? { disabled } : {})}
            label={
              textValue ?? (typeof label === "string" ? label : itemProps.value)
            }
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}

export {
  Select,
  SelectRoot,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  selectTriggerVariants,
};
