import type { ReactNode } from "react";
import { Platform, type PressableStateCallbackType } from "react-native";
import { useAuiState } from "@assistant-ui/store";
import { useThreadListItemTrigger } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ThreadListItemTriggerProps = Omit<
  PrimitivePressableProps,
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
  const selected = accessibilityState?.selected ?? isActive;

  return (
    <Primitive.Pressable
      onPress={switchTo}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, selected }}
      aria-current={Platform.OS === "web" && selected ? "true" : undefined}
      {...pressableProps}
    >
      {typeof children === "function"
        ? (state) => children({ ...state, isActive })
        : children}
    </Primitive.Pressable>
  );
};
