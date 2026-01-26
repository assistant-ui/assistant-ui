"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SelectRoot = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
  "flex w-fit items-center justify-between gap-2 whitespace-nowrap rounded-md text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&>span]:line-clamp-1 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-accent hover:text-accent-foreground",
        outline:
          "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        muted: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-8 px-2.5 py-1.5 text-xs",
        lg: "h-10 px-4 py-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
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
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof selectTriggerVariants>) => (
  <SelectPrimitive.Trigger
    data-slot="select-trigger"
    data-variant={variant ?? "default"}
    data-size={size ?? "default"}
    className={cn(selectTriggerVariants({ variant, size }), className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDownIcon className="size-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);

const SelectScrollUpButton = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>) => (
  <SelectPrimitive.ScrollUpButton
    data-slot="select-scroll-up-button"
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronUpIcon className="size-4" />
  </SelectPrimitive.ScrollUpButton>
);

const SelectScrollDownButton = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>) => (
  <SelectPrimitive.ScrollDownButton
    data-slot="select-scroll-down-button"
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronDownIcon className="size-4" />
  </SelectPrimitive.ScrollDownButton>
);

const SelectContent = ({
  className,
  children,
  position = "popper",
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      data-slot="select-content"
      position={position}
      sideOffset={6}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl border bg-popover/95 p-1.5 text-popover-foreground shadow-lg backdrop-blur-sm",
        "data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in",
        "data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
        className,
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1",
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
);

const SelectLabel = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) => (
  <SelectPrimitive.Label
    data-slot="select-label"
    className={cn("px-2 py-1.5 text-muted-foreground text-xs", className)}
    {...props}
  />
);

const SelectItem = ({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    data-slot="select-item"
    className={cn(
      "relative flex w-full cursor-default select-none items-center gap-2 rounded-lg py-2 pr-9 pl-3 text-sm outline-none",
      "focus:bg-accent focus:text-accent-foreground",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
      className,
    )}
    {...props}
  >
    <span className="absolute right-3 flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
);

const SelectSeparator = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) => (
  <SelectPrimitive.Separator
    data-slot="select-separator"
    className={cn("-mx-1 my-1 h-px bg-border", className)}
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
  extends Pick<
    ComponentPropsWithoutRef<typeof SelectPrimitive.Root>,
    "value" | "onValueChange" | "disabled"
  > {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  className?: string;
}

function Select({ options, placeholder, className, ...props }: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === props.value);

  return (
    <SelectRoot {...props}>
      <SelectPrimitive.Trigger
        className={cn(
          "flex items-center gap-1.5 rounded-md py-1 pr-2 pl-3 text-sm outline-none transition-colors",
          "text-muted-foreground hover:bg-muted hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring/50",
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
            textValue={
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
