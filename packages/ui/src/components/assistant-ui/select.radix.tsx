"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const SelectRoot = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const selectTriggerVariants = cva(
  "group/select focus-visible:ring-foreground/20 data-[placeholder]:text-muted-foreground flex w-fit items-center justify-between gap-1.5 rounded-md text-[13px] tracking-tight whitespace-nowrap transition-colors outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&>span]:min-w-0 [&>span]:truncate",
  {
    variants: {
      variant: {
        outline:
          "bg-muted hover:bg-muted/80 hover:text-foreground data-[state=open]:bg-muted/80",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground",
        muted:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 data-[state=open]:bg-secondary/80",
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
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof selectTriggerVariants>) => (
  <SelectPrimitive.Trigger
    data-slot="select-trigger"
    data-variant={variant ?? "outline"}
    data-size={size ?? "default"}
    className={cn(selectTriggerVariants({ variant, size }), className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDownIcon className="text-muted-foreground/70 size-3 transition-transform duration-150 ease-out group-data-[state=open]/select:rotate-180" />
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
      "text-muted-foreground flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronUpIcon className="size-3.5" />
  </SelectPrimitive.ScrollUpButton>
);

const SelectScrollDownButton = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>) => (
  <SelectPrimitive.ScrollDownButton
    data-slot="select-scroll-down-button"
    className={cn(
      "text-muted-foreground flex cursor-default items-center justify-center py-1",
      className,
    )}
    {...props}
  >
    <ChevronDownIcon className="size-3.5" />
  </SelectPrimitive.ScrollDownButton>
);

const SelectContent = ({
  className,
  children,
  position = "popper",
  align = "start",
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      data-slot="select-content"
      position={position}
      sideOffset={6}
      align={align}
      className={cn(
        "bg-popover text-popover-foreground ring-foreground/10 relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-xl p-1.5 ring-1 outline-none",
        "data-[state=open]:fade-in-0 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:animate-out duration-100 motion-reduce:animate-none",
        className,
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "flex flex-col gap-0.5",
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
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    data-slot="select-item"
    className={cn(
      "relative flex h-8 w-full cursor-default items-center gap-2 rounded-md py-0 ps-2.5 pe-8 text-[13px] tracking-tight outline-none select-none",
      "data-[highlighted]:bg-foreground/5 data-[state=checked]:font-medium",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
      className,
    )}
    {...props}
  >
    <span className="absolute end-2.5 flex size-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <CheckIcon className="size-3.5" />
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
    Pick<
      ComponentPropsWithoutRef<typeof SelectPrimitive.Root>,
      "value" | "onValueChange" | "disabled"
    >,
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
  variant,
  size,
  ...props
}: SelectProps) {
  const selectedOption = options.find((opt) => opt.value === props.value);

  return (
    <SelectRoot {...props}>
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
