"use client";

import { type ComponentProps } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const ANIMATION_DURATION = 200;

const accordionVariants = cva("aui-accordion group/accordion w-full", {
  variants: {
    variant: {
      default: "flex flex-col",
      outline: "flex flex-col rounded-lg border",
      ghost: "flex flex-col gap-2",
    },
  },
  defaultVariants: { variant: "default" },
});

export type AccordionRootProps = ComponentProps<
  typeof AccordionPrimitive.Root
> &
  VariantProps<typeof accordionVariants>;

function AccordionRoot({ className, variant, ...props }: AccordionRootProps) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      data-variant={variant ?? "default"}
      className={cn(accordionVariants({ variant }), className)}
      style={
        {
          "--animation-duration": `${ANIMATION_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

const accordionItemVariants = cva("aui-accordion-item group/accordion-item", {
  variants: {
    variant: {
      default: "border-b last:border-b-0",
      outline: "border-b last:border-b-0",
      ghost: "rounded-lg data-[state=open]:bg-muted/50",
    },
  },
  defaultVariants: { variant: "default" },
});

export type AccordionItemProps = ComponentProps<
  typeof AccordionPrimitive.Item
> &
  VariantProps<typeof accordionItemVariants>;

function AccordionItem({ className, variant, ...props }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(accordionItemVariants({ variant }), className)}
      {...props}
    />
  );
}

const accordionTriggerVariants = cva(
  "aui-accordion-trigger group/accordion-trigger flex w-full flex-1 items-center justify-between gap-4 text-left font-medium text-sm outline-none transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "py-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50",
        outline:
          "px-4 py-3 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
        ghost:
          "rounded-lg px-4 py-2 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type AccordionTriggerProps = ComponentProps<
  typeof AccordionPrimitive.Trigger
> &
  VariantProps<typeof accordionTriggerVariants>;

function AccordionTrigger({
  className,
  variant,
  children,
  ...props
}: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(accordionTriggerVariants({ variant }), className)}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-chevron"
          className={cn(
            "aui-accordion-trigger-chevron pointer-events-none size-4 shrink-0 text-muted-foreground",
            "transition-transform duration-(--animation-duration) ease-out",
            "group-data-[state=open]/accordion-trigger:rotate-180",
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

const accordionContentVariants = cva(
  "aui-accordion-content overflow-hidden text-sm",
  {
    variants: {
      variant: {
        default: "",
        outline: "",
        ghost: "",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const accordionContentInnerVariants = cva("", {
  variants: {
    variant: {
      default: "pb-4",
      outline: "border-t px-4 py-3",
      ghost: "px-4 py-3",
    },
  },
  defaultVariants: { variant: "default" },
});

export type AccordionContentProps = ComponentProps<
  typeof AccordionPrimitive.Content
> &
  VariantProps<typeof accordionContentVariants>;

function AccordionContent({
  className,
  variant,
  children,
  ...props
}: AccordionContentProps) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        accordionContentVariants({ variant }),
        "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
        className,
      )}
      {...props}
    >
      <div className={accordionContentInnerVariants({ variant })}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

type AccordionComponent = typeof AccordionRoot & {
  Root: typeof AccordionRoot;
  Item: typeof AccordionItem;
  Trigger: typeof AccordionTrigger;
  Content: typeof AccordionContent;
};

const Accordion = AccordionRoot as AccordionComponent;

Accordion.displayName = "Accordion";
Accordion.Root = AccordionRoot;
Accordion.Item = AccordionItem;
Accordion.Trigger = AccordionTrigger;
Accordion.Content = AccordionContent;

export {
  Accordion,
  AccordionRoot,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  accordionVariants,
  accordionItemVariants,
  accordionTriggerVariants,
  accordionContentVariants,
  accordionContentInnerVariants,
};
