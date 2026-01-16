"use client";

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { SampleFrame } from "@/components/docs/samples/sample-frame";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const ReasoningSample = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <SampleFrame className="h-auto bg-background p-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <CollapsibleTrigger className="group flex items-center gap-2 py-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
          <BrainIcon className="size-4 shrink-0" />
          <span className="relative inline-block leading-none">Reasoning</span>
          <ChevronDownIcon
            className={`mt-0.5 size-4 shrink-0 transition-transform duration-200 ease-out ${
              isOpen ? "rotate-0" : "-rotate-90"
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden text-muted-foreground text-sm">
          <div className="space-y-4 pt-2 pl-6 leading-relaxed">
            <p>Let me think about this step by step...</p>
            <p>
              First, I need to consider the main factors involved in this
              problem. The user is asking about implementing a feature, so I
              should think about the architecture implications.
            </p>
            <p>
              After analyzing the codebase structure, I can see that the best
              approach would be to create a new component that integrates with
              the existing system.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SampleFrame>
  );
};
