"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";

export function CodeCollapsible({
  code: _code,
  children,
  className,
}: {
  code: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("group/collapsible relative my-4", className)}
    >
      <CollapsibleContent
        forceMount
        className={cn(
          "relative overflow-hidden [&_figure]:my-0",
          !isOpen && "max-h-[200px]",
        )}
      >
        {children}
      </CollapsibleContent>
      {!isOpen && (
        <CollapsibleTrigger className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center rounded-b-lg bg-linear-to-t from-fd-background via-fd-background/90 to-transparent pb-2 text-muted-foreground text-sm">
          <span className="flex items-center gap-1">
            <ChevronDownIcon className="size-4" />
            Show more
          </span>
        </CollapsibleTrigger>
      )}
    </Collapsible>
  );
}
