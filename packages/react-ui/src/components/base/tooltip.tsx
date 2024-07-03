"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { styled } from "../../styled";
import { FC } from "react";

export const Tooltip: FC<TooltipPrimitive.TooltipProps> = (props) => {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  );
};

Tooltip.displayName = "Tooltip";

export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = styled(TooltipPrimitive.Content, {
  sideOffset: 4,
  className: "aui-tooltip-content",
});

TooltipContent.displayName = "TooltipContent";
