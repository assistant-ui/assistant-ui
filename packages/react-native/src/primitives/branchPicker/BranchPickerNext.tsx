import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useCallback } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";

export type BranchPickerNextProps = Omit<PressableProps, "onPress"> & {
  children: ReactNode;
};

export const BranchPickerNext = ({
  children,
  disabled: disabledProp,
  ...pressableProps
}: BranchPickerNextProps) => {
  const aui = useAui();
  const disabled = useAuiState((s) => {
    if (s.message.branchNumber >= s.message.branchCount) return true;
    if (s.thread.isRunning && !s.thread.capabilities.switchBranchDuringRun) {
      return true;
    }
    return false;
  });

  const goToNext = useCallback(() => {
    aui.message().switchToBranch({ position: "next" });
  }, [aui]);

  return (
    <Pressable
      onPress={goToNext}
      disabled={disabledProp ?? disabled}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};
