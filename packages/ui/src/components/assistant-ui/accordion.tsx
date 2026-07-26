"use client";

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
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
}: AccordionPrimitive.Root.Props & VariantProps<typeof accordionVariants>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      data-variant={variant ?? "default"}
      className={cn(accordionVariants({ variant }), className)}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        "aui-accordion-item group/accordion-item",
        "group-data-[variant=default]/accordion:border-b group-data-[variant=default]/accordion:last:border-b-0",
        "group-data-[variant=outline]/accordion:border-b group-data-[variant=outline]/accordion:last:border-b-0",
        "group-data-[variant=ghost]/accordion:data-open:bg-muted/50 group-data-[variant=ghost]/accordion:rounded-lg",
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
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "aui-accordion-trigger group/accordion-trigger flex w-full flex-1 items-center justify-between gap-4 text-start text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50",
          "group-data-[variant=default]/accordion:focus-visible:ring-ring/50 group-data-[variant=default]/accordion:py-4 group-data-[variant=default]/accordion:hover:underline group-data-[variant=default]/accordion:focus-visible:ring-2",
          "group-data-[variant=outline]/accordion:focus-visible:ring-ring/50 group-data-[variant=outline]/accordion:hover:bg-muted/50 group-data-[variant=outline]/accordion:px-4 group-data-[variant=outline]/accordion:py-3 group-data-[variant=outline]/accordion:focus-visible:ring-2 group-data-[variant=outline]/accordion:focus-visible:ring-inset",
          "group-data-[variant=ghost]/accordion:focus-visible:ring-ring/50 group-data-[variant=ghost]/accordion:hover:bg-muted/50 group-data-[variant=ghost]/accordion:rounded-lg group-data-[variant=ghost]/accordion:px-4 group-data-[variant=ghost]/accordion:py-2 group-data-[variant=ghost]/accordion:focus-visible:ring-2",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4 shrink-0 transition-transform duration-200 ease-out group-data-panel-open/accordion-trigger:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="aui-accordion-content data-closed:animate-accordion-up data-open:animate-accordion-down overflow-hidden text-sm"
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
    </AccordionPrimitive.Panel>
  );
}

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  accordionVariants,
};
