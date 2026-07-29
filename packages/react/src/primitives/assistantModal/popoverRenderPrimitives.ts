import { Popover as PopoverPrimitive } from "radix-ui";
import { withRenderProp } from "../../utils/Primitive";

export const PopoverRenderTrigger = withRenderProp(PopoverPrimitive.Trigger);
export const PopoverRenderAnchor = withRenderProp(PopoverPrimitive.Anchor);
export const PopoverRenderContent = withRenderProp(PopoverPrimitive.Content);
