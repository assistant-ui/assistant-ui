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
  "group/select focus-visible:ring-foreground/20 data-placeholder:text-muted-foreground flex w-fit items-center justify-between gap-1.5 rounded-md text-[13px] tracking-tight whitespace-nowrap transition-colors outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&>span]:min-w-0 [&>span]:truncate",
  {
    variants: {
      variant: {
        outline:
          "bg-muted hover:bg-muted/80 hover:text-foreground data-popup-open:bg-muted/80",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground",
        muted:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 data-popup-open:bg-secondary/80",
      },
      size: {
        default: "h-7 px-2 pe-1.5",
        sm: "h-6 px-1.5 pe-1 text-xs",
        lg: "h-8 px-2.5 pe-2",
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
      render={
        <ChevronDownIcon className="text-muted-foreground/70 size-3 transition-transform duration-150 ease-out group-data-popup-open/select:rotate-180" />
      }
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
      "text-muted-foreground flex cursor-default items-center justify-center py-1",
      "top-0 w-full",
      className,
    )}
    {...props}
  >
    <ChevronUpIcon className="size-3.5" />
  </SelectPrimitive.ScrollUpArrow>
);

const SelectScrollDownButton = ({
  className,
  ...props
}: SelectPrimitive.ScrollDownArrow.Props) => (
  <SelectPrimitive.ScrollDownArrow
    data-slot="select-scroll-down-button"
    className={cn(
      "text-muted-foreground flex cursor-default items-center justify-center py-1",
      "bottom-0 w-full",
      className,
    )}
    {...props}
  >
    <ChevronDownIcon className="size-3.5" />
  </SelectPrimitive.ScrollDownArrow>
);

const SelectContent = ({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
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
          "bg-popover text-popover-foreground ring-foreground/10 relative z-50 max-h-[min(24rem,var(--available-height))] min-w-[max(8rem,var(--anchor-width))] overflow-x-hidden overflow-y-auto rounded-xl p-1.5 ring-1 outline-none",
          "data-open:fade-in-0 data-open:animate-in data-closed:fade-out-0 data-closed:animate-out duration-100 motion-reduce:animate-none",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.List className="flex scroll-my-1 flex-col gap-0.5">
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
    className={cn(
      "text-muted-foreground px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide",
      className,
    )}
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
      "relative flex h-8 w-full cursor-default items-center gap-2 rounded-md py-0 ps-2.5 pe-8 text-[13px] tracking-tight outline-none select-none",
      "data-highlighted:bg-foreground/5 data-selected:font-medium",
      "data-disabled:pointer-events-none data-disabled:opacity-50",
      "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemIndicator
      render={
        <span className="absolute end-2.5 flex size-3.5 items-center justify-center" />
      }
    >
      <CheckIcon className="size-3.5" />
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
    className={cn("bg-foreground/8 mx-1.5 my-1 h-px", className)}
    {...props}
  />
);

export interface SelectOption {
  value: string;
  label: ReactNode;
  textValue?: string;
  disabled?: boolean;
}

export interface SelectProps
  extends
    Pick<SelectPrimitive.Root.Props<string>, "disabled">,
    VariantProps<typeof selectTriggerVariants> {
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
  variant,
  size,
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
      <SelectTrigger variant={variant} size={size} className={className}>
        <span
          className={cn(
            !selectedOption && placeholder && "text-muted-foreground",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
      </SelectTrigger>

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
