import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export type BranchPickerPreviousProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const BranchPickerPrevious = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: BranchPickerPreviousProps) => {
  const aui = useAui();
  const disabled = useAuiState((s) => {
    if (s.message.branchNumber <= 1) return true;
    if (s.thread.isRunning && !s.thread.capabilities.switchBranchDuringRun) {
      return true;
    }
    return false;
  });

  const goToPrevious = useCallback(() => {
    aui.message().switchToBranch({ position: "previous" });
  }, [aui]);

  return (
    <Pressable
      onPress={goToPrevious}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
