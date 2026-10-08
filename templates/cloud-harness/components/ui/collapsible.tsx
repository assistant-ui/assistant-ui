"use client";

import { forwardRef } from "react";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

const Collapsible = forwardRef<HTMLDivElement, CollapsiblePrimitive.Root.Props>(
  function Collapsible(props, ref) {
    return (
      <CollapsiblePrimitive.Root ref={ref} data-slot="collapsible" {...props} />
    );
  },
);

function CollapsibleTrigger({ ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
  );
}

function CollapsibleContent({ ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
