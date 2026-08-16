import {
  branchPickerNextDisabled,
  branchPickerPreviousDisabled,
} from "@assistant-ui/core/store/internal";
import { getAuiContext, type ScopeTarget } from "../context";
import { useAuiState } from "../useAuiState";

const resolveTarget = (item: ScopeTarget | undefined): ScopeTarget =>
  item ?? getAuiContext();

const branchButton = (
  predicate: typeof branchPickerPreviousDisabled,
  position: "previous" | "next",
) => {
  return (options?: { item?: ScopeTarget | undefined }) => {
    const item = resolveTarget(options?.item);
    const { aui } = item;
    const disabled = useAuiState(predicate, { item });

    return {
      props: {
        type: "button" as const,
        get disabled() {
          return disabled.current;
        },
        onclick: (event?: MouseEvent) => {
          if (event?.defaultPrevented || disabled.current) return;
          aui.message.switchToBranch({ position });
        },
      },
    };
  };
};

/**
 * Builder for the previous-branch button. Spread `props` onto a `<button>`.
 * Read the position with `useAuiState((s) => s.message.branchNumber, { item })`
 * and `s.message.branchCount`.
 */
export const branchPickerPrevious = branchButton(
  branchPickerPreviousDisabled,
  "previous",
);

/**
 * Builder for the next-branch button. Spread `props` onto a `<button>`. Read
 * the position with `useAuiState((s) => s.message.branchNumber, { item })`
 * and `s.message.branchCount`.
 */
export const branchPickerNext = branchButton(branchPickerNextDisabled, "next");
