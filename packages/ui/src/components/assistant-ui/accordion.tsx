"use client";

import type { ComponentProps } from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const accordionVariants = cva(
  "aui-accordion group/accordion flex w-full flex-col",
  {
    variants: {
      variant: {
        default: "",
        outline: "rounded-lg border",
        ghost: "gap-2",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Accordion({
  className,
  variant,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Root> &
  VariantProps<typeof accordionVariants>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      data-variant={variant ?? "default"}
      className={cn(accordionVariants({ variant }), className)}
      {...props}
    />
  );
}

function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "aui-accordion-item group/accordion-item",
        "group-data-[variant=default]/accordion:border-b group-data-[variant=default]/accordion:last:border-b-0",
        "group-data-[variant=outline]/accordion:border-b group-data-[variant=outline]/accordion:last:border-b-0",
        "group-data-[variant=ghost]/accordion:rounded-lg group-data-[variant=ghost]/accordion:data-[state=open]:bg-muted/50",
        className,
      )}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "aui-accordion-trigger group/accordion-trigger flex w-full flex-1 items-center justify-between gap-4 text-left font-medium text-sm outline-none transition-all disabled:pointer-events-none disabled:opacity-50",
          "group-data-[variant=default]/accordion:py-4 group-data-[variant=default]/accordion:focus-visible:ring-2 group-data-[variant=default]/accordion:focus-visible:ring-ring/50 group-data-[variant=default]/accordion:hover:underline",
          "group-data-[variant=outline]/accordion:px-4 group-data-[variant=outline]/accordion:py-3 group-data-[variant=outline]/accordion:focus-visible:ring-2 group-data-[variant=outline]/accordion:focus-visible:ring-ring/50 group-data-[variant=outline]/accordion:focus-visible:ring-inset group-data-[variant=outline]/accordion:hover:bg-muted/50",
          "group-data-[variant=ghost]/accordion:rounded-lg group-data-[variant=ghost]/accordion:px-4 group-data-[variant=ghost]/accordion:py-2 group-data-[variant=ghost]/accordion:focus-visible:ring-2 group-data-[variant=ghost]/accordion:focus-visible:ring-ring/50 group-data-[variant=ghost]/accordion:hover:bg-muted/50",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]/accordion-trigger:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="aui-accordion-content overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div
        className={cn(
          "group-data-[variant=default]/accordion:pb-4",
          "group-data-[variant=outline]/accordion:border-t group-data-[variant=outline]/accordion:px-4 group-data-[variant=outline]/accordion:py-3",
          "group-data-[variant=ghost]/accordion:px-4 group-data-[variant=ghost]/accordion:py-3",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  accordionVariants,
};
