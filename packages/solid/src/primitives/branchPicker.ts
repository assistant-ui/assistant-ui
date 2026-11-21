import { createComponent, mergeProps, splitProps, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { AssistantState } from "@assistant-ui/store/client";
import {
  branchPickerNextDisabled,
  branchPickerPreviousDisabled,
} from "@assistant-ui/core/store/internal";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { callEventHandler } from "./callEventHandler";

const branchButton =
  (
    isDisabled: (state: AssistantState) => boolean,
    position: "previous" | "next",
  ) =>
  (props: JSX.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element => {
    const [local, rest] = splitProps(props, ["onClick"]);
    const aui = useAui();
    const disabled = useAuiState(isDisabled);
    return createComponent(
      Dynamic,
      mergeProps(rest, {
        component: "button",
        type: "button" as const,
        get disabled() {
          return disabled() || rest.disabled;
        },
        onClick: (
          event: MouseEvent & {
            currentTarget: HTMLButtonElement;
            target: Element;
          },
        ) => {
          callEventHandler(local.onClick, event);
          if (event.defaultPrevented || disabled() || rest.disabled) return;
          aui.message.switchToBranch({ position });
        },
      }),
    );
  };

/** A button that switches the current message to its previous branch. */
export const BranchPickerPrimitivePrevious = branchButton(
  branchPickerPreviousDisabled,
  "previous",
);

/** A button that switches the current message to its next branch. */
export const BranchPickerPrimitiveNext = branchButton(
  branchPickerNextDisabled,
  "next",
);

/** Renders the current message's 1-based branch number as text. */
export const BranchPickerPrimitiveNumber = (): JSX.Element => {
  const branchNumber = useAuiState((s) => s.message.branchNumber);
  return (() => String(branchNumber())) as unknown as JSX.Element;
};

/** Renders the current message's branch count as text. */
export const BranchPickerPrimitiveCount = (): JSX.Element => {
  const branchCount = useAuiState((s) => s.message.branchCount);
  return (() => String(branchCount())) as unknown as JSX.Element;
};
