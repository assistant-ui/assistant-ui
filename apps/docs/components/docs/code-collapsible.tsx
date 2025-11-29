"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-1.5 right-12 z-10 h-7 gap-1 px-2 text-muted-foreground text-xs"
        >
          <ChevronDownIcon
            className={cn(
              "size-3 transition-transform",
              isOpen && "rotate-180",
            )}
          />
          {isOpen ? "Collapse" : "Expand"}
        </Button>
      </CollapsibleTrigger>
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
