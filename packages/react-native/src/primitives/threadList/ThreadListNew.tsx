import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  type PressableStateCallbackType,
} from "react-native";
import { useAuiState } from "@assistant-ui/store";
import { useThreadListNew } from "@assistant-ui/core/react";

export type ThreadListNewProps = Omit<
  PressableProps,
  "onPress" | "children"
> & {
  children:
    | ReactNode
    | ((
        state: PressableStateCallbackType & { isActive: boolean },
      ) => ReactNode);
};

export const ThreadListNew = ({
  children,
  accessibilityState,
  ...pressableProps
}: ThreadListNewProps) => {
  const isActive = useAuiState(
    (s) => s.threads.newThreadId === s.threads.mainThreadId,
  );
  const { switchToNewThread } = useThreadListNew();

  return (
    <Pressable
      onPress={switchToNewThread}
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
