"use client";

import { Collapsible } from "@base-ui/react/collapsible";

export const CollapsibleRoot = Collapsible.Root;

export function CollapsibleTrigger({ ...props }: Collapsible.Trigger.Props) {
  return <Collapsible.Trigger data-slot="collapsible-trigger" {...props} />;
}

export function CollapsibleContent({ ...props }: Collapsible.Panel.Props) {
  return <Collapsible.Panel data-slot="collapsible-content" {...props} />;
}
