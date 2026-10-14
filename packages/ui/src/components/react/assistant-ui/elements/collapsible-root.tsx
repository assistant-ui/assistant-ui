"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { forwardRef } from "react";

export const CollapsibleRoot = forwardRef<
  React.ComponentRef<typeof Collapsible.Root>,
  React.ComponentPropsWithoutRef<typeof Collapsible.Root>
>(function CollapsibleRoot(props, ref) {
  return <Collapsible.Root ref={ref} data-slot="collapsible" {...props} />;
});

export function CollapsibleTrigger({ ...props }: Collapsible.Trigger.Props) {
  return <Collapsible.Trigger data-slot="collapsible-trigger" {...props} />;
}

export function CollapsibleContent({ ...props }: Collapsible.Panel.Props) {
  return <Collapsible.Panel data-slot="collapsible-content" {...props} />;
}
