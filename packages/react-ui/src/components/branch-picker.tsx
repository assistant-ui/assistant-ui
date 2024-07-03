"use client";
import { BranchPickerPrimitive } from "@assistant-ui/react";
import { ComponentPropsWithoutRef, forwardRef, type FC } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  TooltipIconButton,
  TooltipIconButtonProps,
} from "./base/tooltip-icon-button";
import { styled } from "../styled";
import { useThreadConfig } from "./thread-config";

export const BranchPicker: FC = () => {
  return (
    <BranchPickerRoot hideWhenSingleBranch>
      <BranchPickerPrevious />
      <BranchPickerState />
      <BranchPickerNext />
    </BranchPickerRoot>
  );
};

BranchPicker.displayName = "BranchPicker";

export const BranchPickerRoot = styled(BranchPickerPrimitive.Root, {
  className: "aui-branch-picker-root",
});

BranchPickerRoot.displayName = "BranchPickerRoot";

export const BranchPickerPrevious = forwardRef<
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
        <ChevronLeftIcon />
      </TooltipIconButton>
    </BranchPickerPrimitive.Previous>
  );
});

BranchPickerPrevious.displayName = "BranchPickerPrevious";

const BranchPickerStateWrapper = styled("span", {
  className: "aui-branch-picker-state",
});

export const BranchPickerState = forwardRef<
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

export const BranchPickerNext = forwardRef<
  HTMLButtonElement,
  Partial<TooltipIconButtonProps>
>((props, ref) => {
  const {
    strings: { branchPicker: { next: { tooltip = "Next" } = {} } = {} } = {},
  } = useThreadConfig();
  return (
    <BranchPickerPrimitive.Next asChild>
      <TooltipIconButton tooltip={tooltip} {...props} ref={ref}>
        <ChevronRightIcon />
      </TooltipIconButton>
    </BranchPickerPrimitive.Next>
  );
});

BranchPickerNext.displayName = "BranchPickerNext";
