"use client";

import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { withDefaults } from "./utils/withDefaults";
import { useThreadConfig } from "./thread-config";
import { BranchPickerPrimitive } from "../primitives";
import { useThreadContext } from "../context";

const useAllowBranchPicker = () => {
  const { branchPicker: { allowBranchPicker = true } = {} } = useThreadConfig();
  const { useThreadActions } = useThreadContext();
  const branchPickerSupported = useThreadActions((t) => t.capabilities.edit);
  return branchPickerSupported && allowBranchPicker;
};

const BranchPicker: FC = () => {
  const allowBranchPicker = useAllowBranchPicker();
  if (!allowBranchPicker) return null;
  return (
    <BranchPickerRoot hideWhenSingleBranch>
      <BranchPickerPrevious />
      <BranchPickerState />
      <BranchPickerNext />
    </BranchPickerRoot>
  );
};

BranchPicker.displayName = "BranchPicker";

const BranchPickerRoot = withDefaults(BranchPickerPrimitive.Root, {
  className: "aui-branch-picker-root",
});

BranchPickerRoot.displayName = "BranchPickerRoot";

const BranchPickerPrevious = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: {
      branchPicker: { previous: { tooltip = "Previous" } = {} } = {},
    } = {},
  } = useThreadConfig();
  return (
    <BranchPickerPrimitive.Previous asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        {props.children ?? <ChevronLeftIcon />}
      </TooltipIconButton>
    </BranchPickerPrimitive.Previous>
  );
});

BranchPickerPrevious.displayName = "BranchPickerPrevious";

const BranchPickerStateWrapper = withDefaults("span", {
  className: "aui-branch-picker-state",
});

const BranchPickerState = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<"span">
>((props, ref) => {
  return (
    <BranchPickerStateWrapper {...props} ref={ref}>
      <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
    </BranchPickerStateWrapper>
  );
});

BranchPickerState.displayName = "BranchPickerState";

const BranchPickerNext = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: { branchPicker: { next: { tooltip = "Next" } = {} } = {} } = {},
  } = useThreadConfig();
  return (
    <BranchPickerPrimitive.Next asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        {props.children ?? <ChevronRightIcon />}
      </TooltipIconButton>
    </BranchPickerPrimitive.Next>
  );
});

BranchPickerNext.displayName = "BranchPickerNext";

const exports = {
  Root: BranchPickerRoot,
  Previous: BranchPickerPrevious,
  Next: BranchPickerNext,
};

export default Object.assign(BranchPicker, exports) as typeof BranchPicker &
  typeof exports;
