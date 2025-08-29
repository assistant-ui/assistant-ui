"use client";

import { PropsWithChildren } from "react";

import { useComposer } from "@assistant-ui/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type PromptInputActionProps = PropsWithChildren<
  React.ComponentPropsWithoutRef<typeof Tooltip>
> & {
  tooltip: string;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
};

export function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: PromptInputActionProps) {
  const disabled = useComposer((c) => !c.isEditing);

  if (!children) return null;

  return (
    <Tooltip {...props}>
      <TooltipTrigger asChild disabled={disabled}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
