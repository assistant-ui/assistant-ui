import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { withRenderProp } from "../utils/Primitive";

export const DropdownMenuRenderTrigger = withRenderProp(
  DropdownMenuPrimitive.Trigger,
);
export const DropdownMenuRenderContent = withRenderProp(
  DropdownMenuPrimitive.Content,
);
export const DropdownMenuRenderItem = withRenderProp(
  DropdownMenuPrimitive.Item,
);
export const DropdownMenuRenderSeparator = withRenderProp(
  DropdownMenuPrimitive.Separator,
);
