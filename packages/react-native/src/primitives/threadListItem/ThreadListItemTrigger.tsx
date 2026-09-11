import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";
import { useAuiState } from "@assistant-ui/store";
import { useThreadListItemTrigger } from "@assistant-ui/core/react";

export type ThreadListItemTriggerProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { isActive: boolean },
      ) => ReactNode);
};

export const ThreadListItemTrigger = ({
  children,
  accessibilityState,
  ...pressableProps
}: ThreadListItemTriggerProps) => {
  const isActive = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
  );
  const { switchTo } = useThreadListItemTrigger();

  return (
    <Pressable
      onPress={switchTo}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive, ...accessibilityState }}
      {...pressableProps}
    >
      {typeof children === "function"
        ? (state) => children({ ...state, isActive })
        : children}
    </Pressable>
  );
};
