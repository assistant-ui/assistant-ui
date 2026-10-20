import type { ReactNode } from "react";
import { Platform, type PressableStateCallbackType } from "react-native";
import { useAuiState } from "@assistant-ui/store";
import { useThreadListNew } from "@assistant-ui/core/react";
import { Primitive, type PrimitivePressableProps } from "../../utils/Primitive";

export type ThreadListNewProps = Omit<
  PrimitivePressableProps,
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
  const selected = accessibilityState?.selected ?? isActive;

  return (
    <Primitive.Pressable
      onPress={switchToNewThread}
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
